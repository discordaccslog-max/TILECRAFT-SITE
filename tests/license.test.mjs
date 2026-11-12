/*
 * License codes: generation, the checksum, reading codes back, order-linked
 * consistency, device activation, and bundle activation.
 */

import '../tests/helpers/environment.mjs';
import { resetEnvironment } from './helpers/environment.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALPHABET,
  PREFIX,
  RANDOM_LEN,
  CHECKSUM_LEN,
  generateCode,
  checksumFor,
  parseCode,
  isValidCode,
  canonicalize,
  sectionFromOrder,
  activationUrl,
  codeFromHash,
  orderRefFromUrl,
  ORDER_PARAM_KEYS,
  activate,
  listLicenses,
  getLicense,
  removeLicense,
  setLicensee,
  isUnlocked,
  unlockedSlugs,
  licenseFor,
  clearLicenses,
  reasonText
} from '../js/license.js';

import { PRODUCTS, productBySlug, productByCode, grantsFor } from '../js/products.js';

const bundle = productBySlug('essentials-bundle');
const geometric = productBySlug('geometric-essentials');
const production = productBySlug('production-studio');

test.beforeEach(() => {
  resetEnvironment();
  clearLicenses();
});

/* ------------------------------------------------------------------ *
 * The alphabet
 * ------------------------------------------------------------------ */

test('the alphabet leaves out every character that is easy to misread', () => {
  for (const character of ['0', 'O', '1', 'I', 'L']) {
    assert.ok(!ALPHABET.includes(character), 'alphabet must not contain ' + character);
  }
  assert.equal(ALPHABET.length, 31);
  assert.equal(new Set(ALPHABET).size, 31, 'no character may appear twice');
});

test('every product code is spelled with the alphabet and is unique', () => {
  const seen = new Set();
  for (const product of PRODUCTS) {
    assert.equal(product.code.length, 4, product.slug + ' needs a four-character code');
    for (const character of product.code) {
      assert.ok(ALPHABET.includes(character), product.slug + ' uses ' + character);
    }
    assert.ok(!seen.has(product.code), 'duplicate product code ' + product.code);
    seen.add(product.code);
  }
});

/* ------------------------------------------------------------------ *
 * Generation
 * ------------------------------------------------------------------ */

test('a generated code has the prefix, the product code, and a checksum', () => {
  const code = generateCode(geometric);
  const parts = code.split('-');

  assert.equal(parts.length, 4);
  assert.equal(parts[0], PREFIX);
  assert.equal(parts[1], geometric.code);
  assert.equal(parts[2].length, RANDOM_LEN);
  assert.equal(parts[3].length, CHECKSUM_LEN);
  assert.equal(parts[3], checksumFor(parts[1], parts[2]));
});

test('generated codes are valid, and parse back to their product', () => {
  for (const product of PRODUCTS) {
    const code = generateCode(product);
    const parsed = parseCode(code);
    assert.ok(parsed.valid, code + ' should be valid');
    assert.ok(parsed.known, code + ' should resolve to a catalog product');
    assert.equal(parsed.product.slug, product.slug);
    assert.equal(parsed.code, code);
  }
});

test('random codes do not repeat across a large run', () => {
  const codes = new Set();
  for (let i = 0; i < 5000; i++) codes.add(generateCode(geometric));
  assert.equal(codes.size, 5000, 'every generated code should be distinct');
});

test('the random section uses the whole alphabet and nothing else', () => {
  const used = new Set();
  for (let i = 0; i < 4000; i++) {
    for (const character of generateCode(geometric).split('-')[2]) used.add(character);
  }
  assert.equal(used.size, ALPHABET.length, 'every alphabet character should turn up');
  for (const character of used) assert.ok(ALPHABET.includes(character));
});

test('generating a code for an unknown product code is refused', () => {
  assert.throws(() => generateCode('ZZ'), /invalid product code/);
  assert.throws(() => generateCode('OOOO'), /invalid product code/);
  assert.throws(() => generateCode({}), /invalid product code/);
});

/* ------------------------------------------------------------------ *
 * The checksum
 * ------------------------------------------------------------------ */

test('the checksum is two characters from the alphabet', () => {
  const checksum = checksumFor('GMTR', 'K7N4PXBM');
  assert.equal(checksum.length, 2);
  for (const character of checksum) assert.ok(ALPHABET.includes(character));
});

test('the checksum covers the product code as well as the random section', () => {
  const random = 'K7N4PXBM';
  const codes = new Set(PRODUCTS.map((product) => checksumFor(product.code, random)));
  assert.ok(codes.size > 1, 'different products must not all share one checksum');
});

test('the checksum catches every single wrong character, anywhere in the code', () => {
  let checked = 0;
  let caught = 0;

  for (let i = 0; i < 300; i++) {
    const body = generateCode(geometric).replace(/-/g, '').slice(PREFIX.length);

    // Every position, including the two checksum characters themselves.
    for (let position = 0; position < body.length; position++) {
      for (const replacement of ALPHABET) {
        if (replacement === body[position]) continue;
        const broken = PREFIX + body.slice(0, position) + replacement + body.slice(position + 1);
        checked++;
        if (!isValidCode(broken)) caught++;
      }
    }
  }

  assert.ok(checked > 100000, 'the sweep should be large');
  assert.equal(caught, checked, 'every single-character change must be rejected');
});

test('the checksum catches every pair of swapped characters', () => {
  let checked = 0;
  let caught = 0;

  for (let i = 0; i < 300; i++) {
    const body = generateCode(geometric).replace(/-/g, '').slice(PREFIX.length);

    for (let a = 0; a < body.length; a++) {
      for (let b = a + 1; b < body.length; b++) {
        if (body[a] === body[b]) continue;
        const characters = body.split('');
        [characters[a], characters[b]] = [characters[b], characters[a]];
        checked++;
        if (!isValidCode(PREFIX + characters.join(''))) caught++;
      }
    }
  }

  assert.ok(checked > 10000, 'the sweep should be large');
  assert.equal(caught, checked, 'every transposition must be rejected');
});

test('the checksum catches every pair of wrong characters', () => {
  let checked = 0;
  let caught = 0;

  for (let i = 0; i < 40; i++) {
    const body = generateCode(geometric).replace(/-/g, '').slice(PREFIX.length);

    for (let a = 0; a < body.length; a++) {
      for (let b = a + 1; b < body.length; b++) {
        for (const first of ALPHABET.slice(0, 7)) {
          for (const second of ALPHABET.slice(0, 7)) {
            if (first === body[a] || second === body[b]) continue;
            const characters = body.split('');
            characters[a] = first;
            characters[b] = second;
            checked++;
            if (!isValidCode(PREFIX + characters.join(''))) caught++;
          }
        }
      }
    }
  }

  assert.ok(checked > 10000, 'the sweep should be large');
  assert.equal(caught, checked, 'every two-character error must be rejected');
});

/* ------------------------------------------------------------------ *
 * Reading codes back
 * ------------------------------------------------------------------ */

test('a code is read back whatever the case, spacing, or separators', () => {
  const code = generateCode(production);
  const body = code.replace(/-/g, '');

  const forms = [
    code,
    code.toLowerCase(),
    body,
    body.toLowerCase(),
    code.replace(/-/g, ' '),
    '  ' + code + '  ',
    code.split('-').join('_'),
    code.split('').join(' ')
  ];

  for (const form of forms) {
    assert.equal(canonicalize(form), code, 'failed to read ' + JSON.stringify(form));
  }
});

test('a malformed code is rejected with a reason that can be explained', () => {
  const cases = [
    ['', 'empty'],
    ['   ', 'empty'],
    ['NOPE-GMTR-K7N4PX-QM', 'prefix'],
    [PREFIX + '-GMTR-K7N4', 'too-short'],
    [PREFIX + '-GMTR-K7N4PXBM-QMQM', 'too-long'],
    [PREFIX + '-GMTR-K7N4PXBO-QM', 'character'],
    [PREFIX + '-GMTR-K7N4PXBM-22', 'checksum']
  ];

  for (const [input, expected] of cases) {
    const parsed = parseCode(input);
    assert.equal(parsed.valid, false, JSON.stringify(input) + ' should be rejected');
    assert.equal(parsed.reason, expected, 'wrong reason for ' + JSON.stringify(input));
    assert.ok(reasonText(parsed.reason).length > 10, 'every reason needs a message');
  }
});

test('a well-formed code for a product that is not in the catalog is readable but unknown', () => {
  const random = 'K7N4PXBM';
  const code = PREFIX + '-ZZZZ-' + random + '-' + checksumFor('ZZZZ', random);
  const parsed = parseCode(code);

  assert.equal(parsed.valid, true, 'the format and checksum are fine');
  assert.equal(parsed.known, false, 'but no product has that code');
  assert.equal(parsed.product, null);
  assert.equal(productByCode('ZZZZ'), null);
});

/* ------------------------------------------------------------------ *
 * Order-linked codes
 * ------------------------------------------------------------------ */

test('the same order and product always produce the same code', () => {
  const orderId = 'cs_test_a1B2c3D4e5F6g7H8';
  const first = generateCode(bundle, { orderId });

  for (let i = 0; i < 200; i++) {
    assert.equal(generateCode(bundle, { orderId }), first);
  }
});

test('order-linked codes are valid codes', () => {
  for (const product of PRODUCTS) {
    const code = generateCode(product, { orderId: 'order-' + product.slug });
    const parsed = parseCode(code);
    assert.ok(parsed.valid);
    assert.equal(parsed.product.slug, product.slug);
  }
});

test('different orders produce different codes', () => {
  const codes = new Set();
  for (let i = 0; i < 2000; i++) codes.add(generateCode(bundle, { orderId: 'order-' + i }));
  assert.equal(codes.size, 2000);
});

test('the same order produces a different code for each product', () => {
  const orderId = 'pi_3PxyzAbCdEfGhIjK';
  const codes = PRODUCTS.map((product) => generateCode(product, { orderId }));
  assert.equal(new Set(codes).size, PRODUCTS.length);
});

test('an order reference is read from every key a payment provider might use', () => {
  for (const key of ORDER_PARAM_KEYS) {
    const url = 'https://tilecraftdigital.art/thank-you/geometric-essentials/?' + key + '=abc123';
    assert.equal(orderRefFromUrl(url), 'abc123', 'missed ' + key);
  }
});

test('order references are read from the fragment as well as the query', () => {
  assert.equal(
    orderRefFromUrl('https://tilecraftdigital.art/thank-you/x/#session_id=frag123'),
    'frag123'
  );
});

test('the earliest key in the list wins when a URL carries several', () => {
  const url = 'https://tilecraftdigital.art/thank-you/x/?token=t&order_id=o&session_id=s';
  assert.equal(orderRefFromUrl(url), 's');
});

test('a URL with no order reference reports none', () => {
  assert.equal(orderRefFromUrl('https://tilecraftdigital.art/thank-you/x/'), null);
  assert.equal(orderRefFromUrl('https://tilecraftdigital.art/thank-you/x/?other=1'), null);
  assert.equal(orderRefFromUrl('not a url at all'), null);
});

test('an order reference containing odd characters still produces a stable code', () => {
  const awkward = 'ORDER/2026 #17?&=+ éü中文';
  const first = generateCode(geometric, { orderId: awkward });
  assert.equal(generateCode(geometric, { orderId: awkward }), first);
  assert.ok(isValidCode(first));
});

test('the derived section is the right length and uses the alphabet', () => {
  const section = sectionFromOrder('GMTR', 'cs_test_123');
  assert.equal(section.length, RANDOM_LEN);
  for (const character of section) assert.ok(ALPHABET.includes(character));
});

/* ------------------------------------------------------------------ *
 * Activation
 * ------------------------------------------------------------------ */

test('activating a code puts the license on the device', () => {
  const code = generateCode(geometric);
  const result = activate(code);

  assert.equal(result.ok, true);
  assert.equal(result.already, false);
  assert.equal(result.license.slug, 'geometric-essentials');
  assert.equal(listLicenses().length, 1);
  assert.equal(getLicense(code).code, code);
  assert.ok(isUnlocked('geometric-essentials'));
});

test('activating the same code twice does not add it twice', () => {
  const code = generateCode(geometric);
  activate(code);
  const second = activate(code);

  assert.equal(second.ok, true);
  assert.equal(second.already, true);
  assert.equal(listLicenses().length, 1);
});

test('a code is activated the same way however it was typed', () => {
  const code = generateCode(geometric);
  activate(code.toLowerCase().replace(/-/g, ' '));
  assert.equal(listLicenses().length, 1);
  assert.equal(listLicenses()[0].code, code);
});

test('a broken code does not activate anything', () => {
  const result = activate(PREFIX + '-GMTR-K7N4PXBM-22');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'checksum');
  assert.equal(listLicenses().length, 0);
});

test('a code for an unknown product does not activate anything', () => {
  const random = 'K7N4PXBM';
  const code = PREFIX + '-ZZZZ-' + random + '-' + checksumFor('ZZZZ', random);
  const result = activate(code);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unknown-product');
  assert.equal(listLicenses().length, 0);
});

test('an order reference and a licensee name are kept with the license', () => {
  const code = generateCode(bundle, { orderId: 'cs_live_42' });
  activate(code, { orderRef: 'cs_live_42', licensee: '  Juniper Lane Studio  ' });

  const stored = getLicense(code);
  assert.equal(stored.orderRef, 'cs_live_42');
  assert.equal(stored.licensee, 'Juniper Lane Studio');
});

test('the licensee name can be set and cleared later', () => {
  const code = generateCode(geometric);
  activate(code);
  assert.equal(getLicense(code).licensee, null);

  setLicensee(code, 'Ash & Co');
  assert.equal(getLicense(code).licensee, 'Ash & Co');

  setLicensee(code, '   ');
  assert.equal(getLicense(code).licensee, null);
});

test('removing a license takes it off the device and relocks the product', () => {
  const code = generateCode(production);
  activate(code);
  assert.ok(isUnlocked('production-studio'));

  assert.equal(removeLicense(code), true);
  assert.equal(isUnlocked('production-studio'), false);
  assert.equal(listLicenses().length, 0);
  assert.equal(removeLicense(code), false, 'removing it again does nothing');
});

/* ------------------------------------------------------------------ *
 * Bundle activation
 * ------------------------------------------------------------------ */

test('the bundle unlocks all five Collections from one code', () => {
  const code = generateCode(bundle);
  const result = activate(code);

  assert.equal(result.ok, true);

  const expected = [
    'geometric-essentials',
    'textures-and-grain',
    'botanical-linework',
    'mid-century-shapes',
    'tile-and-terrazzo'
  ];

  for (const slug of expected) {
    assert.ok(isUnlocked(slug), slug + ' should be unlocked by the bundle');
  }

  assert.deepEqual([...unlockedSlugs()].sort(), [...expected].sort());
  assert.equal(listLicenses().length, 1, 'one code, one stored license');
});

test('the bundle does not unlock the Studio Editions', () => {
  activate(generateCode(bundle));
  for (const slug of ['pattern-generator-studio', 'repeat-builder', 'production-studio']) {
    assert.equal(isUnlocked(slug), false, slug + ' must stay locked');
  }
});

test('the bundle grants exactly the five Collections, and nothing else', () => {
  const grants = grantsFor(bundle);
  assert.equal(grants.length, 5);
  for (const slug of grants) {
    const product = productBySlug(slug);
    assert.ok(product, slug + ' must be a real product');
    assert.equal(product.tier, 'collection');
    assert.notEqual(slug, 'essentials-bundle');
  }
});

test('a Collection unlocked by the bundle reports the bundle as its license', () => {
  const code = generateCode(bundle);
  activate(code);

  const found = licenseFor('tile-and-terrazzo');
  assert.equal(found.code, code);
  assert.equal(found.slug, 'essentials-bundle');
  assert.equal(found.productName, 'Essentials Bundle');
});

test('a single Collection grants only itself', () => {
  activate(generateCode(geometric));
  assert.deepEqual([...unlockedSlugs()], ['geometric-essentials']);
});

test('removing the bundle relocks all five Collections', () => {
  const code = generateCode(bundle);
  activate(code);
  removeLicense(code);
  assert.equal(unlockedSlugs().size, 0);
});

test('a Collection bought on its own survives removing the bundle', () => {
  activate(generateCode(geometric));
  const bundleCode = generateCode(bundle);
  activate(bundleCode);

  assert.equal(listLicenses().length, 2);
  removeLicense(bundleCode);

  assert.deepEqual([...unlockedSlugs()], ['geometric-essentials']);
});

/* ------------------------------------------------------------------ *
 * Activation links
 * ------------------------------------------------------------------ */

test('an activation link carries the code in the fragment', () => {
  const code = generateCode(geometric);
  const url = activationUrl(code);

  assert.ok(url.startsWith('https://tilecraftdigital.art/studio/#activate='));
  assert.ok(url.includes('#'), 'the code must be in a fragment');

  const [beforeHash] = url.split('#');
  assert.ok(!beforeHash.includes(code), 'the code must never reach the server');
});

test('a code is read back out of its own activation link', () => {
  for (const product of PRODUCTS) {
    const code = generateCode(product);
    const url = activationUrl(code);
    assert.equal(codeFromHash(new URL(url).hash), code);
  }
});

test('an activation link activates the right product', () => {
  const code = generateCode(bundle);
  const recovered = codeFromHash(new URL(activationUrl(code)).hash);
  const result = activate(recovered);

  assert.equal(result.ok, true);
  assert.equal(result.license.slug, 'essentials-bundle');
  assert.equal(unlockedSlugs().size, 5);
});

test('a fragment with no code, or a broken one, yields nothing', () => {
  assert.equal(codeFromHash(''), null);
  assert.equal(codeFromHash('#'), null);
  assert.equal(codeFromHash('#open=geometric-essentials'), null);
  assert.equal(codeFromHash('#activate='), null);
  assert.equal(codeFromHash('#activate=' + PREFIX + '-GMTR-K7N4PXBM-22'), null);
  assert.equal(codeFromHash(null), null);
});

test('an activation link survives URL encoding', () => {
  const code = generateCode(geometric);
  const url = activationUrl(code);
  assert.equal(codeFromHash('#activate=' + encodeURIComponent(code)), code);
  assert.equal(codeFromHash(new URL(url).hash), code);
});

test('an activation link can be built against another origin', () => {
  const code = generateCode(geometric);
  const url = activationUrl(code, 'http://localhost:8123/');
  assert.equal(url, 'http://localhost:8123/studio/#activate=' + code);
});

/* ------------------------------------------------------------------ *
 * The whole purchase flow, for every product
 * ------------------------------------------------------------------ */

test('every product issues, activates, and unlocks correctly from an order', () => {
  for (const product of PRODUCTS) {
    clearLicenses();

    const orderRef = 'cs_test_' + product.code + '_0001';
    const code = generateCode(product, { orderId: orderRef });

    // The confirmation page issues and activates in one step.
    const issued = activate(code, { orderRef });
    assert.equal(issued.ok, true, product.slug + ' should activate');
    assert.equal(issued.license.orderRef, orderRef);

    // Reloading the confirmation page must not issue a second license.
    const reloaded = activate(generateCode(product, { orderId: orderRef }), { orderRef });
    assert.equal(reloaded.already, true, product.slug + ' reload issued a new code');
    assert.equal(listLicenses().length, 1);

    // The activation link works on a second device.
    const onAnotherDevice = codeFromHash(new URL(activationUrl(code)).hash);
    assert.equal(onAnotherDevice, code);

    // Everything the product grants is unlocked.
    for (const slug of grantsFor(product)) {
      assert.ok(isUnlocked(slug), product.slug + ' should unlock ' + slug);
    }
  }
});
