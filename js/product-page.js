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

import { productBySlug, formatPrice, hasCheckout, TIERS } from './products.js';
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
 * The buy box
 * ------------------------------------------------------------------ */

function renderBuyBox(product, host) {
  const tier = TIERS[product.tier];

  host.innerHTML =
    '<p class="buybox__price">' + formatPrice(product.price) + '</p>' +
    '<p class="buybox__tier">' + escapeHtml(tier ? tier.name : '') + ' &middot; One-time purchase</p>' +
    '<ul class="buybox__facts">' +
    '<li>Instant access</li>' +
    '<li>Commercial license included</li>' +
    '<li>14-day refund policy</li>' +
    '<li>Applicable taxes are shown at checkout.</li>' +
    '</ul>';

  if (!hasCheckout(product)) return;

  const agreement = document.createElement('div');
  agreement.className = 'agreement';
  agreement.innerHTML =
    '<div class="agreement__row">' +
    '<input type="checkbox" id="agree-' + product.slug + '">' +
    '<label for="agree-' + product.slug + '">I agree to the ' +
    '<a href="/terms/">Terms of Service</a>, <a href="/license/">License</a>, and ' +
    '<a href="/refunds/">Refund Policy</a>.</label>' +
    '</div>' +
    '<p class="agreement__hint" id="agree-hint-' + product.slug + '">' +
    'Tick the box above to continue to checkout.</p>';

  const buyWrap = document.createElement('p');
  buyWrap.className = 'buybox__buy';

  const buy = document.createElement('a');
  buy.className = 'button button--ink button--block';
  buy.href = product.checkoutUrl;
  buy.textContent = 'Buy ' + product.name + ' — ' + formatPrice(product.price);
  buy.setAttribute('aria-describedby', 'agree-hint-' + product.slug);
  buyWrap.append(buy);

  const tax = document.createElement('p');
  tax.className = 'buybox__tax';
  tax.textContent = 'Applicable taxes are shown at checkout. You will be taken to our payment provider.';

  host.append(agreement, buyWrap, tax);

  const checkbox = agreement.querySelector('input');
  const hint = agreement.querySelector('.agreement__hint');

  const sync = () => {
    const ready = checkbox.checked;
    buy.setAttribute('aria-disabled', ready ? 'false' : 'true');
    buy.tabIndex = ready ? 0 : -1;
    hint.textContent = ready
      ? 'Thank you. The button is ready.'
      : 'Tick the box above to continue to checkout.';
  };

  // A link cannot be disabled, so the click is intercepted while the box is
  // unticked and focus is sent to the checkbox with the reason spoken.
  buy.addEventListener('click', (event) => {
    if (checkbox.checked) return;
    event.preventDefault();
    hint.textContent = 'Please agree to the Terms, License, and Refund Policy first.';
    checkbox.focus();
  });

  checkbox.addEventListener('change', sync);
  sync();
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
