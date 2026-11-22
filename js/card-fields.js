/*
 * The card fields, and the row of accepted-card marks above them.
 *
 * Two things to know about what is here.
 *
 * The marks are original artwork: a card silhouette with a different
 * number of accent bars per network, and the network's name as ordinary
 * text beside it. They are deliberately not the networks' logos. Those
 * are registered trademarks, they are not ours to redraw from memory,
 * and a network's own brand portal is the only correct source once there
 * is a processor to accept that network through. MARKS below is built so
 * an official SVG drops straight in: give an entry an `svg` and it is
 * used instead of the drawn glyph.
 *
 * The fields hold a card only in memory, for as long as the page is open.
 * Nothing here writes to localStorage, nothing is put in the order, and
 * nothing is sent anywhere — there is nowhere to send it to. The fields
 * check that a number could be a card (Luhn, length, a date that has not
 * passed) and then the value is dropped. autocomplete is off throughout,
 * so no browser offers a real saved card to a field that leads nowhere.
 *
 * When a processor is connected, these fields should be replaced by that
 * processor's own hosted fields rather than wired up to it. Hosted fields
 * keep the card out of this page, and that is what keeps the card data
 * out of scope here. See PAYMENT in js/cart.js.
 */

/* ------------------------------------------------------------------ *
 * The networks
 * ------------------------------------------------------------------ */

/**
 * Each network: how its numbers start, how long they run, how the digits
 * group, and how many accent bars its mark carries.
 *
 * To use a network's official mark, add `svg: '<svg …>'` to its entry.
 */
export const MARKS = [
  { id: 'visa', name: 'Visa', starts: /^4/, lengths: [13, 16, 19], groups: [4, 4, 4, 4], bars: 1, cvc: 3 },
  { id: 'mastercard', name: 'Mastercard', starts: /^(5[1-5]|2[2-7])/, lengths: [16], groups: [4, 4, 4, 4], bars: 2, cvc: 3 },
  { id: 'amex', name: 'American Express', starts: /^3[47]/, lengths: [15], groups: [4, 6, 5], bars: 3, cvc: 4 },
  { id: 'discover', name: 'Discover', starts: /^(6011|65|64[4-9])/, lengths: [16, 19], groups: [4, 4, 4, 4], bars: 4, cvc: 3 }
];

const DEFAULT_GROUPS = [4, 4, 4, 4];

/** The network a number belongs to, or null while it is too short to tell. */
export function brandFor(number) {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return null;
  return MARKS.find((mark) => mark.starts.test(digits)) || null;
}

/* ------------------------------------------------------------------ *
 * Checking a card
 * ------------------------------------------------------------------ */

/**
 * The Luhn check digit test. Every card number satisfies it, so failing
 * it means a typo rather than a declined card — which is the only kind
 * of mistake this page can honestly catch.
 */
export function luhnOk(number) {
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.length < 12) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Group a number the way its own network prints it. */
export function formatNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const brand = brandFor(digits);
  const groups = brand ? brand.groups : DEFAULT_GROUPS;
  const max = brand ? Math.max(...brand.lengths) : 19;
  const kept = digits.slice(0, max);

  const parts = [];
  let at = 0;
  for (const size of groups) {
    if (at >= kept.length) break;
    parts.push(kept.slice(at, at + size));
    at += size;
  }
  if (at < kept.length) parts.push(kept.slice(at));
  return parts.join(' ');
}

/** Turn typing into MM/YY without fighting the person doing it. */
export function formatExpiry(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '/' + digits.slice(2);
}

/**
 * Is this expiry a month that has not passed?
 *
 * @param {string} value MM/YY
 * @param {Date} [now] for tests
 */
export function expiryOk(value, now = new Date()) {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(value || '').trim());
  if (!match) return false;

  const month = Number(match[1]);
  if (month < 1 || month > 12) return false;

  const year = 2000 + Number(match[2]);
  // A card is good through the last day of its month.
  const expires = new Date(year, month, 1);
  return expires > new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * What is wrong with the card, as something a person can act on, or an
 * empty string when nothing is.
 */
export function cardProblem({ number = '', expiry = '', cvc = '', name = '' } = {}, now = new Date()) {
  const digits = String(number).replace(/\D/g, '');
  if (!digits) return 'Enter your card number.';

  const brand = brandFor(digits);
  if (!brand) return 'That is not a card number we recognise. Check the first few digits.';
  if (!brand.lengths.includes(digits.length)) {
    return brand.name + ' numbers are ' + brand.lengths.join(' or ') + ' digits long.';
  }
  if (!luhnOk(digits)) return 'That card number has a digit wrong somewhere. Check it against the card.';

  if (!String(name).trim()) return 'Enter the name printed on the card.';
  if (!expiryOk(expiry, now)) {
    return /^\d{2}\s*\/\s*\d{2}$/.test(String(expiry).trim())
      ? 'That expiry date has passed.'
      : 'Enter the expiry date as MM/YY.';
  }

  const code = String(cvc).replace(/\D/g, '');
  if (code.length !== brand.cvc) {
    return 'The security code on a ' + brand.name + ' card is ' + brand.cvc + ' digits.';
  }

  return '';
}

/* ------------------------------------------------------------------ *
 * The marks
 * ------------------------------------------------------------------ */

const SVG = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

/**
 * The drawn card glyph. Original: a card, a stripe, and one to four
 * accent bars so the row has rhythm rather than four copies of the same
 * icon. Replaced by `mark.svg` when an official asset is supplied.
 */
function glyph(mark) {
  const node = svgEl('svg', {
    class: 'paymark__glyph',
    viewBox: '0 0 44 30',
    width: '44',
    height: '30',
    'aria-hidden': 'true',
    focusable: 'false'
  });

  node.append(
    svgEl('rect', { x: '0.75', y: '0.75', width: '42.5', height: '28.5', rx: '4', class: 'paymark__body' }),
    svgEl('rect', { x: '0.75', y: '7', width: '42.5', height: '5.5', class: 'paymark__stripe' })
  );

  for (let i = 0; i < mark.bars; i++) {
    node.append(
      svgEl('rect', {
        x: String(6 + i * 6),
        y: '19',
        width: '4',
        height: '4',
        rx: '1',
        class: 'paymark__bar'
      })
    );
  }

  return node;
}

/**
 * The accepted-card row.
 *
 * The marks are a statement about what can be paid with, so this takes
 * the list rather than assuming it: show only networks the processor is
 * actually set up to accept.
 */
export function marksRow(marks = MARKS) {
  const list = document.createElement('ul');
  list.className = 'paymarks';

  for (const mark of marks) {
    const item = document.createElement('li');
    item.className = 'paymark';
    item.dataset.brand = mark.id;

    if (mark.svg) {
      const holder = document.createElement('span');
      holder.className = 'paymark__official';
      // Supplied by us from the network's own brand assets, not by a
      // visitor, so there is nothing here for a page to inject into.
      holder.innerHTML = mark.svg;
      item.append(holder);
    } else {
      item.append(glyph(mark));
    }

    const name = document.createElement('span');
    name.className = 'paymark__name';
    name.textContent = mark.name;
    item.append(name);

    list.append(item);
  }

  const wrap = document.createElement('div');
  wrap.className = 'paymarks-block';

  const label = document.createElement('p');
  label.className = 'paymarks__label';
  label.id = 'paymarks-label';
  label.textContent = 'Cards accepted';
  list.setAttribute('aria-labelledby', label.id);

  wrap.append(label, list);
  return wrap;
}

/* ------------------------------------------------------------------ *
 * The fields
 * ------------------------------------------------------------------ */

function field(labelText, input, hintText, hintId) {
  const wrap = document.createElement('div');
  wrap.className = 'field';

  const label = document.createElement('label');
  label.setAttribute('for', input.id);
  label.textContent = labelText;
  wrap.append(label, input);

  if (hintText) {
    const hint = document.createElement('p');
    hint.className = 'field__hint';
    hint.textContent = hintText;
    if (hintId) hint.id = hintId;
    wrap.append(hint);
  }
  return wrap;
}

function textInput(id, attrs = {}) {
  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  // Off everywhere: a real saved card must not be offered to these.
  input.autocomplete = 'off';
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('spellcheck', 'false');
  for (const [key, value] of Object.entries(attrs)) input.setAttribute(key, value);
  return input;
}

/**
 * Build the card section.
 *
 * @returns {{node: HTMLElement, read: Function, check: Function, focusFirst: Function}}
 *   `read` returns what is typed, for checking only. Callers must not
 *   store or send it.
 */
export function cardFields() {
  const number = textInput('card-number', {
    inputmode: 'numeric',
    maxlength: '23',
    placeholder: '4111 1111 1111 1111',
    'aria-describedby': 'card-number-hint'
  });

  const name = textInput('card-name', {
    maxlength: '80',
    placeholder: 'A. N. Example'
  });

  const expiry = textInput('card-expiry', {
    inputmode: 'numeric',
    maxlength: '5',
    placeholder: '04/29'
  });

  const cvc = textInput('card-cvc', {
    inputmode: 'numeric',
    maxlength: '4',
    placeholder: '123'
  });

  const marks = marksRow();

  // Light up the network as soon as the number says which one it is.
  const syncBrand = () => {
    const brand = brandFor(number.value);
    for (const item of marks.querySelectorAll('.paymark')) {
      item.classList.toggle('is-on', Boolean(brand) && item.dataset.brand === brand.id);
    }
    marks.classList.toggle('is-narrowed', Boolean(brand));
    cvc.setAttribute('maxlength', String(brand ? brand.cvc : 4));
  };

  number.addEventListener('input', () => {
    const at = number.selectionStart === number.value.length ? null : number.selectionStart;
    number.value = formatNumber(number.value);
    if (at !== null) number.setSelectionRange(at, at);
    syncBrand();
  });

  expiry.addEventListener('input', () => {
    expiry.value = formatExpiry(expiry.value);
  });

  cvc.addEventListener('input', () => {
    cvc.value = cvc.value.replace(/\D/g, '');
  });

  const node = document.createElement('section');
  node.className = 'cardsection';
  node.append(
    (() => {
      const h = document.createElement('h2');
      h.className = 'checkout__title';
      h.textContent = 'Card details';
      return h;
    })(),
    marks,
    field(
      'Card number',
      number,
      'Nothing you type here is stored or sent anywhere.',
      'card-number-hint'
    ),
    field('Name on card', name),
    (() => {
      const pair = document.createElement('div');
      pair.className = 'field-pair';
      pair.append(
        field('Expiry date', expiry),
        field('Security code', cvc)
      );
      return pair;
    })()
  );

  syncBrand();

  return {
    node,
    read: () => ({
      number: number.value,
      name: name.value,
      expiry: expiry.value,
      cvc: cvc.value
    }),
    check: (now) => cardProblem({
      number: number.value,
      name: name.value,
      expiry: expiry.value,
      cvc: cvc.value
    }, now),
    focusFirst: () => {
      const problem = cardProblem({
        number: number.value,
        name: name.value,
        expiry: expiry.value,
        cvc: cvc.value
      });
      if (/card number|digit|recognise|digits long/i.test(problem)) number.focus();
      else if (/name/i.test(problem)) name.focus();
      else if (/expiry/i.test(problem)) expiry.focus();
      else cvc.focus();
    },
    /** Wipe the fields. Called once the order is placed. */
    clear: () => {
      for (const input of [number, name, expiry, cvc]) input.value = '';
      syncBrand();
    }
  };
}
