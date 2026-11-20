/*
 * Purchase options.
 *
 * Extras are the one part of the catalog where a number on a page and an
 * entitlement in a license have to agree. These tests hold them together:
 * the price a buyer is shown is the price the catalog computes, the ids
 * that travel in a link are only ever ones the product offers, and what
 * ends up in the license record is what the Studio later switches on.
 *
 * The selection rides in the URL because there is no server in this
 * design, so the checks that matter most are the ones about what a
 * hand-edited link can and cannot do.
 */

import '../tests/helpers/environment.mjs';
import { resetEnvironment } from './helpers/environment.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PRODUCTS,
  OPTIONS,
  productBySlug,
  optionsFor,
  optionFor,
  chosenOptions,
  priceWithOptions,
  encodeOptions,
  formatPrice
} from '../js/products.js';
import {
  activate,
  generateCode,
  clearLicenses,
  listLicenses,
  optionsFromUrl,
  optionsHeldFor,
  hasOption
} from '../js/license.js';

/* ------------------------------------------------------------------ *
 * The catalog of extras
 * ------------------------------------------------------------------ */

test('every extra is described once, properly', () => {
  for (const [key, option] of Object.entries(OPTIONS)) {
    assert.equal(option.id, key, key + ' does not carry its own id');
    assert.ok(option.name && option.name.length > 2, key + ' needs a name');
    assert.ok(option.blurb && option.blurb.length > 20, key + ' needs a line saying what arrives');
    assert.ok(option.delivers && option.delivers.length > 10, key + ' does not say what it switches on');
    assert.ok(!/\.$/.test(option.name), key + ' name should not end in a full stop');
  }
});

test('every product offers between three and four extras', () => {
  for (const product of PRODUCTS) {
    const options = optionsFor(product);
    assert.ok(
      options.length >= 3 && options.length <= 4,
      product.slug + ' offers ' + options.length + ' extras, which is outside three to four'
    );
  }
});

test('every extra a product offers is a real one, priced between one and five dollars', () => {
  for (const product of PRODUCTS) {
    for (const entry of product.options) {
      assert.ok(OPTIONS[entry.id], product.slug + ' offers an unknown extra: ' + entry.id);
      assert.ok(
        Number.isFinite(entry.price) && entry.price >= 1 && entry.price <= 5,
        product.slug + '/' + entry.id + ' is priced ' + entry.price
      );
      assert.ok(Number.isInteger(entry.price), product.slug + '/' + entry.id + ' should be a whole number of dollars');
    }
  }
});

test('a product does not offer the same extra twice', () => {
  for (const product of PRODUCTS) {
    const ids = product.options.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, product.slug + ' lists an extra twice');
  }
});

test('an extra is only offered where the product can deliver it', () => {
  /*
   * A Collection cannot hand over a seed pack, and a tool with no patterns
   * of its own cannot hand over extra colorways. Offering one would be
   * selling something that never arrives.
   */
  const collectionOnly = ['extra-colorways'];
  const toolOnly = { 'seed-pack': 'pattern-generator-studio', 'motif-library': 'repeat-builder' };

  for (const product of PRODUCTS) {
    const ids = product.options.map((o) => o.id);

    for (const id of collectionOnly) {
      if (ids.includes(id)) {
        assert.equal(product.tier, 'collection', product.slug + ' offers ' + id + ' but is not a Collection');
      }
    }

    for (const [id, owner] of Object.entries(toolOnly)) {
      if (ids.includes(id)) {
        assert.equal(product.slug, owner, product.slug + ' offers ' + id + ', which belongs to ' + owner);
      }
    }
  }
});

/* ------------------------------------------------------------------ *
 * What a purchase comes to
 * ------------------------------------------------------------------ */

test('with nothing ticked, the total is the price of the product', () => {
  for (const product of PRODUCTS) {
    assert.equal(priceWithOptions(product, []), product.price, product.slug);
    assert.equal(priceWithOptions(product, ''), product.price, product.slug);
  }
});

test('ticking everything adds every extra exactly once', () => {
  for (const product of PRODUCTS) {
    const all = optionsFor(product);
    const expected = all.reduce((sum, o) => sum + o.price, product.price);
    const ids = all.map((o) => o.id);
    assert.equal(priceWithOptions(product, ids), expected, product.slug);
    // Asking for the same extra twice must not charge for it twice.
    assert.equal(priceWithOptions(product, [...ids, ...ids]), expected, product.slug + ' double counted');
  }
});

test('an extra the product does not offer cannot be added to the total', () => {
  const product = productBySlug('geometric-essentials');
  const base = product.price;
  assert.equal(priceWithOptions(product, ['seed-pack']), base, 'a foreign extra changed the price');
  assert.equal(priceWithOptions(product, ['not-a-real-extra']), base, 'an invented extra changed the price');
  assert.equal(
    priceWithOptions(product, ['extra-colorways', 'seed-pack']),
    base + optionFor(product, 'extra-colorways').price,
    'a foreign extra was charged alongside a real one'
  );
});

test('every reachable total is a sensible price', () => {
  // Every combination of extras, for every product, to be sure none of
  // them can produce a total that reads wrong on a page.
  for (const product of PRODUCTS) {
    const ids = optionsFor(product).map((o) => o.id);
    for (let mask = 0; mask < (1 << ids.length); mask++) {
      const picked = ids.filter((_, i) => mask & (1 << i));
      const total = priceWithOptions(product, picked);
      assert.ok(Number.isInteger(total), product.slug + ' produced a fractional total: ' + total);
      assert.ok(total >= product.price, product.slug + ' produced a total below its price');
      assert.match(formatPrice(total), /^\$\d+$/, product.slug + ' formatted badly: ' + formatPrice(total));
    }
  }
});

/* ------------------------------------------------------------------ *
 * Travelling in a link
 * ------------------------------------------------------------------ */

test('a selection encodes in the product’s own order, whatever order it was ticked in', () => {
  const product = productBySlug('production-studio');
  const ids = optionsFor(product).map((o) => o.id);
  const reversed = [...ids].reverse();
  assert.equal(encodeOptions(product, reversed), ids.join(','));
});

test('encoding drops anything the product does not offer', () => {
  const product = productBySlug('repeat-builder');
  assert.equal(encodeOptions(product, ['seed-pack', 'motif-library']), 'motif-library');
  assert.equal(encodeOptions(product, []), '');
});

test('a link’s extras are read back out of it', () => {
  assert.deepEqual(
    optionsFromUrl('https://example.com/thank-you/x/?session_id=1&options=extra-colorways,mockup-pack'),
    ['extra-colorways', 'mockup-pack']
  );
  assert.deepEqual(optionsFromUrl('https://example.com/thank-you/x/?session_id=1'), []);
  assert.deepEqual(optionsFromUrl('not a url at all'), []);
  assert.deepEqual(optionsFromUrl('https://example.com/x/?options='), []);
  assert.deepEqual(optionsFromUrl('https://example.com/x/?options=,,'), []);
});

test('a round trip through a link keeps the selection intact', () => {
  for (const product of PRODUCTS) {
    const ids = optionsFor(product).map((o) => o.id);
    const url = 'https://example.com/thank-you/' + product.slug + '/?session_id=o1&options=' + encodeOptions(product, ids);
    assert.deepEqual(chosenOptions(product, optionsFromUrl(url)).map((o) => o.id), ids, product.slug);
  }
});

/* ------------------------------------------------------------------ *
 * What ends up in the license
 * ------------------------------------------------------------------ */

test('the extras bought are written into the license record', () => {
  resetEnvironment();
  clearLicenses();

  const product = productBySlug('tile-and-terrazzo');
  activate(generateCode(product, { orderId: 'order-1' }), {
    orderRef: 'order-1',
    options: ['extra-colorways', 'palette-files']
  });

  const record = listLicenses()[0];
  assert.deepEqual(record.options, ['extra-colorways', 'palette-files']);
});

test('a license records no extras when none were bought', () => {
  resetEnvironment();
  clearLicenses();
  activate(generateCode(productBySlug('botanical-linework'), { orderId: 'order-2' }), { orderRef: 'order-2' });
  assert.deepEqual(listLicenses()[0].options, []);
});

test('an edited link cannot grant an extra the product does not sell', () => {
  resetEnvironment();
  clearLicenses();

  activate(generateCode(productBySlug('geometric-essentials'), { orderId: 'order-3' }), {
    orderRef: 'order-3',
    options: ['seed-pack', 'motif-library', 'large-format', 'extra-colorways']
  });

  // Only the one the product actually offers survives.
  assert.deepEqual(listLicenses()[0].options, ['extra-colorways']);
  assert.equal(hasOption('geometric-essentials', 'seed-pack'), false);
  assert.equal(hasOption('geometric-essentials', 'extra-colorways'), true);
});

test('an extra already held is not taken away by a later link without it', () => {
  resetEnvironment();
  clearLicenses();

  const product = productBySlug('mid-century-shapes');
  const code = generateCode(product, { orderId: 'order-4' });

  activate(code, { orderRef: 'order-4', options: ['extra-colorways', 'print-specs'] });
  // The same confirmation page opened again, this time with a trimmed link.
  activate(code, { orderRef: 'order-4', options: ['print-specs'] });

  const held = optionsHeldFor('mid-century-shapes');
  assert.ok(held.has('extra-colorways'), 'an extra was lost on a second visit');
  assert.ok(held.has('print-specs'));
  assert.equal(listLicenses().length, 1, 'a second license was issued');
});

test('an extra bought later is added to a license already held', () => {
  resetEnvironment();
  clearLicenses();

  const product = productBySlug('textures-and-grain');
  const code = generateCode(product, { orderId: 'order-5' });

  activate(code, { orderRef: 'order-5' });
  assert.deepEqual(listLicenses()[0].options, []);

  activate(code, { orderRef: 'order-5', options: ['palette-files'] });
  assert.deepEqual(listLicenses()[0].options, ['palette-files']);
});

test('an extra bought with a bundle reaches everything the bundle unlocks', () => {
  resetEnvironment();
  clearLicenses();

  const bundle = productBySlug('essentials-bundle');
  activate(generateCode(bundle, { orderId: 'order-6' }), {
    orderRef: 'order-6',
    options: ['palette-files', 'mockup-pack']
  });

  for (const slug of bundle.grants) {
    assert.ok(hasOption(slug, 'palette-files'), slug + ' did not receive the bundle extra');
    assert.ok(hasOption(slug, 'mockup-pack'), slug + ' did not receive the bundle extra');
  }
  assert.equal(hasOption('production-studio', 'palette-files'), false, 'the extra leaked past the bundle');
});

test('extras from two licenses for the same product add up', () => {
  resetEnvironment();
  clearLicenses();

  // The Collection on its own with one extra, and the bundle with another.
  activate(generateCode(productBySlug('tile-and-terrazzo'), { orderId: 'order-7' }), {
    orderRef: 'order-7',
    options: ['extra-colorways']
  });
  activate(generateCode(productBySlug('essentials-bundle'), { orderId: 'order-8' }), {
    orderRef: 'order-8',
    options: ['mockup-pack']
  });

  const held = optionsHeldFor('tile-and-terrazzo');
  assert.ok(held.has('extra-colorways'));
  assert.ok(held.has('mockup-pack'));
});

test('a product with no extras held reports none', () => {
  resetEnvironment();
  clearLicenses();
  assert.deepEqual([...optionsHeldFor('geometric-essentials')], []);
  assert.equal(hasOption('geometric-essentials', 'extra-colorways'), false);
});
