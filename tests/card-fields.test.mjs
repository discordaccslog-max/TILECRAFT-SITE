/*
 * The card fields.
 *
 * The checking is what is worth pinning down here: the page cannot tell
 * whether a card has money behind it, so the only honest thing it can
 * catch is a typo. Luhn, the per-network lengths, and an expiry that has
 * not passed are the whole of it, and each one has to be right or the
 * page rejects a card someone actually holds.
 *
 * The other half is what the fields must never do. The card is checked
 * and dropped: it is not in the order, not in a license, not in storage,
 * and not sent anywhere. The last tests read the source to hold that.
 */

import '../tests/helpers/environment.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  MARKS,
  brandFor,
  luhnOk,
  formatNumber,
  formatExpiry,
  expiryOk,
  cardProblem
} from '../js/card-fields.js';

const root = path.join(import.meta.dirname, '..');

/*
 * Read a module with its comments taken out. The comments in these files
 * discuss what must not happen to a card — "nothing is written to
 * localStorage" — so a check against the raw text would match its own
 * explanation. What matters is the code.
 */
function codeOf(file) {
  return fs
    .readFileSync(path.join(root, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/*
 * The published test numbers every processor documents. They are not
 * anyone's card: they exist to be typed into exactly this kind of field.
 */
const TEST_CARDS = {
  visa: '4111111111111111',
  visaAlt: '4012888888881881',
  mastercard: '5555555555554444',
  mastercard2Series: '2223003122003222',
  amex: '378282246310005',
  amexAlt: '371449635398431',
  discover: '6011111111111117'
};

/* ------------------------------------------------------------------ *
 * Which network
 * ------------------------------------------------------------------ */

test('each published test number is read as its own network', () => {
  assert.equal(brandFor(TEST_CARDS.visa).id, 'visa');
  assert.equal(brandFor(TEST_CARDS.visaAlt).id, 'visa');
  assert.equal(brandFor(TEST_CARDS.mastercard).id, 'mastercard');
  assert.equal(brandFor(TEST_CARDS.mastercard2Series).id, 'mastercard');
  assert.equal(brandFor(TEST_CARDS.amex).id, 'amex');
  assert.equal(brandFor(TEST_CARDS.amexAlt).id, 'amex');
  assert.equal(brandFor(TEST_CARDS.discover).id, 'discover');
});

test('a network is named from the first digits, before the rest is typed', () => {
  assert.equal(brandFor('4').id, 'visa');
  assert.equal(brandFor('51').id, 'mastercard');
  assert.equal(brandFor('37').id, 'amex');
  assert.equal(brandFor('6011').id, 'discover');
});

test('nothing is claimed about an empty or unknown number', () => {
  assert.equal(brandFor(''), null);
  assert.equal(brandFor('   '), null);
  assert.equal(brandFor('9999999999999999'), null);
});

test('spaces as typed do not change which network it is', () => {
  assert.equal(brandFor('4111 1111 1111 1111').id, 'visa');
});

test('every network has a usable rule for its own numbers', () => {
  for (const mark of MARKS) {
    assert.ok(mark.id && mark.name, 'a mark is missing its name');
    assert.ok(mark.lengths.length > 0, mark.id + ' has no lengths');
    assert.ok(mark.cvc === 3 || mark.cvc === 4, mark.id + ' has an odd security code length');
    assert.equal(
      mark.groups.reduce((n, g) => n + g, 0) >= Math.min(...mark.lengths),
      true,
      mark.id + ' cannot group its own shortest number'
    );
    assert.ok(mark.bars >= 1 && mark.bars <= 4, mark.id + ' has no drawable mark');
  }
});

test('no two networks claim the same number', () => {
  for (const number of Object.values(TEST_CARDS)) {
    const matching = MARKS.filter((mark) => mark.starts.test(number));
    assert.equal(matching.length, 1, number + ' matched ' + matching.length + ' networks');
  }
});

/* ------------------------------------------------------------------ *
 * Luhn
 * ------------------------------------------------------------------ */

test('every published test number passes the check digit', () => {
  for (const [name, number] of Object.entries(TEST_CARDS)) {
    assert.equal(luhnOk(number), true, name + ' failed Luhn');
  }
});

test('one transposed digit is caught', () => {
  // 4111111111111111 with a digit changed is no longer a valid number.
  assert.equal(luhnOk('4111111111111112'), false);
  assert.equal(luhnOk('5555555555554445'), false);
});

test('a number too short to be a card does not pass', () => {
  assert.equal(luhnOk(''), false);
  assert.equal(luhnOk('4'), false);
  assert.equal(luhnOk('411111'), false);
});

/* ------------------------------------------------------------------ *
 * Formatting as it is typed
 * ------------------------------------------------------------------ */

test('a number is grouped the way its own network prints it', () => {
  assert.equal(formatNumber(TEST_CARDS.visa), '4111 1111 1111 1111');
  assert.equal(formatNumber(TEST_CARDS.mastercard), '5555 5555 5555 4444');
  // Amex prints 4-6-5, not in fours.
  assert.equal(formatNumber(TEST_CARDS.amex), '3782 822463 10005');
});

test('formatting is stable, so re-running it does not drift', () => {
  for (const number of Object.values(TEST_CARDS)) {
    const once = formatNumber(number);
    assert.equal(formatNumber(once), once, 'formatting ' + number + ' twice changed it');
  }
});

test('a number cannot be typed past the length its network allows', () => {
  const tooLong = formatNumber('37828224631000512345');
  assert.equal(tooLong.replace(/\D/g, '').length, 15, 'an Amex number grew past 15 digits');
});

test('letters and punctuation are dropped rather than shown', () => {
  assert.equal(formatNumber('4111-1111-abc1111 1111'), '4111 1111 1111 1111');
});

test('an expiry becomes MM/YY while it is typed', () => {
  assert.equal(formatExpiry('0'), '0');
  assert.equal(formatExpiry('04'), '04');
  assert.equal(formatExpiry('042'), '04/2');
  assert.equal(formatExpiry('0429'), '04/29');
  assert.equal(formatExpiry('04/29'), '04/29');
  assert.equal(formatExpiry('042999'), '04/29');
});

/* ------------------------------------------------------------------ *
 * Expiry
 * ------------------------------------------------------------------ */

test('a card is good through the last day of the month it expires', () => {
  const now = new Date(2026, 10, 22); // 22 November 2026
  assert.equal(expiryOk('11/26', now), true, 'a card expiring this month was rejected');
  assert.equal(expiryOk('12/26', now), true);
  assert.equal(expiryOk('01/27', now), true);
  assert.equal(expiryOk('10/26', now), false, 'last month was accepted');
  assert.equal(expiryOk('11/25', now), false);
});

test('an impossible month is not an expiry date', () => {
  const now = new Date(2026, 10, 22);
  assert.equal(expiryOk('00/29', now), false);
  assert.equal(expiryOk('13/29', now), false);
  assert.equal(expiryOk('4/29', now), false, 'a single-digit month should not pass');
  assert.equal(expiryOk('', now), false);
  assert.equal(expiryOk('nonsense', now), false);
});

/* ------------------------------------------------------------------ *
 * What the person is told
 * ------------------------------------------------------------------ */

const GOOD = {
  number: '4111 1111 1111 1111',
  name: 'A. N. Example',
  expiry: '04/29',
  cvc: '123'
};
const NOW = new Date(2026, 10, 22);

test('a complete, valid card is accepted', () => {
  assert.equal(cardProblem(GOOD, NOW), '');
});

test('every published test number is accepted when filled in properly', () => {
  for (const [name, number] of Object.entries(TEST_CARDS)) {
    const cvc = brandFor(number).cvc === 4 ? '1234' : '123';
    const problem = cardProblem({ ...GOOD, number, cvc }, NOW);
    assert.equal(problem, '', name + ' was rejected: ' + problem);
  }
});

test('each thing missing is named, one at a time', () => {
  assert.match(cardProblem({ ...GOOD, number: '' }, NOW), /enter your card number/i);
  assert.match(cardProblem({ ...GOOD, name: '' }, NOW), /name printed on the card/i);
  assert.match(cardProblem({ ...GOOD, expiry: '' }, NOW), /MM\/YY/);
  assert.match(cardProblem({ ...GOOD, cvc: '' }, NOW), /security code/i);
});

test('a wrong digit is reported as a typo, not as a decline', () => {
  const problem = cardProblem({ ...GOOD, number: '4111 1111 1111 1112' }, NOW);
  assert.match(problem, /digit wrong/i);
  assert.ok(!/declin/i.test(problem), 'the page claimed to know the card was declined');
});

test('a half-typed number says how long it should be', () => {
  const problem = cardProblem({ ...GOOD, number: '4111 1111' }, NOW);
  assert.match(problem, /13 or 16 or 19 digits/);
});

test('an unknown network is said to be unrecognised rather than wrong', () => {
  assert.match(cardProblem({ ...GOOD, number: '9999 9999 9999 9999' }, NOW), /do not|not a card number we recognise/i);
});

test('an expired card is told apart from a malformed date', () => {
  assert.match(cardProblem({ ...GOOD, expiry: '10/26' }, NOW), /has passed/i);
  assert.match(cardProblem({ ...GOOD, expiry: '1026' }, NOW), /MM\/YY/);
});

test('Amex asks for four digits of security code, the others for three', () => {
  const amex = { ...GOOD, number: TEST_CARDS.amex };
  assert.match(cardProblem({ ...amex, cvc: '123' }, NOW), /4 digits/);
  assert.equal(cardProblem({ ...amex, cvc: '1234' }, NOW), '');

  assert.match(cardProblem({ ...GOOD, cvc: '1234' }, NOW), /3 digits/);
});

test('a problem is always something a person can act on', () => {
  const cases = [
    { ...GOOD, number: '' },
    { ...GOOD, number: '4111' },
    { ...GOOD, number: '9999999999999999' },
    { ...GOOD, number: '4111111111111112' },
    { ...GOOD, name: '  ' },
    { ...GOOD, expiry: '13/29' },
    { ...GOOD, cvc: '1' }
  ];
  for (const input of cases) {
    const problem = cardProblem(input, NOW);
    assert.ok(problem, 'nothing was reported for ' + JSON.stringify(input));
    assert.ok(problem.length < 90, 'too long to read: ' + problem);
    assert.match(problem, /[.?]$/, 'not a sentence: ' + problem);
  }
});

test('nothing is thrown on junk, however it arrives', () => {
  for (const input of [undefined, {}, { number: null }, { number: 12345, expiry: 7, cvc: {} }]) {
    assert.doesNotThrow(() => cardProblem(input, NOW), 'threw on ' + JSON.stringify(input));
  }
});

/* ------------------------------------------------------------------ *
 * What must never happen to a card
 * ------------------------------------------------------------------ */

test('the card module never writes to storage', () => {
  const code = codeOf('js/card-fields.js');
  assert.ok(!/localStorage|sessionStorage|indexedDB/.test(code), 'the card fields touch storage');
  assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon|navigator\.send/.test(code), 'the card fields send something');
});

test('the checkout never puts a card into an order or a license', () => {
  const source = codeOf('js/checkout.js');

  // The card is reached for exactly twice: to check it, and to clear it.
  assert.ok(/card\.check\(\)/.test(source), 'the card is never checked');
  assert.ok(/card\.clear\(\)/.test(source), 'the card is never cleared');
  assert.ok(!/card\.read\(\)/.test(source), 'the checkout reads the card out of the fields');

  // Nothing card-shaped reaches the license call. The slice is anchored
  // to code, not to a comment, so stripping comments cannot widen it.
  const from = source.indexOf('export async function placeOrder');
  const to = source.indexOf('function summarySection');
  assert.ok(from > -1 && to > from, 'placeOrder or the section after it has been renamed');

  const placing = source.slice(from, to);
  assert.ok(
    !/\bcard\b|\bcvc\b|\bpan\b/i.test(placing),
    'placeOrder mentions the card; it must not see one'
  );
});

test('a saved card is never offered to fields that lead nowhere', () => {
  const code = codeOf('js/card-fields.js');
  assert.ok(/autocomplete\s*=\s*'off'/.test(code), 'autocomplete is not turned off');
  assert.ok(
    !/cc-number|cc-exp|cc-csc|cc-name/.test(code),
    'the fields ask the browser to autofill a real card'
  );
});

test('the marks are our own drawing, not a network’s logo', () => {
  const source = fs.readFileSync(path.join(root, 'js/card-fields.js'), 'utf8');
  // An official asset is opted into per network, and none is bundled in.
  for (const mark of MARKS) {
    assert.equal(mark.svg, undefined, mark.id + ' bundles artwork that is not ours');
  }
  assert.ok(/svg:/.test(source), 'there is no documented way to supply the official mark');
});
