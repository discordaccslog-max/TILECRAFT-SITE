/*
 * Tilecraft Digital — Studio service worker
 *
 * Makes the Studio work offline once it has loaded, and lets a browser
 * install it as an app.
 *
 * Shape of the cache:
 *   - The Studio's own shell is precached on install, so a first visit is
 *     enough to make the Studio available without a connection afterwards.
 *   - Navigations are network-first and fall back to the cached shell, so a
 *     deployed update is picked up as soon as there is a connection.
 *   - Everything else is cache-first and refreshed in the background, which
 *     keeps fonts and scripts instant.
 *   - Product modules, which arrive later under modules/, are cached the
 *     first time they are opened.
 *
 * This worker only ever caches this site's own files. Nothing is sent
 * anywhere, and no request is made to any other server.
 */

/*
 * BUILD is a hash of every file in the SHELL list below, written here by
 * tools/build.mjs. It matters more than it looks: a browser only installs a
 * new service worker when this file's own bytes change, and the precache is
 * only refilled on install. Without a stamp that moves when the site moves,
 * a returning visitor would be pinned to the version they first loaded and
 * would never receive a fix. Run `npm run build` after changing any file in
 * the list.
 */
const BUILD = '43ab4fa1ece90cca';

const VERSION = 'tilecraft-studio-' + BUILD;
const SHELL_CACHE = VERSION + '-shell';
const RUNTIME_CACHE = VERSION + '-runtime';

const SHELL = [
  '/studio/',
  '/studio/studio.css',
  '/studio/studio.js',
  '/studio/manifest.webmanifest',
  '/studio/modules/manifest.json',
  '/css/style.css',
  '/js/products.js',
  '/js/site-config.js',
  '/js/license.js',
  '/js/license-terms.js',
  '/js/certificate.js',
  '/js/qrcode.js',
  '/js/pdf.js',
  '/js/settings.js',
  '/js/storage.js',
  '/js/backup.js',
  '/js/download.js',
  '/js/riso.js',
  '/fonts/bricolage-grotesque-latin-var.woff2',
  '/fonts/hanken-grotesk-latin-var.woff2',
  '/fonts/space-mono-latin-400.woff2',
  '/fonts/space-mono-latin-700.woff2',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        // One missing file must not stop the whole install, so each is added
        // on its own and a failure is simply skipped.
        Promise.all(
          SHELL.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('tilecraft-studio-') && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: try the network, fall back to the cached Studio shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('/studio/');
          if (shell) return shell;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
              '<p style="font-family:system-ui;padding:2rem">This page is not available offline. ' +
              'Open the Studio once while connected and it will work offline afterwards.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Everything else: serve from cache, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
