/*
 * Tilecraft Digital — product pages
 *
 * One script serves every product page. The page's shell carries only its
 * slug; everything a visitor reads is rendered from js/products.js, so the
 * catalog can be changed by editing that one file.
 *
 * The buy button is rendered only when the product has a checkout link. The
 * agreement checkbox appears with it and disappears with it, because a
 * checkbox gating nothing would be a dead control.
 */

import {
  productBySlug,
  formatPrice,
  optionsFor,
  priceWithOptions,
  TIERS
} from './products.js';
import * as cart from './cart.js';
import { ALLOWED, NOT_ALLOWED, AI_DISCLOSURE } from './license-terms.js';
import { renderProductPreview, countsFor } from './previews.js';
import { maxExportLabel } from './export-limit.js';

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function list(items, className) {
  return (
    '<ul class="' + className + '">' +
    items.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') +
    '</ul>'
  );
}

/* ------------------------------------------------------------------ *
 * Extras
 * ------------------------------------------------------------------ */

/**
 * The extras a product offers, as checkboxes that move the running total.
 *
 * Nothing is ticked to begin with: the price on the page is the price of
 * the product, and every tick is the buyer's own doing. The total is
 * recalculated from the catalog rather than added up in the markup, so the
 * figure shown and the figure in the link cannot drift apart.
 *
 * @returns {{selected: () => string[], onChange: (fn) => void}}
 */
function renderOptions(product, host) {
  const options = optionsFor(product);
  const listeners = [];

  if (!options.length) {
    return { selected: () => [], onChange: () => {} };
  }

  const section = document.createElement('div');
  section.className = 'extras';
  section.innerHTML =
    '<h3 class="extras__title">Add to this purchase</h3>' +
    '<p class="extras__intro">Optional. Each one is switched on in the Studio as soon as your license is issued.</p>';

  const list = document.createElement('ul');
  list.className = 'extras__list';

  for (const option of options) {
    const id = 'option-' + product.slug + '-' + option.id;
    const item = document.createElement('li');
    item.className = 'extras__item';
    item.innerHTML =
      '<input type="checkbox" id="' + id + '" value="' + escapeHtml(option.id) + '" data-option>' +
      '<label for="' + id + '">' +
      '<span class="extras__name">' + escapeHtml(option.name) + '</span>' +
      '<span class="extras__price">+' + formatPrice(option.price) + '</span>' +
      '<span class="extras__blurb">' + escapeHtml(option.blurb) + '</span>' +
      '</label>';
    list.append(item);
  }

  section.append(list);

  const total = document.createElement('p');
  total.className = 'extras__total';
  section.append(total);
  host.append(section);

  const boxes = [...section.querySelectorAll('[data-option]')];
  const selected = () => boxes.filter((b) => b.checked).map((b) => b.value);

  const sync = () => {
    const chosen = selected();
    const sum = priceWithOptions(product, chosen);
    const headline = document.querySelector('[data-buybox-total]');
    if (headline) headline.textContent = formatPrice(sum);

    total.textContent = chosen.length
      ? chosen.length + (chosen.length === 1 ? ' extra added — total ' : ' extras added — total ') + formatPrice(sum)
      : 'No extras added. Total ' + formatPrice(product.price) + '.';

    for (const fn of listeners) fn();
  };

  for (const box of boxes) box.addEventListener('change', sync);
  sync();

  return { selected, onChange: (fn) => listeners.push(fn) };
}

/* ------------------------------------------------------------------ *
 * The buy box
 * ------------------------------------------------------------------ */

function renderBuyBox(product, host) {
  const tier = TIERS[product.tier];

  host.innerHTML =
    '<p class="buybox__price" data-buybox-total>' + formatPrice(product.price) + '</p>' +
    '<p class="buybox__tier">' + escapeHtml(tier ? tier.name : '') + ' &middot; One-time purchase</p>' +
    '<ul class="buybox__facts">' +
    '<li>Instant access</li>' +
    '<li>Commercial license included</li>' +
    '<li>14-day refund policy</li>' +
    '<li>Applicable taxes are shown at checkout.</li>' +
    '</ul>';

  // The extras come first: what is ticked here is what goes in the cart.
  const extras = renderOptions(product, host);

  const addWrap = document.createElement('p');
  addWrap.className = 'buybox__buy';

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button button--ink button--block';
  addWrap.append(add);

  const note = document.createElement('p');
  note.className = 'buybox__added';
  note.setAttribute('role', 'status');

  /*
   * The button always says what it will add and what that costs, so the
   * extras ticked above and the thing going in the cart cannot differ.
   */
  const syncAdd = () => {
    const total = priceWithOptions(product, extras.selected());
    add.textContent = 'Add to cart — ' + formatPrice(total);
  };

  extras.onChange(syncAdd);
  syncAdd();

  add.addEventListener('click', () => {
    const chosen = extras.selected();
    const line = cart.add(product.slug, chosen);
    if (!line) return;

    const count = line.quantity;
    note.textContent =
      product.name +
      (chosen.length ? ' with ' + chosen.length + (chosen.length === 1 ? ' extra' : ' extras') : '') +
      ' added' +
      (count > 1 ? ' — ' + count + ' in your cart' : '') +
      '.';
    note.hidden = false;
  });

  note.hidden = true;

  const viewCart = document.createElement('p');
  viewCart.className = 'buybox__cartlink';
  viewCart.innerHTML = '<a href="/cart/">View your cart</a>';

  const tax = document.createElement('p');
  tax.className = 'buybox__tax';
  tax.textContent = 'Applicable taxes are shown at checkout.';

  /*
   * The agreement to the Terms, License and Refund Policy belongs at the
   * point of paying rather than the point of adding to a cart, so it
   * lives on the cart page. The links are still here, because somebody
   * deciding whether to add something should be able to read them first.
   */
  const terms = document.createElement('p');
  terms.className = 'buybox__terms';
  terms.innerHTML =
    'Covered by the <a href="/license/">License</a>, ' +
    '<a href="/terms/">Terms of Service</a>, and <a href="/refunds/">Refund Policy</a>.';

  host.append(addWrap, note, viewCart, tax, terms);
}

/* ------------------------------------------------------------------ *
 * The page
 * ------------------------------------------------------------------ */

function renderProduct(product) {
  const tier = TIERS[product.tier];

  const titleSlot = document.querySelector('[data-product-title]');
  if (titleSlot) {
    titleSlot.innerHTML =
      '<span class="overprint" data-text="' +
      escapeHtml(product.name).replace(/"/g, '&quot;') +
      '">' + escapeHtml(product.name) + '</span>';
  }

  const eyebrow = document.querySelector('[data-product-tier]');
  if (eyebrow) eyebrow.textContent = tier ? tier.name : '';

  const short = document.querySelector('[data-product-short]');
  if (short) short.textContent = product.short;

  const body = document.querySelector('[data-product-body]');
  if (body) {
    body.innerHTML =
      '<h2>What it is</h2>' +
      product.full.map((p) => '<p>' + escapeHtml(p) + '</p>').join('') +
      '<h2>Everything it includes</h2>' +
      list(product.features, 'feature-list') +
      '<h2>Who it is for</h2>' +
      list(product.forWhom, 'terms-plain') +
      '<h3>Who it is not for</h3>' +
      list(product.notForWhom, 'terms-plain') +
      '<h2>What you need</h2>' +
      '<p>A modern web browser on a computer, tablet, or phone. There is nothing to install and no account to create. ' +
      'The Studio runs in the browser, and once a page has loaded it keeps working offline.</p>' +
      '<h2>Your license</h2>' +
      '<p>Every purchase grants a non-exclusive commercial license to you, as an individual or as a single business. ' +
      'No attribution is required, and there is no limit on the number of items you make or sell.</p>' +
      '<div class="terms-split">' +
      '<div class="terms-card terms-card--yes"><h3>You may</h3>' +
      '<ul>' + ALLOWED.slice(0, 5).map((t) => '<li>' + escapeHtml(t) + '</li>').join('') + '</ul></div>' +
      '<div class="terms-card terms-card--no"><h3>You may not</h3>' +
      '<ul>' + NOT_ALLOWED.map((t) => '<li>' + escapeHtml(t) + '</li>').join('') + '</ul></div>' +
      '</div>' +
      '<p><a href="/license/">Read the full license</a>.</p>' +
      '<div class="disclosure">' +
      '<h2>' + escapeHtml(AI_DISCLOSURE.heading) + '</h2>' +
      AI_DISCLOSURE.paragraphs.map((p) => '<p>' + escapeHtml(p) + '</p>').join('') +
      '</div>';
  }

  const buybox = document.querySelector('[data-buybox]');
  if (buybox) renderBuyBox(product, buybox);

  // Real patterns, rendered from the same files the Studio uses, rather
  // than a decorative illustration. What is shown is what is sold.
  const art = document.querySelector('[data-product-art]');
  if (art) {
    renderProductPreview(art, product.slug).then((ok) => {
      const note = document.querySelector('[data-art-note]');
      if (note) {
        note.textContent = ok
          ? (product.tier === 'collection'
              ? 'Patterns from this collection, shown at their repeat size.'
              : 'Made with this tool.')
          : '';
      }
    });
  }

  // Counts come from the generated files, so a page cannot claim a number
  // the collection does not actually hold.
  countsFor(product.slug).then((counts) => {
    for (const slot of document.querySelectorAll('[data-pattern-count]')) {
      if (!counts) {
        slot.remove();
        continue;
      }
      slot.textContent =
        counts.patterns + ' patterns, each with ' + counts.colorwaysPerPattern +
        ' curated colorways — ' + counts.colorways + ' colorways in all.';
      slot.hidden = false;
    }
  });

  maxExportLabel().then((label) => {
    for (const slot of document.querySelectorAll('[data-export-limit]')) {
      slot.textContent = label;
    }
  });

  // Keep the document title in step with the catalog.
  document.title = product.name + ' — ' + formatPrice(product.price) + ' — Tilecraft Digital';
}

function start() {
  const root = document.querySelector('[data-product]');
  if (!root) return;
  const product = productBySlug(root.dataset.product);
  if (!product) return;
  renderProduct(product);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
