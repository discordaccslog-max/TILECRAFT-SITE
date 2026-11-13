/*
 * Tilecraft Digital — the Studio
 *
 * The Studio is the frame that product modules plug into. It owns the
 * sidebar, licenses, settings, backups, the walkthrough, and the offline
 * install; it owns no pattern content at all. Each product's content arrives
 * later as a module under /studio/modules/<slug>/, listed in
 * modules/manifest.json and loaded only when that product is opened.
 *
 * The module contract is written up in MODULES.md at the root of the
 * repository, including a complete worked example.
 */

import { PRODUCTS, productBySlug, productsByTier, TIERS, formatPrice } from '../js/products.js';
import { SITE, hasSupportEmail, supportEmail, supportMailto } from '../js/site-config.js';
import {
  activate,
  activationUrl,
  codeFromHash,
  listLicenses,
  licenseFor,
  removeLicense,
  unlockedSlugs,
  parseCode,
  reasonText,
  formatIssuedDate,
  storageIsPersistent
} from '../js/license.js';
import { certificateBlob, certificateFilename } from '../js/certificate.js';
import { downloadBlob, copyText } from '../js/download.js';
import {
  applySettings,
  getSettings,
  setSettings,
  isDark,
  cycleTheme,
  themeLabel,
  prefersReducedMotion
} from '../js/settings.js';
import { scopedStorage, storagePersisted, requestPersistentStorage, storageEstimate } from '../js/storage.js';
import { backupBlob, backupFilename, restoreFromFile } from '../js/backup.js';
import { palette } from '../js/riso.js';

const STUDIO_VERSION = '1.0.0';
const MANIFEST_URL = 'modules/manifest.json';

const state = {
  manifest: null,
  openSlug: null,
  mounted: null // { slug, cleanup }
};

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function el(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

const LOCK_ICON =
  '<svg class="product-button__lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="4.5" y="10.5" width="15" height="10" rx="1.5"/><path d="M8 10.5V7.4a4 4 0 0 1 8 0v3.1"/></svg>';

/** Short-lived message, announced to screen readers. */
function toast(message, tone = 'ok') {
  const host = $('[data-toasts]');
  if (!host) return;
  const node = el('div', { class: 'toast', 'data-tone': tone, role: 'status', text: message });
  host.append(node);
  window.setTimeout(() => node.remove(), tone === 'error' ? 7000 : 4200);
}

/* ------------------------------------------------------------------ *
 * The sidebar
 * ------------------------------------------------------------------ */

function renderSidebar() {
  const host = $('[data-sidebar]');
  if (!host) return;
  host.textContent = '';

  const unlocked = unlockedSlugs();

  for (const tier of ['collection', 'studio-edition']) {
    const products = productsByTier(tier);
    if (!products.length) continue;

    const group = el('div', { class: 'studio__group' });
    group.append(el('h2', { id: 'group-' + tier, text: TIERS[tier].name }));

    const list = el('ul', { class: 'studio__list', 'aria-labelledby': 'group-' + tier });

    for (const product of products) {
      // The bundle is a way to buy the five Collections, not a workspace of
      // its own, so it is not listed as something to open.
      if (product.grants && product.grants.length > 1) continue;

      const item = el('li');
      if (unlocked.has(product.slug)) {
        item.append(
          el(
            'button',
            {
              type: 'button',
              class: 'product-button',
              'data-slug': product.slug,
              'aria-current': state.openSlug === product.slug ? 'true' : 'false',
              onclick: () => openProduct(product.slug)
            },
            [
              el('span', { class: 'product-button__dot', 'aria-hidden': 'true' }),
              el('span', { class: 'product-button__name', text: product.name })
            ]
          )
        );
      } else {
        const link = el(
          'a',
          {
            class: 'product-button product-button--locked',
            href: '/products/' + product.slug + '/'
          },
          [
            el('span', { class: 'product-button__dot', 'aria-hidden': 'true' }),
            el('span', { class: 'product-button__name', text: product.name }),
            el('span', { class: 'visually-hidden', text: '— locked. Opens the product page.' })
          ]
        );
        link.insertAdjacentHTML('beforeend', LOCK_ICON);
        item.append(link);
      }
      list.append(item);
    }

    group.append(list);
    host.append(group);
  }

  const note = el('p', { class: 'sidebar-note' });
  if (unlocked.size === 0) {
    note.append('Nothing is activated on this device yet. ');
    note.append(el('a', { href: '/#collections', text: 'Browse the products' }));
    note.append('.');
  } else {
    note.append('Locked products open their page on the site. ');
    note.append(el('a', { href: '/#collections', text: 'See everything' }));
    note.append('.');
  }
  host.append(note);
}

/* ------------------------------------------------------------------ *
 * The workspace
 * ------------------------------------------------------------------ */

function clearWorkspace() {
  if (state.mounted && typeof state.mounted.cleanup === 'function') {
    try {
      state.mounted.cleanup();
    } catch (error) {
      console.error('A module failed while closing.', error);
    }
  }
  state.mounted = null;
  const host = $('[data-workspace]');
  if (host) host.textContent = '';
  return host;
}

function renderWelcome() {
  const host = clearWorkspace();
  if (!host) return;
  state.openSlug = null;

  const inner = el('div', { class: 'workspace-inner welcome' });

  inner.append(
    el('h1', { class: 'welcome__title', text: 'The Tilecraft Studio' }),
    el('p', {
      text:
        'This is where Tilecraft Digital products open. Everything runs in this browser: ' +
        'your licenses, your saved work, and any image you bring in all stay on this device ' +
        'and are never sent anywhere.'
    }),
    el('p', {
      text:
        'Nothing is activated on this device yet. Paste a license code below, or open the ' +
        'activation link on your certificate. Either one takes a moment and needs no account.'
    })
  );

  const panel = el('section', { class: 'activate-panel', 'aria-labelledby': 'activate-heading' });
  panel.append(
    el('h3', { id: 'activate-heading', text: 'Activate a license' }),
    el('p', {
      text:
        'Your license code is on your certificate and on your confirmation page. ' +
        'An activation link works too — paste the whole link and it will be read for you.'
    })
  );

  const form = el('form', { class: 'activate-form', novalidate: true });
  const fieldId = 'activate-code';
  form.append(
    el('label', { for: fieldId, class: 'visually-hidden', text: 'License code or activation link' }),
    el('div', { class: 'input-row' }, [
      el('input', {
        type: 'text',
        id: fieldId,
        name: 'code',
        placeholder: SITE.licensePrefix + '-XXXX-XXXXXX-XX',
        autocomplete: 'off',
        autocapitalize: 'characters',
        spellcheck: 'false',
        'aria-describedby': 'activate-status'
      }),
      el('button', { type: 'submit', class: 'button', text: 'Activate' })
    ]),
    el('p', { class: 'status', id: 'activate-status', role: 'status' })
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('#' + fieldId, form);
    const status = $('#activate-status', form);
    const outcome = activateInput(input.value);
    status.textContent = outcome.message;
    status.className = 'status ' + (outcome.ok ? 'status--ok' : 'status--error');
    if (outcome.ok) input.value = '';
  });

  panel.append(form);
  inner.append(panel);

  const browse = el('div', { class: 'browse-links' });
  browse.append(
    el('a', { class: 'button', href: '/#collections', text: 'Browse Collections' }),
    el('a', { class: 'button button--ghost', href: '/#studio-editions', text: 'Browse Studio Editions' }),
    el('a', { class: 'button button--ghost', href: '/faq/', text: 'Read the FAQ' })
  );
  inner.append(browse);

  host.append(inner);
  renderSidebar();
}

/** Activate a pasted code or activation link. */
function activateInput(raw) {
  const text = String(raw || '').trim();
  if (!text) return { ok: false, message: 'Enter a license code or an activation link.' };

  // An activation link carries the code in its fragment.
  let code = text;
  if (text.includes('#')) {
    const fromLink = codeFromHash(text.slice(text.indexOf('#')));
    if (fromLink) code = fromLink;
  }

  const parsed = parseCode(code);
  if (!parsed.valid) return { ok: false, message: reasonText(parsed.reason) };
  if (!parsed.known) return { ok: false, message: reasonText('unknown-product') };

  const result = activate(code);
  if (!result.ok) return { ok: false, message: reasonText(result.reason) };

  renderSidebar();
  renderLicenseList();

  if (result.already) {
    return { ok: true, message: result.license.productName + ' is already activated on this device.' };
  }
  return {
    ok: true,
    message: result.license.productName + ' is activated. It is in the sidebar now.'
  };
}

/* ------------------------------------------------------------------ *
 * Opening a product
 * ------------------------------------------------------------------ */

async function loadManifest() {
  if (state.manifest) return state.manifest;
  try {
    const response = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error('manifest ' + response.status);
    const data = await response.json();
    state.manifest = data && Array.isArray(data.modules) ? data : { version: 1, modules: [] };
  } catch {
    state.manifest = { version: 1, modules: [] };
  }
  return state.manifest;
}

function moduleEntryFor(manifest, slug) {
  return manifest.modules.find((entry) => entry && entry.slug === slug) || null;
}

/** The context object handed to every module's mount function. */
function buildContext(product, license) {
  const listeners = { theme: [], settings: [] };

  const onTheme = (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = () => callback({ isDark: isDark(), palette: palette() });
    document.addEventListener('tilecraft:themechange', handler);
    listeners.theme.push(() => document.removeEventListener('tilecraft:themechange', handler));
    return () => document.removeEventListener('tilecraft:themechange', handler);
  };

  const onSettings = (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (event) => callback(event.detail || getSettings());
    document.addEventListener('tilecraft:settingschange', handler);
    listeners.settings.push(() => document.removeEventListener('tilecraft:settingschange', handler));
    return () => document.removeEventListener('tilecraft:settingschange', handler);
  };

  const context = {
    studioVersion: STUDIO_VERSION,

    /* What the buyer owns. */
    product: { ...product },
    license: license ? { ...license } : null,

    /* Saved work, scoped to this product and kept in IndexedDB. */
    storage: scopedStorage(product.slug),

    /* Saving files. */
    files: {
      downloadBlob,
      downloadBytes: (bytes, name, type) => downloadBlob(new Blob([bytes], { type }), name),
      downloadText: (text, name, type) =>
        downloadBlob(new Blob([text], { type: type || 'text/plain;charset=utf-8' }), name),
      downloadJson: (value, name) =>
        downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), name),
      downloadCanvas: (canvas, name) =>
        new Promise((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) downloadBlob(blob, name);
            resolve(!!blob);
          }, 'image/png');
        }),
      copyText
    },

    /* The current look. */
    theme: {
      get isDark() {
        return isDark();
      },
      palette,
      onChange: onTheme
    },

    /* The Studio's settings. */
    settings: {
      get: getSettings,
      onChange: onSettings
    },

    /* Talking to the person using the Studio. */
    ui: {
      toast,
      setStatus(message) {
        const slot = $('[data-module-status]');
        if (slot) slot.textContent = message || '';
      },
      prefersReducedMotion
    },

    /* Called by the Studio when the module is closed. */
    release() {
      for (const group of Object.values(listeners)) {
        for (const off of group) off();
        group.length = 0;
      }
    }
  };

  return context;
}

async function openProduct(slug) {
  const product = productBySlug(slug);
  if (!product) return;

  const license = licenseFor(slug);
  if (!license) {
    renderLocked(product);
    return;
  }

  state.openSlug = slug;
  setSettings({ lastModule: slug });
  updateHash(slug);
  renderSidebar();

  const host = clearWorkspace();
  if (!host) return;

  const inner = el('div', { class: 'workspace-inner' });
  const head = el('div', { class: 'module-head' }, [
    el('h1', { text: product.name }),
    el('p', {
      class: 'module-head__meta',
      'data-module-status': true,
      text: 'Licensed · ' + license.code
    })
  ]);
  const mountPoint = el('div', { class: 'module-host' });
  inner.append(head, mountPoint);
  host.append(inner);
  host.scrollTop = 0;

  const manifest = await loadManifest();
  const entry = moduleEntryFor(manifest, slug);

  if (!entry) {
    // Every product has a workspace, so a missing entry means the manifest
    // did not load or is wrong — a fault to report and retry, not a state
    // the buyer is supposed to wait out.
    console.error('No module entry for ' + slug + ' in the manifest.');
    renderModuleError(mountPoint, product);
    return;
  }

  let moduleNamespace;
  try {
    moduleNamespace = await import(/* @vite-ignore */ new URL(entry.entry, import.meta.url).href);
  } catch (error) {
    console.error('The module for ' + slug + ' could not be loaded.', error);
    renderModuleError(mountPoint, product);
    return;
  }

  const mount = moduleNamespace && (moduleNamespace.mount || (moduleNamespace.default && moduleNamespace.default.mount));
  if (typeof mount !== 'function') {
    renderModuleError(mountPoint, product);
    return;
  }

  const context = buildContext(product, license);
  let result;
  try {
    result = await mount(mountPoint, context);
  } catch (error) {
    console.error('The module for ' + slug + ' failed while starting.', error);
    renderModuleError(mountPoint, product);
    context.release();
    return;
  }

  state.mounted = {
    slug,
    cleanup() {
      try {
        if (typeof result === 'function') result();
        else if (result && typeof result.destroy === 'function') result.destroy();
      } finally {
        context.release();
      }
    }
  };
}

function renderModuleError(host, product) {
  host.append(
    el('div', { class: 'notice' }, [
      el('h2', { text: 'This workspace could not be opened' }),
      el('p', {
        text:
          'The workspace for ' + product.name + ' is installed but did not start. Reloading the ' +
          'page is usually enough. Your license and your saved work are untouched.'
      }),
      el('p', {}, [
        el('button', {
          type: 'button',
          class: 'button button--small',
          text: 'Reload the Studio',
          onclick: () => window.location.reload()
        })
      ])
    ])
  );
}

function renderLocked(product) {
  const host = clearWorkspace();
  if (!host) return;
  state.openSlug = null;
  renderSidebar();

  const inner = el('div', { class: 'workspace-inner' });
  inner.append(
    el('div', { class: 'notice notice--locked' }, [
      el('h2', { text: product.name + ' is not activated on this device' }),
      el('p', {
        text:
          'Activate it with your license code or your certificate’s activation link, or read ' +
          'what it includes on its page.'
      }),
      el('p', {}, [
        el('a', {
          class: 'button button--small',
          href: '/products/' + product.slug + '/',
          text: product.name + ' — ' + formatPrice(product.price)
        })
      ])
    ])
  );
  host.append(inner);
}

/* ------------------------------------------------------------------ *
 * Routing
 *
 * The activation code lives in the fragment, which browsers never send to
 * the web server, and it is taken out of the address bar as soon as it has
 * been read.
 * ------------------------------------------------------------------ */

function updateHash(slug) {
  const next = slug ? '#open=' + encodeURIComponent(slug) : '';
  if (window.location.hash !== next) {
    history.replaceState(null, '', window.location.pathname + window.location.search + next);
  }
}

function stripHash() {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

function routeFromHash() {
  const hash = window.location.hash;

  const code = codeFromHash(hash);
  if (code) {
    const result = activate(code);
    stripHash();
    renderSidebar();
    renderLicenseList();
    if (result.ok) {
      toast(
        result.already
          ? result.license.productName + ' was already activated here.'
          : result.license.productName + ' is now activated on this device.'
      );
      openProduct((result.license.grants && result.license.grants[0]) || result.license.slug);
      return;
    }
    toast(reasonText(result.reason), 'error');
  }

  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const open = params.get('open');
  if (open && productBySlug(open)) {
    openProduct(open);
    return;
  }

  showDefaultView();
}

function showDefaultView() {
  const unlocked = unlockedSlugs();
  if (!unlocked.size) {
    renderWelcome();
    return;
  }
  const { lastModule } = getSettings();
  if (lastModule && unlocked.has(lastModule)) {
    openProduct(lastModule);
    return;
  }
  const first = PRODUCTS.find((product) => unlocked.has(product.slug) && !(product.grants && product.grants.length > 1));
  if (first) openProduct(first.slug);
  else renderWelcome();
}

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

function renderLicenseList() {
  const host = $('[data-license-list]');
  if (!host) return;
  host.textContent = '';

  const licenses = listLicenses();
  if (!licenses.length) {
    host.append(
      el('p', {
        class: 'empty-note',
        text: 'No licenses are held on this device yet.'
      })
    );
    return;
  }

  const list = el('ul', { class: 'license-list' });

  for (const license of licenses) {
    const card = el('div', { class: 'license-card' });
    card.append(
      el('p', { class: 'license-card__name', text: license.productName }),
      el('p', { class: 'license-card__code', text: license.code })
    );

    const bits = ['Issued ' + formatIssuedDate(license.issuedAt)];
    if (license.orderRef) bits.push('Order ' + license.orderRef);
    if (license.licensee) bits.push('Licensed to ' + license.licensee);
    if (license.grants && license.grants.length > 1) bits.push('Unlocks ' + license.grants.length + ' Collections');
    card.append(el('p', { class: 'license-card__meta', text: bits.join(' · ') }));

    const actions = el('div', { class: 'license-card__actions' });

    actions.append(
      el('button', {
        type: 'button',
        text: 'Download certificate',
        onclick: () => {
          downloadBlob(certificateBlob(license), certificateFilename(license));
          toast('Certificate downloaded.');
        }
      }),
      el('button', {
        type: 'button',
        text: 'Copy activation link',
        onclick: async () => {
          const ok = await copyText(activationUrl(license.code));
          toast(ok ? 'Activation link copied.' : 'Could not copy. Open the certificate instead.', ok ? 'ok' : 'error');
        }
      }),
      el('button', {
        type: 'button',
        class: 'is-danger',
        text: 'Remove from this device',
        onclick: () => {
          const confirmed = window.confirm(
            'Remove ' + license.productName + ' from this device?\n\n' +
              'The license itself is not canceled. You can activate it here again with the same ' +
              'code or activation link, which are on your certificate. Saved work for this product ' +
              'stays on the device.'
          );
          if (!confirmed) return;
          removeLicense(license.code);
          renderLicenseList();
          renderSidebar();
          if (state.openSlug && !unlockedSlugs().has(state.openSlug)) showDefaultView();
          toast(license.productName + ' was removed from this device.');
        }
      })
    );

    card.append(actions);
    list.append(el('li', {}, [card]));
  }

  host.append(list);
}

function setUpSegmented(root, value, onChange) {
  const sync = (next) => {
    for (const button of $$('button', root)) {
      button.setAttribute('aria-pressed', button.dataset.value === next ? 'true' : 'false');
    }
  };
  for (const button of $$('button', root)) {
    button.addEventListener('click', () => {
      sync(button.dataset.value);
      onChange(button.dataset.value);
    });
  }
  sync(value);
  return sync;
}

async function renderStorageState() {
  const slot = $('[data-storage-state]');
  if (!slot) return;

  const parts = [];
  parts.push(
    storageIsPersistent()
      ? 'Licenses are being kept in this browser.'
      : 'This browser is not keeping site data, so licenses may not survive closing the tab. Download a backup.'
  );

  const persisted = await storagePersisted();
  parts.push(
    persisted
      ? 'Storage is marked as persistent, so the browser will not clear it to reclaim space.'
      : 'Storage is not marked as persistent, so the browser may clear it to reclaim space.'
  );

  const estimate = await storageEstimate();
  if (estimate && estimate.usage != null && estimate.quota) {
    const used = (estimate.usage / 1048576).toFixed(1);
    const quota = (estimate.quota / 1048576).toFixed(0);
    parts.push('Using about ' + used + ' MB of roughly ' + quota + ' MB available.');
  }

  slot.textContent = parts.join(' ');
}

function setUpSettingsDialog() {
  const dialog = $('[data-settings-dialog]');
  const openButton = $('[data-open-settings]');
  const closeButton = $('[data-close-settings]');
  if (!dialog || !openButton) return;

  openButton.addEventListener('click', () => {
    renderLicenseList();
    renderStorageState();
    dialog.showModal();
  });

  if (closeButton) closeButton.addEventListener('click', () => dialog.close());

  // Clicking the backdrop closes the dialog.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  const settings = getSettings();

  const themeGroup = $('[data-setting-theme]', dialog);
  if (themeGroup) {
    setUpSegmented(themeGroup, settings.theme, (value) => setSettings({ theme: value }));
  }

  const scaleGroup = $('[data-setting-scale]', dialog);
  if (scaleGroup) {
    setUpSegmented(scaleGroup, settings.scale, (value) => setSettings({ scale: value }));
  }

  const motionGroup = $('[data-setting-motion]', dialog);
  if (motionGroup) {
    setUpSegmented(motionGroup, settings.reducedMotion, (value) => setSettings({ reducedMotion: value }));
  }

  const persistButton = $('[data-request-persist]', dialog);
  if (persistButton) {
    persistButton.addEventListener('click', async () => {
      const granted = await requestPersistentStorage();
      toast(
        granted
          ? 'This browser will keep your Studio data.'
          : 'This browser did not agree to keep the data. Download a backup instead.',
        granted ? 'ok' : 'error'
      );
      renderStorageState();
    });
  }

  const exportButton = $('[data-export-backup]', dialog);
  if (exportButton) {
    exportButton.addEventListener('click', async () => {
      try {
        downloadBlob(await backupBlob(), backupFilename());
        toast('Backup downloaded.');
      } catch {
        toast('The backup could not be built.', 'error');
      }
    });
  }

  const importInput = $('[data-import-backup]', dialog);
  if (importInput) {
    importInput.addEventListener('change', async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      const result = await restoreFromFile(file);
      importInput.value = '';
      if (!result.ok) {
        toast(result.reason, 'error');
        return;
      }
      renderSidebar();
      renderLicenseList();
      toast(
        'Restored. ' +
          result.licenses +
          (result.licenses === 1 ? ' license added, ' : ' licenses added, ') +
          result.work +
          (result.work === 1 ? ' saved item restored.' : ' saved items restored.')
      );
    });
  }

  const walkthroughButton = $('[data-replay-walkthrough]', dialog);
  if (walkthroughButton) {
    walkthroughButton.addEventListener('click', () => {
      dialog.close();
      startWalkthrough(true);
    });
  }

  const activateForm = $('[data-settings-activate]', dialog);
  if (activateForm) {
    activateForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('input', activateForm);
      const status = $('[data-settings-activate-status]', dialog);
      const outcome = activateInput(input.value);
      if (status) {
        status.textContent = outcome.message;
        status.className = 'status ' + (outcome.ok ? 'status--ok' : 'status--error');
      }
      if (outcome.ok) input.value = '';
    });
  }
}

/* ------------------------------------------------------------------ *
 * Support link — only rendered once an address is configured
 * ------------------------------------------------------------------ */

function renderSupport() {
  for (const slot of $$('[data-support-slot]')) {
    if (!hasSupportEmail()) {
      slot.remove();
      continue;
    }
    slot.textContent = '';
    slot.append(
      el('a', {
        href: supportMailto('Tilecraft Studio — a problem'),
        text: 'Report a problem'
      }),
      document.createTextNode(' (' + supportEmail() + ')')
    );
    slot.hidden = false;
  }
}

/* ------------------------------------------------------------------ *
 * Walkthrough
 * ------------------------------------------------------------------ */

const WALKTHROUGH = [
  {
    title: 'Everything happens on this device',
    body:
      'Your licenses, your saved work, and any image you bring in stay in this browser. ' +
      'Nothing is uploaded, and no account is needed. The other side of that is that we ' +
      'cannot recover any of it for you, so take a backup now and then.'
  },
  {
    title: 'The sidebar is your catalog',
    body:
      'Products you have activated open in the workspace. The rest show a lock and link to ' +
      'their page on the site, so you can always see what a product does before buying it.'
  },
  {
    title: 'Settings holds your licenses',
    body:
      'Open Settings to see every license on this device, download a certificate again, copy ' +
      'an activation link for another device, or export a backup of everything at once.'
  },
  {
    title: 'It works offline',
    body:
      'Once the Studio has loaded, it keeps working without a connection, and it can be ' +
      'installed from your browser like an app. Your work is already on the device, so there ' +
      'is nothing to sync.'
  }
];

function startWalkthrough(force = false) {
  const dialog = $('[data-walkthrough]');
  if (!dialog) return;
  if (!force && getSettings().walkthroughSeen) return;

  let index = 0;

  const body = $('[data-walkthrough-body]', dialog);
  const stepLabel = $('[data-walkthrough-step]', dialog);
  const title = $('[data-walkthrough-title]', dialog);
  const dots = $('[data-walkthrough-dots]', dialog);
  const next = $('[data-walkthrough-next]', dialog);

  dots.textContent = '';
  for (let i = 0; i < WALKTHROUGH.length; i++) dots.append(el('span', { 'data-active': 'false' }));

  const paint = () => {
    const step = WALKTHROUGH[index];
    stepLabel.textContent = 'Step ' + (index + 1) + ' of ' + WALKTHROUGH.length;
    title.textContent = step.title;
    body.textContent = step.body;
    [...dots.children].forEach((dot, i) => dot.setAttribute('data-active', i === index ? 'true' : 'false'));
    next.textContent = index === WALKTHROUGH.length - 1 ? 'Start using the Studio' : 'Next';
  };

  const finish = () => {
    setSettings({ walkthroughSeen: true });
    if (dialog.open) dialog.close();
  };

  next.onclick = () => {
    if (index === WALKTHROUGH.length - 1) finish();
    else {
      index++;
      paint();
    }
  };

  const skip = $('[data-walkthrough-skip]', dialog);
  if (skip) skip.onclick = finish;

  dialog.addEventListener('close', () => setSettings({ walkthroughSeen: true }), { once: true });

  paint();
  dialog.showModal();
}

/* ------------------------------------------------------------------ *
 * Theme control in the bar
 * ------------------------------------------------------------------ */

function setUpThemeButton() {
  const button = $('[data-studio-theme]');
  if (!button) return;
  const label = $('[data-studio-theme-label]', button);

  const paint = () => {
    const theme = getSettings().theme;
    if (label) label.textContent = themeLabel(theme);
    button.setAttribute('aria-label', 'Change color theme. Currently: ' + themeLabel(theme));
  };

  button.addEventListener('click', () => {
    cycleTheme();
    paint();
  });

  document.addEventListener('tilecraft:settingschange', paint);
  paint();
}

/* ------------------------------------------------------------------ *
 * Offline install
 * ------------------------------------------------------------------ */

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch((error) => {
      console.warn('Offline support is unavailable.', error);
    });
  });
}

/* ------------------------------------------------------------------ *
 * Start
 * ------------------------------------------------------------------ */

function start() {
  applySettings();
  setUpThemeButton();
  setUpSettingsDialog();
  renderSupport();
  renderSidebar();
  routeFromHash();
  registerServiceWorker();

  window.addEventListener('hashchange', routeFromHash);

  // A second tab may activate or remove a license; keep this one in step.
  window.addEventListener('storage', (event) => {
    if (event.key && event.key.startsWith('tilecraft:')) {
      renderSidebar();
      renderLicenseList();
    }
  });

  if (!getSettings().walkthroughSeen) {
    window.setTimeout(() => startWalkthrough(), 400);
  }

  const version = $('[data-studio-version]');
  if (version) version.textContent = STUDIO_VERSION;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
