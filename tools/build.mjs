/*
 * Tilecraft Digital — page builder
 *
 *   node tools/build.mjs
 *
 * Writes every HTML page, the sitemap, and robots.txt from the catalog in
 * js/products.js, the configuration in js/site-config.js, the license terms
 * in js/license-terms.js, and the page content under tools/content/.
 *
 * The generated HTML is committed to the repository and is what GitHub Pages
 * serves. Nothing is built at request time.
 *
 * What a page's HTML actually contains:
 *   - Prose pages carry their full text, so they read with scripting off.
 *   - Product pages and confirmation pages carry only their metadata and a
 *     slug. Their visible content is rendered in the browser from
 *     js/products.js, which is what makes that file the single place to
 *     change the catalog. Re-running this build refreshes the titles,
 *     descriptions, and sitemap to match.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import { SITE } from '../js/site-config.js';
import { PRODUCTS } from '../js/products.js';
import { document_, pageHead, prose, ORIGIN } from './layout.mjs';
import { POLICY_PAGES } from './content/policies.mjs';
import { CONTENT_PAGES, productPage, thankYouPage } from './content/pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let written = 0;

/** Write a file, making its directory first. */
function writeFile(relativePath, contents) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  written++;
}

/** Turn a page definition into a file path. */
function filePathFor(urlPath) {
  if (urlPath.endsWith('.html')) return urlPath.replace(/^\//, '');
  const trimmed = urlPath.replace(/^\//, '').replace(/\/$/, '');
  return trimmed ? trimmed + '/index.html' : 'index.html';
}

/**
 * Build one page. A page either supplies `raw` (its own complete body) or
 * `body` (prose, which is wrapped in the standard head and column).
 */
function buildPage(page) {
  const body =
    page.raw !== undefined
      ? page.raw
      : [
          pageHead({
            eyebrow: page.eyebrow,
            title: page.title,
            lede: page.lede,
            updated: page.updated
          }),
          prose(page.body)
        ].join('\n\n');

  const html = document_({
    title: page.title,
    description: page.description,
    path: page.path,
    body,
    scripts: page.scripts || [],
    styles: page.styles || [],
    noindex: !!page.noindex,
    bodyClass: page.bodyClass || '',
    ogTitle: page.ogTitle
  });

  writeFile(filePathFor(page.path), html);
  return page;
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

const allPages = [
  ...CONTENT_PAGES,
  ...POLICY_PAGES,
  ...PRODUCTS.map(productPage),
  ...PRODUCTS.map(thankYouPage)
];

for (const page of allPages) buildPage(page);

/* ------------------------------------------------------------------ *
 * Sitemap — public pages only
 *
 * Confirmation pages and the 404 are left out, because they are noindex and
 * are not part of the public site.
 * ------------------------------------------------------------------ */

const today = new Date().toISOString().slice(0, 10);

const sitemapPaths = allPages
  .filter((page) => !page.noindex)
  .map((page) => page.path)
  .concat(['/studio/'])
  .filter((value, index, array) => array.indexOf(value) === index)
  .sort((a, b) => a.localeCompare(b));

const priorityFor = (urlPath) => {
  if (urlPath === '/') return '1.0';
  if (urlPath.startsWith('/products/')) return '0.9';
  if (urlPath === '/license/' || urlPath === '/studio/' || urlPath === '/faq/') return '0.7';
  return '0.5';
};

const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemapPaths
    .map(
      (urlPath) =>
        '  <url>\n' +
        '    <loc>' + ORIGIN + urlPath + '</loc>\n' +
        '    <lastmod>' + today + '</lastmod>\n' +
        '    <priority>' + priorityFor(urlPath) + '</priority>\n' +
        '  </url>'
    )
    .join('\n') +
  '\n</urlset>\n';

writeFile('sitemap.xml', sitemap);

/* ------------------------------------------------------------------ *
 * robots.txt
 * ------------------------------------------------------------------ */

const robots = `# ${SITE.name}
# Confirmation pages are private to the buyer who reaches them from the
# payment provider. They are not linked anywhere and carry a noindex tag.

User-agent: *
Allow: /
Disallow: /thank-you/

Sitemap: ${ORIGIN}/sitemap.xml
`;

writeFile('robots.txt', robots);

/* ------------------------------------------------------------------ *
 * CNAME, so GitHub Pages serves the custom domain
 * ------------------------------------------------------------------ */

writeFile('CNAME', SITE.domain + '\n');

/* ------------------------------------------------------------------ *
 * .nojekyll, so GitHub Pages serves every file as-is
 * ------------------------------------------------------------------ */

writeFile('.nojekyll', '');

/* ------------------------------------------------------------------ *
 * Stamp the service worker
 *
 * A browser installs a new service worker only when sw.js itself changes,
 * and the Studio's precache is only refilled on install. So the worker
 * carries a hash of everything it precaches: change any of those files and
 * the worker changes with them, which is what makes a deployed fix actually
 * reach someone who has used the Studio before.
 * ------------------------------------------------------------------ */

const workerPath = path.join(root, 'studio', 'sw.js');
let worker = fs.readFileSync(workerPath, 'utf8');

const shellList = /const SHELL = \[([\s\S]*?)\];/.exec(worker);
if (!shellList) throw new Error('build: could not find the SHELL list in studio/sw.js');

const shellFiles = [...shellList[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);

const hash = createHash('sha256');
const missing = [];

for (const url of shellFiles.sort()) {
  const relative = url.replace(/^\//, '').replace(/\/$/, '/index.html');
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    missing.push(url);
    continue;
  }
  hash.update(url);
  hash.update(fs.readFileSync(file));
}

if (missing.length) {
  throw new Error('build: studio/sw.js precaches files that do not exist: ' + missing.join(', '));
}

// The worker's own source, minus the stamp, is part of what it caches.
hash.update(worker.replace(/const BUILD = '[^']*';/, ''));

const stamp = hash.digest('hex').slice(0, 16);
const stamped = worker.replace(/const BUILD = '[^']*';/, "const BUILD = '" + stamp + "';");

if (stamped !== worker) {
  fs.writeFileSync(workerPath, stamped);
  written++;
}

console.log('Service worker stamped ' + stamp + ' over ' + shellFiles.length + ' precached files.');

console.log('Built ' + written + ' files.');
console.log('  ' + allPages.length + ' pages (' + sitemapPaths.length + ' in the sitemap)');
