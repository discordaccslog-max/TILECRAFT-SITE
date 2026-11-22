/*
 * Checkout.
 *
 * Shows the order, takes the name the licenses should be made out to,
 * and places it. Placing an order charges for it through
 * cart.PAYMENT.collect, then issues one license per line and sends the
 * buyer to the order page.
 *
 * No payment provider is wired in at the moment, so the charge step is
 * skipped and the order completes. Everything on either side of it is
 * the real thing: the licenses issued here are the licenses the Studio
 * unlocks from, and the certificates are the same ones. See PAYMENT in
 * js/cart.js for where a provider goes.
 *
 * The card fields are checked and then dropped. What is typed into them
 * never reaches placeOrder, the license record, the certificate, or
 * storage — see js/card-fields.js for why it is built that way.
 */

import * as cart from './cart.js';
import { formatPrice } from './products.js';
import { activate, generateCode, setLicensee } from './license.js';
import { cardFields } from './card-fields.js';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'class') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value);
    } else if (value != null) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

/* ------------------------------------------------------------------ *
 * Placing the order
 * ------------------------------------------------------------------ */

/**
 * Turn a cart into licenses.
 *
 * One order reference covers the whole order, and each line's license
 * code is derived from it, so the same order always produces the same
 * codes however many times this runs. That is what makes placing an
 * order safe to retry: a reload cannot issue a second set.
 *
 * @returns {Promise<{reference: string, codes: string[]}>}
 */
export async function placeOrder({ licensee = '' } = {}) {
  const order = cart.order();
  if (!order.count) throw new Error('There is nothing in your cart.');

  // Charge first. Without a provider this resolves immediately and the
  // order completes, which is what makes the shop work end to end.
  let reference = '';
  if (cart.PAYMENT.connected) {
    const result = await cart.PAYMENT.collect(order);
    reference = (result && result.reference) || '';
    if (!reference) throw new Error('The payment did not complete.');
  } else {
    reference = cart.newReference();
  }

  const codes = [];
  for (const line of order.lines) {
    const product = { slug: line.slug, code: null, name: line.name };
    // generateCode needs the catalog product; look it up through the
    // cart's own lines so the two cannot disagree.
    const full = cart.items().find((item) => item.slug === line.slug);
    if (!full) continue;

    const code = generateCode(full.product, { orderId: reference });
    const result = activate(code, {
      orderRef: reference,
      options: line.options.map((o) => o.id)
    });
    if (result.ok) {
      if (licensee) setLicensee(code, licensee);
      codes.push(code);
    }
  }

  cart.clear();
  return { reference, codes };
}

/* ------------------------------------------------------------------ *
 * The page
 * ------------------------------------------------------------------ */

function summarySection() {
  const { lines, count, total } = cart.summary();

  return el('div', { class: 'checkout__summary' }, [
    el('h2', { class: 'checkout__title', text: 'Your order' }),
    el('ul', { class: 'ordersummary' }, lines.map((line) =>
      el('li', { class: 'ordersummary__line' }, [
        el('div', {}, [
          el('p', { class: 'ordersummary__name', text: line.product.name }),
          line.options.length
            ? el('p', {
              class: 'ordersummary__extras',
              text: line.options.map((o) => o.name).join(' · ')
            })
            : null,
          line.quantity > 1
            ? el('p', { class: 'ordersummary__qty', text: line.quantity + ' × ' + formatPrice(line.unit) })
            : null
        ]),
        el('p', { class: 'ordersummary__total', text: formatPrice(line.total) })
      ])
    )),
    el('div', { class: 'cart-total' }, [
      el('p', { class: 'cart-total__label', text: count === 1 ? '1 item' : count + ' items' }),
      el('p', { class: 'cart-total__sum', text: formatPrice(total) }),
      el('p', { class: 'cart-total__tax', text: 'Applicable taxes are shown with the total above.' })
    ]),
    el('p', { class: 'checkout__back' }, [
      el('a', { href: '/cart/', text: 'Back to your cart' })
    ])
  ]);
}

function render(host) {
  host.textContent = '';

  if (cart.isEmpty()) {
    host.append(
      el('div', { class: 'cart-empty' }, [
        el('h2', { text: 'There is nothing to check out' }),
        el('p', { text: 'Your cart is empty, so there is no order to place.' }),
        el('p', {}, [
          el('a', { class: 'button', href: '/#collections', text: 'See the Collections' })
        ])
      ])
    );
    return;
  }

  const licensee = el('input', {
    type: 'text',
    id: 'checkout-licensee',
    name: 'licensee',
    autocomplete: 'organization',
    maxlength: '80',
    placeholder: 'Your name or business name'
  });

  const card = cardFields();

  const status = el('p', { class: 'checkout__status', role: 'status' });

  const place = el('button', {
    type: 'submit',
    class: 'button button--ink button--block',
    text: 'Place order'
  });

  const form = el('form', { class: 'checkout__form', novalidate: 'novalidate' }, [
    el('h2', { class: 'checkout__title', text: 'Who the license is for' }),
    el('div', { class: 'field' }, [
      el('label', { for: 'checkout-licensee', text: 'Name on the license (optional)' }),
      licensee,
      el('p', {
        class: 'field__hint',
        text:
          'Printed on your License Certificate. Leave it blank and the license is held by ' +
          'the purchaser of the order. You can add or change it later in the Studio.'
      })
    ]),
    card.node,
    place,
    status
  ]);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Check the card first. Nothing is read out of these fields beyond
    // this check, and they are cleared as soon as the order is placed.
    const problem = card.check();
    if (problem) {
      status.textContent = problem;
      status.className = 'checkout__status is-error';
      card.focusFirst();
      return;
    }

    place.disabled = true;
    status.textContent = 'Placing your order…';
    status.className = 'checkout__status is-busy';

    try {
      const { reference } = await placeOrder({ licensee: licensee.value.trim() });
      card.clear();
      window.location.href = cart.CHECKOUT.donePath + '?ref=' + encodeURIComponent(reference);
    } catch (error) {
      place.disabled = false;
      status.textContent = error.message || 'That did not go through. Please try again.';
      status.className = 'checkout__status is-error';
    }
  });

  host.append(summarySection(), form);
}

function start() {
  const host = document.querySelector('[data-checkout]');
  if (!host) return;
  render(host);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
