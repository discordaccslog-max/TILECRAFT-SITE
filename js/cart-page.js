/*
 * The cart page.
 *
 * Lists what is in the cart, lets it be changed, and stops at the point
 * where a checkout would take over. That hand-off is the one part of
 * this flow that does not exist yet, and the page says so plainly rather
 * than offering a button that would go nowhere.
 *
 * See js/cart.js — CHECKOUT — for what connecting one involves.
 */

import * as cart from './cart.js';
import { formatPrice } from './products.js';

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
 * One line
 * ------------------------------------------------------------------ */

function lineRow(line, refresh) {
  const extras = line.options.length
    ? el('ul', { class: 'cartline__extras' },
      line.options.map((option) =>
        el('li', { text: option.name + ' (+' + formatPrice(option.price) + ')' })
      ))
    : null;

  const quantity = el('input', {
    type: 'number',
    min: '0',
    max: '99',
    step: '1',
    value: String(line.quantity),
    class: 'cartline__qty',
    'aria-label': 'Quantity of ' + line.product.name
  });

  quantity.addEventListener('change', () => {
    cart.setQuantity(line.key, quantity.value);
    refresh();
  });

  return el('li', { class: 'cartline' }, [
    el('div', { class: 'cartline__main' }, [
      el('h2', { class: 'cartline__name' }, [
        el('a', { href: '/products/' + line.slug + '/', text: line.product.name })
      ]),
      el('p', { class: 'cartline__short', text: line.product.short }),
      extras,
      el('p', { class: 'cartline__unit', text: formatPrice(line.unit) + ' each' })
    ]),
    el('div', { class: 'cartline__side' }, [
      quantity,
      el('p', { class: 'cartline__total', text: formatPrice(line.total) }),
      el('button', {
        type: 'button',
        class: 'link-button',
        text: 'Remove',
        onclick: () => {
          cart.remove(line.key);
          refresh();
        }
      })
    ])
  ]);
}

/* ------------------------------------------------------------------ *
 * The checkout hand-off
 * ------------------------------------------------------------------ */

/**
 * What sits where a checkout button will go.
 *
 * While no checkout is connected this is a plain statement of fact, not
 * a disabled button: there is nothing to press yet, and pretending
 * otherwise would be worse than saying so.
 */
function checkoutSection(refresh) {
  const agreement = el('div', { class: 'agreement' }, [
    el('div', { class: 'agreement__row' }, [
      el('input', { type: 'checkbox', id: 'cart-agree' }),
      el('label', {
        for: 'cart-agree',
        html:
          'I agree to the <a href="/terms/">Terms of Service</a>, ' +
          '<a href="/license/">License</a>, and <a href="/refunds/">Refund Policy</a>.'
      })
    ]),
    el('p', { class: 'agreement__hint', id: 'cart-agree-hint' })
  ]);

  const hint = agreement.querySelector('#cart-agree-hint');
  const checkbox = agreement.querySelector('input');

  if (!cart.CHECKOUT.ready) {
    /*
     * No checkout exists yet. The cart is kept, so whatever is in it
     * will still be here once one does.
     */
    return el('div', { class: 'checkout checkout--pending' }, [
      el('h2', { class: 'checkout__title', text: 'Checkout is not connected yet' }),
      el('p', {
        text:
          'Payment is not set up on this site yet, so there is nothing to pay with from here. ' +
          'Your cart is saved in this browser and will still be here when it is.'
      }),
      el('p', {
        class: 'checkout__aside',
        text:
          'Everything else works: the Studio, activation, and the License Certificate. ' +
          'If you already have a license code, you can activate it in the Studio.'
      }),
      el('p', {}, [
        el('a', { class: 'button', href: '/studio/', text: 'Open the Studio' })
      ])
    ]);
  }

  // A checkout exists: agree, then go.
  const go = el('a', {
    class: 'button button--ink button--block',
    href: cart.CHECKOUT.path,
    text: 'Continue to checkout',
    'aria-describedby': 'cart-agree-hint'
  });

  const sync = () => {
    const ready = checkbox.checked;
    go.setAttribute('aria-disabled', ready ? 'false' : 'true');
    go.tabIndex = ready ? 0 : -1;
    hint.textContent = ready
      ? 'Thank you. You can continue.'
      : 'Tick the box above to continue to checkout.';
  };

  go.addEventListener('click', (event) => {
    if (checkbox.checked) return;
    event.preventDefault();
    hint.textContent = 'Please agree to the Terms, License, and Refund Policy first.';
    checkbox.focus();
  });

  checkbox.addEventListener('change', sync);
  sync();

  return el('div', { class: 'checkout' }, [agreement, go]);
}

/* ------------------------------------------------------------------ *
 * The page
 * ------------------------------------------------------------------ */

function render(host) {
  const { lines, count, total } = cart.summary();
  host.textContent = '';

  if (!count) {
    host.append(
      el('div', { class: 'cart-empty' }, [
        el('h2', { text: 'Your cart is empty' }),
        el('p', { text: 'Add a Collection, a Studio Edition, or a bundle and it will appear here.' }),
        el('p', {}, [
          el('a', { class: 'button', href: '/#collections', text: 'See the Collections' })
        ])
      ])
    );
    return;
  }

  const refresh = () => render(host);

  host.append(
    el('ul', { class: 'cartlines' }, lines.map((line) => lineRow(line, refresh))),
    el('div', { class: 'cart-total' }, [
      el('p', { class: 'cart-total__label', text: count === 1 ? '1 item' : count + ' items' }),
      el('p', { class: 'cart-total__sum', text: formatPrice(total) }),
      el('p', { class: 'cart-total__tax', text: 'Applicable taxes are shown at checkout.' })
    ]),
    checkoutSection(refresh),
    el('p', { class: 'cart-clear' }, [
      el('button', {
        type: 'button',
        class: 'link-button',
        text: 'Empty the cart',
        onclick: () => {
          cart.clear();
          refresh();
        }
      })
    ])
  );
}

function start() {
  const host = document.querySelector('[data-cart]');
  if (!host) return;
  render(host);

  // Another tab may change the cart; this one keeps up.
  window.addEventListener('storage', (event) => {
    if (event.key === 'tilecraft:cart') render(host);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
