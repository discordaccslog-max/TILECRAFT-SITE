/*
 * The cart.
 *
 * It holds an intention to buy until a checkout exists to take it, so the
 * things worth pinning down are: that it never stores a price, that the
 * same product with different extras is a different line, and that what
 * it hands a future checkout is computed from the catalog at the moment
 * it is asked.
 *
 * The last one matters most. A cart sits in a browser for weeks; if it
 * remembered what something cost when it went in, the first thing a new
 * checkout would do is charge the wrong amount.
 */

import '../tests/helpers/environment.mjs';
import { resetEnvironment } from './helpers/environment.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import * as cart from '../js/cart.js';
import { PRODUCTS, productBySlug, optionsFor, priceWithOptions } from '../js/products.js';

const GEO = 'geometric-essentials';
const BUNDLE = 'complete-library';

function fresh() {
  resetEnvironment();
  cart.clear();
}

/* ------------------------------------------------------------------ *
 * Adding
 * ------------------------------------------------------------------ */

test('a new cart is empty', () => {
  fresh();
  assert.equal(cart.isEmpty(), true);
  assert.deepEqual(cart.items(), []);
  assert.deepEqual(cart.summary(), { lines: [], count: 0, total: 0 });
});

test('adding a product puts one of it in the cart at its own price', () => {
  fresh();
  cart.add(GEO);

  const { lines, count, total } = cart.summary();
  assert.equal(count, 1);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].slug, GEO);
  assert.equal(lines[0].quantity, 1);
  assert.equal(lines[0].unit, productBySlug(GEO).price);
  assert.equal(total, productBySlug(GEO).price);
});

test('adding with extras charges for them', () => {
  fresh();
  const product = productBySlug(GEO);
  const ids = optionsFor(product).slice(0, 2).map((o) => o.id);
  cart.add(GEO, ids);

  const line = cart.items()[0];
  assert.deepEqual(line.options.map((o) => o.id), ids);
  assert.equal(line.unit, priceWithOptions(product, ids));
  assert.ok(line.unit > product.price, 'the extras did not add anything');
});

test('adding the same thing twice makes one line of two', () => {
  fresh();
  cart.add(GEO);
  cart.add(GEO);

  const { lines, count } = cart.summary();
  assert.equal(lines.length, 1, 'a second line was made');
  assert.equal(count, 2);
  assert.equal(lines[0].total, productBySlug(GEO).price * 2);
});

test('the same product with different extras is a different line', () => {
  fresh();
  const ids = optionsFor(productBySlug(GEO)).map((o) => o.id);
  cart.add(GEO, []);
  cart.add(GEO, [ids[0]]);

  const { lines, count } = cart.summary();
  assert.equal(lines.length, 2, 'the two should not have been merged');
  assert.equal(count, 2);
  assert.notEqual(lines[0].unit, lines[1].unit);
});

test('the order extras were ticked in does not make a second line', () => {
  fresh();
  const ids = optionsFor(productBySlug(GEO)).slice(0, 3).map((o) => o.id);
  cart.add(GEO, ids);
  cart.add(GEO, [...ids].reverse());

  assert.equal(cart.items().length, 1, 'the same choice made two lines');
  assert.equal(cart.summary().count, 2);
});

test('an extra the product does not sell never reaches the cart', () => {
  fresh();
  cart.add(GEO, ['seed-pack', 'not-a-real-extra']);

  const line = cart.items()[0];
  assert.deepEqual(line.options, []);
  assert.equal(line.unit, productBySlug(GEO).price, 'a foreign extra was charged for');
});

test('adding something that is not sold does nothing', () => {
  fresh();
  assert.equal(cart.add('not-a-product'), null);
  assert.equal(cart.isEmpty(), true);
});

test('every product in the catalog can be added and priced', () => {
  for (const product of PRODUCTS) {
    fresh();
    const ids = optionsFor(product).map((o) => o.id);
    cart.add(product.slug, ids);

    const line = cart.items()[0];
    assert.ok(line, product.slug + ' could not be added');
    assert.equal(line.unit, priceWithOptions(product, ids), product.slug + ' priced wrong');
    assert.ok(Number.isInteger(line.total), product.slug + ' produced a fractional total');
  }
});

/* ------------------------------------------------------------------ *
 * Changing
 * ------------------------------------------------------------------ */

test('a quantity can be set, and zero takes the line out', () => {
  fresh();
  const line = cart.add(GEO);

  cart.setQuantity(line.key, 4);
  assert.equal(cart.summary().count, 4);
  assert.equal(cart.items()[0].total, productBySlug(GEO).price * 4);

  cart.setQuantity(line.key, 0);
  assert.equal(cart.isEmpty(), true);
});

test('a quantity cannot be negative or absurd', () => {
  fresh();
  const line = cart.add(GEO);

  cart.setQuantity(line.key, -5);
  assert.equal(cart.isEmpty(), true, 'a negative quantity should remove the line');

  const again = cart.add(GEO);
  cart.setQuantity(again.key, 1000);
  assert.equal(cart.items()[0].quantity, 99, 'the quantity should be capped');
});

test('a line can be removed without touching the others', () => {
  fresh();
  const a = cart.add(GEO);
  cart.add(BUNDLE);

  cart.remove(a.key);
  const lines = cart.items();
  assert.equal(lines.length, 1);
  assert.equal(lines[0].slug, BUNDLE);
});

test('the cart can be emptied', () => {
  fresh();
  cart.add(GEO);
  cart.add(BUNDLE);
  cart.clear();
  assert.equal(cart.isEmpty(), true);
});

/* ------------------------------------------------------------------ *
 * What is stored, and what is not
 * ------------------------------------------------------------------ */

test('no price is ever written to storage', () => {
  fresh();
  const product = productBySlug(GEO);
  cart.add(GEO, optionsFor(product).map((o) => o.id));

  const raw = globalThis.localStorage.getItem('tilecraft:cart');
  assert.ok(raw, 'nothing was stored');
  assert.ok(!/price|total|unit|cost/i.test(raw), 'a price was written into storage: ' + raw);

  const stored = JSON.parse(raw);
  assert.deepEqual(Object.keys(stored[0]).sort(), ['options', 'quantity', 'slug']);
});

test('a price change in the catalog is reflected by a cart already filled', () => {
  /*
   * The point of storing no prices. A cart that remembered what something
   * cost when it went in would quietly charge yesterday's price.
   */
  fresh();
  const product = productBySlug(GEO);
  const original = product.price;

  cart.add(GEO);
  assert.equal(cart.summary().total, original);

  try {
    product.price = original + 7;
    assert.equal(cart.summary().total, original + 7, 'the cart kept the old price');
  } finally {
    product.price = original;
  }
});

test('a stored line for a product that no longer exists is dropped', () => {
  fresh();
  globalThis.localStorage.setItem(
    'tilecraft:cart',
    JSON.stringify([{ slug: 'a-product-we-stopped-selling', options: [], quantity: 2 }])
  );
  assert.deepEqual(cart.items(), []);
  assert.equal(cart.isEmpty(), true);
});

test('nonsense in storage is ignored rather than thrown', () => {
  fresh();
  for (const junk of ['not json at all', '{"not":"an array"}', '[1,2,3]', '[null]']) {
    globalThis.localStorage.setItem('tilecraft:cart', junk);
    assert.doesNotThrow(() => cart.items(), 'threw on ' + junk);
    assert.deepEqual(cart.items(), [], 'made something out of ' + junk);
  }
});

/* ------------------------------------------------------------------ *
 * Handing over to a checkout
 * ------------------------------------------------------------------ */

test('no checkout is connected yet, and the cart says so', () => {
  assert.equal(cart.CHECKOUT.ready, false);
  assert.equal(cart.CHECKOUT.path, '');
});

test('setting a path is all it takes to connect one', () => {
  /*
   * The placeholder is a switch, not a dead end. Whoever builds the
   * checkout should only have to set this, so that is pinned down here.
   */
  const original = cart.CHECKOUT.path;
  try {
    cart.CHECKOUT.path = '/checkout/';
    assert.equal(cart.CHECKOUT.ready, true);

    cart.CHECKOUT.path = '   ';
    assert.equal(cart.CHECKOUT.ready, false, 'whitespace should not count as a checkout');
  } finally {
    cart.CHECKOUT.path = original;
  }
  assert.equal(cart.CHECKOUT.ready, false);
});

test('the cart page has both a connected and an unconnected state', async () => {
  // Read rather than run: the page needs a document. What matters is
  // that neither branch was left out.
  const fs = await import('node:fs');
  const path = await import('node:path');
  const source = fs.readFileSync(
    path.join(import.meta.dirname, '../js/cart-page.js'),
    'utf8'
  );

  assert.match(source, /CHECKOUT\.ready/, 'the page never checks whether a checkout exists');
  assert.match(source, /Checkout is not connected yet/, 'nothing is shown when there is none');
  assert.match(source, /Continue to checkout/, 'there is no checkout step for when one exists');
  assert.match(source, /cart-agree/, 'the terms are not agreed to before checkout');
});

test('the order a checkout would receive describes the whole cart', () => {
  fresh();
  const product = productBySlug(GEO);
  const ids = optionsFor(product).slice(0, 2).map((o) => o.id);
  cart.add(GEO, ids, 2);
  cart.add(BUNDLE);

  const order = cart.order();
  assert.equal(order.currency, 'USD');
  assert.equal(order.count, 3);
  assert.equal(order.lines.length, 2);
  assert.match(order.totalFormatted, /^\$\d+$/);

  const line = order.lines.find((l) => l.slug === GEO);
  assert.equal(line.quantity, 2);
  assert.equal(line.unit, priceWithOptions(product, ids));
  assert.equal(line.total, line.unit * 2);
  assert.equal(line.name, product.name);
  assert.deepEqual(line.options.map((o) => o.id), ids);

  // The confirmation page is where a checkout sends people afterwards,
  // so the order has to carry the way back for each product.
  for (const l of order.lines) {
    assert.equal(l.thankYouPath, productBySlug(l.slug).thankYouPath);
    assert.match(l.thankYouPath, /^\/thank-you\/[a-z-]+\/$/);
  }
});

test('the order total is the sum of its lines', () => {
  fresh();
  for (const product of PRODUCTS.slice(0, 6)) {
    cart.add(product.slug, optionsFor(product).slice(0, 1).map((o) => o.id), 2);
  }

  const order = cart.order();
  const summed = order.lines.reduce((n, l) => n + l.total, 0);
  assert.equal(order.total, summed);
  assert.equal(order.count, order.lines.reduce((n, l) => n + l.quantity, 0));
});

test('an empty cart produces an empty order rather than failing', () => {
  fresh();
  const order = cart.order();
  assert.equal(order.count, 0);
  assert.equal(order.total, 0);
  assert.deepEqual(order.lines, []);
});

/* ------------------------------------------------------------------ *
 * Telling the page about it
 * ------------------------------------------------------------------ */

test('a change announces itself so the header can keep up', () => {
  fresh();
  const seen = [];
  const stop = cart.onChange((summary) => seen.push(summary.count));

  cart.add(GEO);
  cart.add(GEO);
  cart.clear();
  stop();
  cart.add(GEO);

  assert.deepEqual(seen, [1, 2, 0], 'the cart did not report every change, or kept reporting after being told to stop');
});
