/*
 * Tilecraft Digital — purchase confirmation
 *
 * Runs on /thank-you/<slug>/. These pages are not linked anywhere on the
 * site, carry a noindex tag, and are left out of the sitemap. A buyer
 * arrives here from the payment provider.
 *
 * On load the page:
 *   1. reads any order reference the provider added to the URL,
 *   2. issues a license code — derived from the order reference when there
 *      is one, so the same order always produces the same code,
 *   3. activates it in this browser, with nothing to type,
 *   4. shows the license, and
 *   5. offers the certificate, the Studio, the activation link, and print.
 */

import { productBySlug, formatPrice } from './products.js';
import {
  activate,
  activationUrl,
  orderRefFromUrl,
  generateCode,
  formatIssued,
  listLicenses,
  setLicensee,
  storageIsPersistent
} from './license.js';
import { certificateBlob, certificateFilename } from './certificate.js';
import { downloadBlob, copyText } from './download.js';
import { prefersReducedMotion } from './settings.js';

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The license held on this device for exactly this product, if any. */
function existingLicenseFor(slug) {
  return listLicenses().find((record) => record.slug === slug) || null;
}

function issueLicense(product) {
  const orderRef = orderRefFromUrl(window.location.href);

  // An order reference always produces the same code for the same product,
  // so reloading this page, or opening it again later, issues nothing new.
  // Without one, any license already issued on this device is reused rather
  // than piling up a fresh code on every reload.
  const existing = existingLicenseFor(product.slug);
  const code = orderRef
    ? generateCode(product, { orderId: orderRef })
    : existing
      ? existing.code
      : generateCode(product);

  const result = activate(code, { orderRef: orderRef || undefined });
  return { result, orderRef };
}

function renderReceipt(license, host) {
  const rows = [
    ['Product', escapeHtml(license.productName)],
    ['License code', '<span class="code-display">' + escapeHtml(license.code) + '</span>'],
    ['Issued', escapeHtml(formatIssued(license.issuedAt))]
  ];
  if (license.orderRef) {
    rows.splice(1, 0, ['Order reference', '<span class="mono">' + escapeHtml(license.orderRef) + '</span>']);
  }
  if (license.licensee) {
    rows.push(['Licensed to', escapeHtml(license.licensee)]);
  }

  host.innerHTML = rows
    .map(([label, value]) => '<dt>' + label + '</dt><dd>' + value + '</dd>')
    .join('');
}

function start() {
  const root = document.querySelector('[data-thank-you]');
  if (!root) return;

  const product = productBySlug(root.dataset.thankYou);
  if (!product) return;

  const { result } = issueLicense(product);
  if (!result.ok || !result.license) return;

  let license = result.license;

  document.title = 'License issued — ' + product.name + ' — Tilecraft Digital';

  const nameSlot = root.querySelector('[data-product-name]');
  if (nameSlot) nameSlot.textContent = product.name;

  const priceSlot = root.querySelector('[data-product-price]');
  if (priceSlot) priceSlot.textContent = formatPrice(product.price);

  const receipt = root.querySelector('[data-receipt]');
  if (receipt) renderReceipt(license, receipt);

  const activation = activationUrl(license.code);
  const activationSlot = root.querySelector('[data-activation-link]');
  if (activationSlot) {
    activationSlot.textContent = activation;
    activationSlot.setAttribute('href', '/studio/#activate=' + encodeURIComponent(license.code));
  }

  /* ---- The sheet slides out of the tray and gets stamped ---- */

  // The sheet's resting state is "out of the tray and stamped". To play the
  // reveal it is pushed back into the tray for a moment and then released,
  // which means that if the animation never runs — a throttled tab, an
  // unsupported transition — the buyer simply sees the finished state.
  const sheet = root.querySelector('[data-sheet]');
  const stamp = root.querySelector('[data-stamp]');

  if (sheet && !prefersReducedMotion()) {
    sheet.dataset.printing = 'true';
    if (stamp) stamp.dataset.stamping = 'true';

    const release = () => {
      delete sheet.dataset.printing;
      if (stamp) {
        window.setTimeout(() => {
          delete stamp.dataset.stamping;
        }, 820);
      }
    };

    window.requestAnimationFrame(() => window.setTimeout(release, 120));
    // A safety net: whatever happens to the animation, the sheet is shown.
    window.setTimeout(release, 2500);
  }

  /* ---- Licensee name ---- */

  const nameField = root.querySelector('[data-licensee-input]');
  const nameForm = root.querySelector('[data-licensee-form]');
  const nameStatus = root.querySelector('[data-licensee-status]');

  if (nameForm && nameField) {
    nameField.value = license.licensee || '';
    nameForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const updated = setLicensee(license.code, nameField.value);
      if (updated) {
        license = updated;
        if (receipt) renderReceipt(license, receipt);
        if (nameStatus) {
          nameStatus.textContent = license.licensee
            ? 'Saved. Your certificate will show “' + license.licensee + '”.'
            : 'Cleared. Your certificate will not show a name.';
          nameStatus.className = 'status status--ok';
        }
      }
    });
  }

  /* ---- Actions ---- */

  const certificateButton = root.querySelector('[data-download-certificate]');
  if (certificateButton) {
    certificateButton.addEventListener('click', () => {
      downloadBlob(certificateBlob(license), certificateFilename(license));
    });
  }

  const copyButton = root.querySelector('[data-copy-activation]');
  const copyStatus = root.querySelector('[data-copy-status]');
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      const ok = await copyText(activation);
      if (!copyStatus) return;
      copyStatus.textContent = ok
        ? 'Activation link copied.'
        : 'Could not copy automatically. The link is shown above — copy it by hand.';
      copyStatus.className = ok ? 'status status--ok' : 'status status--error';
    });
  }

  const printButton = root.querySelector('[data-print]');
  if (printButton) printButton.addEventListener('click', () => window.print());

  /* ---- A warning only when this browser will not keep the license ---- */

  const storageWarning = root.querySelector('[data-storage-warning]');
  if (storageWarning) {
    if (storageIsPersistent()) storageWarning.remove();
    else storageWarning.hidden = false;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
