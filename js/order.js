/*
 * The order page.
 *
 * What a buyer lands on once an order is placed: every license in it,
 * each with its code, its certificate, and a link that activates it on
 * another device.
 *
 * An order can hold several products, which is why this exists rather
 * than the per-product confirmation pages being enough on their own.
 * Those still work and are what a payment provider would redirect to
 * for a single item.
 *
 * The licenses are read from this browser, filtered by the order
 * reference in the address. Nothing is fetched: the licenses were
 * issued here when the order was placed.
 */

import { listLicenses, activationUrl, formatIssued } from './license.js';
import { certificateBlob, certificateFilename } from './certificate.js';
import { downloadBlob, copyText } from './download.js';
import { productBySlug, chosenOptions } from './products.js';

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

function referenceFromUrl() {
  try {
    return new URL(window.location.href).searchParams.get('ref') || '';
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ *
 * One license
 * ------------------------------------------------------------------ */

function licenseCard(license) {
  const product = productBySlug(license.slug);
  const extras = chosenOptions(product, license.options);
  const activation = activationUrl(license.code);

  const copyButton = el('button', {
    type: 'button',
    class: 'button button--small',
    text: 'Copy activation link',
    onclick: async () => {
      const ok = await copyText(activation);
      copyButton.textContent = ok ? 'Link copied' : 'Press Ctrl+C to copy';
      window.setTimeout(() => {
        copyButton.textContent = 'Copy activation link';
      }, 2400);
    }
  });

  return el('li', { class: 'orderitem' }, [
    el('h2', { class: 'orderitem__name', text: license.productName }),
    extras.length
      ? el('p', { class: 'orderitem__extras', text: 'With ' + extras.map((o) => o.name).join(', ') })
      : null,
    el('p', { class: 'orderitem__code' }, [
      el('span', { class: 'code-display', text: license.code })
    ]),
    el('p', { class: 'orderitem__meta', text: 'Issued ' + formatIssued(license.issuedAt) }),
    el('div', { class: 'orderitem__actions' }, [
      el('button', {
        type: 'button',
        class: 'button button--small',
        text: 'Download certificate',
        onclick: () => downloadBlob(certificateBlob(license), certificateFilename(license))
      }),
      copyButton
    ])
  ]);
}

/* ------------------------------------------------------------------ *
 * The page
 * ------------------------------------------------------------------ */

function render(host) {
  const reference = referenceFromUrl();
  const licenses = listLicenses().filter(
    (record) => reference && record.orderRef === reference
  );

  host.textContent = '';

  if (!licenses.length) {
    /*
     * Either there is no reference in the address, or this browser is
     * not the one the order was placed in. Licenses live on the device
     * they were issued on, so there is nothing to show here — but the
     * Studio holds whatever this browser does have.
     */
    host.append(
      el('div', { class: 'cart-empty' }, [
        el('h2', { text: 'No order to show' }),
        el('p', {
          text:
            reference
              ? 'This browser has no licenses for order ' + reference + '. Licenses are held on ' +
                'the device the order was placed on, so try the one you ordered from.'
              : 'There is no order reference in this address.'
        }),
        el('p', {
          text: 'If you have a license code or an activation link, you can use it in the Studio.'
        }),
        el('p', {}, [
          el('a', { class: 'button', href: '/studio/', text: 'Open the Studio' })
        ])
      ])
    );
    return;
  }

  host.append(
    el('div', { class: 'orderhead' }, [
      el('h2', { class: 'orderhead__title', text: 'Thank you. Your order is complete.' }),
      el('p', {
        text:
          licenses.length === 1
            ? 'One license was issued and is already active in this browser.'
            : licenses.length + ' licenses were issued and are already active in this browser.'
      }),
      el('p', { class: 'orderhead__ref' }, [
        'Order reference ',
        el('span', { class: 'mono', text: reference })
      ])
    ]),

    el('ul', { class: 'orderitems' }, licenses.map(licenseCard)),

    el('div', { class: 'ordernext' }, [
      el('h2', { text: 'What to do next' }),
      el('ul', { class: 'terms-plain' }, [
        el('li', { text: 'Everything you bought is already unlocked in the Studio on this device.' }),
        el('li', { text: 'Download each certificate and keep it. It carries your license code and a link that activates it elsewhere.' }),
        el('li', { text: 'To use another device, open its activation link there or scan the QR code on the certificate.' }),
        el('li', { text: 'Licenses live in this browser. Take a backup from the Studio’s settings so clearing your data does not lose them.' })
      ]),
      el('p', {}, [
        el('a', { class: 'button button--ink', href: '/studio/', text: 'Open the Studio' })
      ])
    ])
  );
}

function start() {
  const host = document.querySelector('[data-order]');
  if (!host) return;
  render(host);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
