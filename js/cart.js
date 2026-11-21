/*
 * The cart.
 *
 * Holds what somebody intends to buy until a checkout exists to take it.
 * The checkout itself is not built yet — see CHECKOUT below for the one
 * place it plugs into.
 *
 * What is stored is deliberately thin: a product slug, the ids of the
 * extras chosen with it, and a quantity. Prices are never stored. Every
 * figure the cart reports is recomputed from js/products.js when it is
 * asked for, so a cart left in a browser for a month cannot resurrect an
 * old price, and editing what is in storage cannot invent one either. The
 * same reasoning as the license records: the catalog is the only thing
 * that says what anything costs.
 *
 * A line is identified by its product and its extras together, because
 * the same Collection with a different set of extras is a different
 * thing to buy. Adding the identical combination twice increases the
 * quantity rather than making a second line.
 */

import { productBySlug, chosenOptions, priceWithOptions, formatPrice } from './products.js';

const KEY = 'tilecraft:cart';
const MAX_QUANTITY = 99;

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A private window, blocked storage, or something that is not JSON.
    return [];
  }
}

function write(lines) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* Storage can be unavailable; the cart simply will not persist. */
  }
  announce();
}

function announce() {
  try {
    document.dispatchEvent(new CustomEvent('tilecraft:cartchange', { detail: summary() }));
  } catch {
    /* No document, as in a test environment without one. */
  }
}

/** Listen for any change to the cart. Returns an unsubscribe function. */
export function onChange(callback) {
  const handler = (event) => callback(event.detail || summary());
  document.addEventListener('tilecraft:cartchange', handler);
  return () => document.removeEventListener('tilecraft:cartchange', handler);
}

/* ------------------------------------------------------------------ *
 * Lines
 * ------------------------------------------------------------------ */

/**
 * The key a line is identified by: the product plus its extras, in the
 * catalog's own order so the same choice always produces the same key
 * however it was ticked.
 */
export function lineKey(slug, optionIds) {
  const product = productBySlug(slug);
  const ids = product ? chosenOptions(product, optionIds).map((o) => o.id) : [];
  return ids.length ? slug + '+' + ids.join('+') : slug;
}

function clampQuantity(value) {
  const n = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(MAX_QUANTITY, n));
}

/**
 * Everything in the cart, priced from the catalog.
 *
 * Lines whose product no longer exists are dropped rather than shown as
 * a broken row: a catalog can change under a cart that has been sitting
 * in a browser, and the honest thing is to not offer something that is
 * no longer sold.
 *
 * @returns {Array<{key, slug, product, options, quantity, unit, total}>}
 */
export function items() {
  const out = [];

  for (const line of read()) {
    const product = productBySlug(line && line.slug);
    if (!product) continue;

    const quantity = clampQuantity(line.quantity);
    if (!quantity) continue;

    const options = chosenOptions(product, line.options);
    const unit = priceWithOptions(product, options.map((o) => o.id));

    out.push({
      key: lineKey(product.slug, options.map((o) => o.id)),
      slug: product.slug,
      product,
      options,
      quantity,
      unit,
      total: unit * quantity
    });
  }

  return out;
}

/** What the cart comes to, and how much is in it. */
export function summary() {
  const lines = items();
  return {
    lines,
    count: lines.reduce((n, line) => n + line.quantity, 0),
    total: lines.reduce((n, line) => n + line.total, 0)
  };
}

/** Whether anything is in the cart. */
export function isEmpty() {
  return summary().count === 0;
}

/* ------------------------------------------------------------------ *
 * Changing it
 * ------------------------------------------------------------------ */

/**
 * Put a product in the cart, with whichever extras were chosen.
 *
 * Extras the product does not offer are dropped here as they are
 * everywhere else, so what goes in is always something that can be sold.
 *
 * @returns {object|null} the line as it now stands
 */
export function add(slug, optionIds = [], quantity = 1) {
  const product = productBySlug(slug);
  if (!product) return null;

  const ids = chosenOptions(product, optionIds).map((o) => o.id);
  const key = lineKey(slug, ids);
  const lines = read();
  const existing = lines.find((line) => lineKey(line.slug, line.options) === key);

  if (existing) {
    existing.quantity = clampQuantity(existing.quantity + quantity);
  } else {
    lines.push({ slug, options: ids, quantity: clampQuantity(quantity) || 1 });
  }

  write(lines);
  return items().find((line) => line.key === key) || null;
}

/** Set a line's quantity. Zero removes it. */
export function setQuantity(key, quantity) {
  const wanted = clampQuantity(quantity);
  const lines = read().filter((line) => {
    if (lineKey(line.slug, line.options) !== key) return true;
    line.quantity = wanted;
    return wanted > 0;
  });
  write(lines);
}

/** Take a line out of the cart. */
export function remove(key) {
  write(read().filter((line) => lineKey(line.slug, line.options) !== key));
}

/** Empty the cart. */
export function clear() {
  write([]);
}

/* ------------------------------------------------------------------ *
 * Handing over to a checkout
 * ------------------------------------------------------------------ */

/*
 * THE CHECKOUT IS NOT BUILT YET.
 *
 * Everything above is finished and works. What does not exist is the
 * page that takes payment, so the cart stops at the point of handing
 * over and says so rather than pretending.
 *
 * To connect one:
 *
 *   1. Set CHECKOUT.path to the page that will take the order.
 *   2. That page calls cart.order() for everything it needs: the lines,
 *      their extras, the quantities and the total, all priced from the
 *      catalog at the moment it is asked.
 *   3. When payment succeeds, send the buyer to each product's
 *      thankYouPath with the order reference as ?session_id= and the
 *      chosen extras as ?options=a,b — which is what js/thank-you.js
 *      already reads to issue the license. Nothing in the license system
 *      needs changing.
 *   4. Call cart.clear() once the order is placed.
 *
 * Until CHECKOUT.path is set, the cart page shows that the checkout is
 * not connected instead of offering a button that would go nowhere.
 */
export const CHECKOUT = {
  /** The checkout page. Empty until one exists. */
  path: '',

  /** Whether a checkout is connected. */
  get ready() {
    return typeof this.path === 'string' && this.path.trim().length > 0;
  }
};

/**
 * The order, in the shape a checkout page needs it.
 *
 * Everything is recomputed from the catalog as it is built, so whatever
 * reads this is working from today's prices.
 */
export function order() {
  const { lines, count, total } = summary();
  return {
    currency: 'USD',
    count,
    total,
    totalFormatted: formatPrice(total),
    lines: lines.map((line) => ({
      slug: line.slug,
      name: line.product.name,
      quantity: line.quantity,
      unit: line.unit,
      total: line.total,
      thankYouPath: line.product.thankYouPath,
      options: line.options.map((o) => ({ id: o.id, name: o.name, price: o.price }))
    }))
  };
}

export default {
  items,
  summary,
  isEmpty,
  add,
  setQuantity,
  remove,
  clear,
  order,
  onChange,
  lineKey,
  CHECKOUT
};
