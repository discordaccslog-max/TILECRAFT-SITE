/*
 * The built site.
 *
 * These tests read the generated HTML off disk and check the things that
 * would otherwise only be caught by clicking everything: that the catalog is
 * coherent, that every internal link resolves, that no placeholder text was
 * left behind, that every public page carries its own metadata, and that the
 * confirmation pages stay out of search results and the sitemap.
 */

import '../tests/helpers/environment.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import { PRODUCTS, TIERS, productBySlug } from '../js/products.js';
import { SITE, hasSupportEmail } from '../js/site-config.js';
import { ALPHABET } from '../js/license.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ *
 * Reading the built site
 * ------------------------------------------------------------------ */

const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', 'tests', 'tools', '.playwright-mcp', '.claude']);

function walk(directory, found = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.nojekyll') continue;
    if (SKIP_DIRECTORIES.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

const allFiles = walk(root);
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));

const pages = htmlFiles.map((file) => ({
  file,
  url: '/' + path.relative(root, file).split(path.sep).join('/'),
  html: fs.readFileSync(file, 'utf8')
}));

for (const page of pages) {
  page.isThankYou = page.url.startsWith('/thank-you/');
  page.is404 = page.url === '/404.html';
  /*
   * The cart is linked from every page but has nothing to index: its
   * contents are whatever happens to be in one visitor's browser. So it
   * is noindex and out of the sitemap, like the confirmation pages,
   * while still being an ordinary page somebody can reach.
   */
  page.isCart = page.url === '/cart/index.html';
  page.isPublic = !page.isThankYou && !page.is404 && !page.isCart;
  page.path = page.url.replace(/index\.html$/, '');
}

const attribute = (html, pattern) => {
  const match = pattern.exec(html);
  return match ? match[1] : null;
};

const titleOf = (html) => attribute(html, /<title>([\s\S]*?)<\/title>/);
const descriptionOf = (html) =>
  attribute(html, /<meta name="description" content="([^"]*)"/);

/** Does a site-absolute path exist as a file on disk? */
function resolves(urlPath) {
  const clean = urlPath.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return fs.existsSync(path.join(root, 'index.html'));
  const relative = clean.replace(/^\//, '');
  const direct = path.join(root, relative);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return true;
  const asDirectory = path.join(root, relative.replace(/\/$/, ''), 'index.html');
  return fs.existsSync(asDirectory);
}

/* ------------------------------------------------------------------ *
 * The build produced what it should have
 * ------------------------------------------------------------------ */

test('the site was built', () => {
  assert.ok(pages.length >= 30, 'expected at least 30 pages, found ' + pages.length);
  assert.ok(fs.existsSync(path.join(root, 'index.html')));
  assert.ok(fs.existsSync(path.join(root, '404.html')));
  assert.ok(fs.existsSync(path.join(root, 'sitemap.xml')));
  assert.ok(fs.existsSync(path.join(root, 'robots.txt')));
  assert.ok(fs.existsSync(path.join(root, 'favicon.svg')));
  assert.ok(fs.existsSync(path.join(root, 'studio', 'index.html')));
  assert.ok(fs.existsSync(path.join(root, 'MODULES.md')));
});

test('every product has a page and a confirmation page', () => {
  for (const product of PRODUCTS) {
    assert.ok(
      fs.existsSync(path.join(root, 'products', product.slug, 'index.html')),
      'missing product page for ' + product.slug
    );
    assert.ok(
      fs.existsSync(path.join(root, 'thank-you', product.slug, 'index.html')),
      'missing confirmation page for ' + product.slug
    );
  }
});

test('the host is configured to build and serve the repository root', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, '.', 'the built site is the repository root');
  assert.equal(config.trailingSlash, true, 'every internal link uses a trailing slash');

  // Nothing from the previous host should be left behind to confuse things.
  assert.ok(!fs.existsSync(path.join(root, 'CNAME')), 'the CNAME file should be gone');
});

test('the absolute URLs point at where the site is actually served', () => {
  assert.ok(SITE.origin.startsWith('https://'), 'the origin must be https');
  assert.ok(!SITE.origin.endsWith('/'), 'the origin must not have a trailing slash');
  assert.equal(SITE.origin, 'https://' + SITE.domain, 'origin and domain must agree');

  // Canonical URLs, the sitemap, and the activation links printed on every
  // certificate are all built from this, so a stale value is not cosmetic.
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes('<loc>' + SITE.origin + '/</loc>'), 'the sitemap must use the live origin');
  assert.ok(!sitemap.includes('tilecraftdigital.art'), 'the sitemap still names the old domain');
});

/* ------------------------------------------------------------------ *
 * The catalog
 * ------------------------------------------------------------------ */

test('the catalog is coherent', () => {
  const slugs = new Set();
  const codes = new Set();

  for (const product of PRODUCTS) {
    assert.match(product.slug, /^[a-z0-9-]+$/, product.name + ' has an odd slug');
    assert.ok(!slugs.has(product.slug), 'duplicate slug ' + product.slug);
    slugs.add(product.slug);

    assert.ok(!codes.has(product.code), 'duplicate product code ' + product.code);
    codes.add(product.code);
    for (const character of product.code) {
      assert.ok(ALPHABET.includes(character), product.slug + ' code uses ' + character);
    }

    assert.ok(TIERS[product.tier], product.slug + ' is in an unknown tier');
    assert.ok(typeof product.price === 'number' && product.price > 0, product.slug + ' price');
    assert.ok(product.name.length > 2, product.slug + ' name');
    assert.ok(product.short.length > 20, product.slug + ' short description');
    assert.ok(product.full.length >= 2, product.slug + ' needs a full description');
    assert.ok(product.features.length >= 5, product.slug + ' needs a feature list');
    assert.ok(product.forWhom.length >= 3, product.slug + ' needs a "who it is for"');
    assert.ok(product.notForWhom.length >= 3, product.slug + ' needs a "who it is not for"');
    assert.equal(product.thankYouPath, '/thank-you/' + product.slug + '/');
  }
});

test('the catalog matches the prices and tiers the business set', () => {
  const expected = {
    /* Collections */
    'geometric-essentials': ['collection', 10],
    'textures-and-grain': ['collection', 12],
    'botanical-linework': ['collection', 14],
    'mid-century-shapes': ['collection', 16],
    'tile-and-terrazzo': ['collection', 19],
    'art-deco-lines': ['collection', 24],
    'stripes-and-rules': ['collection', 20],
    'checks-and-weaves': ['collection', 22],
    'waves-and-water': ['collection', 22],
    'stars-and-night': ['collection', 22],
    'folk-geometry': ['collection', 24],
    'arches-and-columns': ['collection', 24],
    'scallops-and-shells': ['collection', 22],
    'confetti-and-specks': ['collection', 20],
    'crystal-and-facet': ['collection', 26],

    /* Studio Editions */
    'pattern-generator-studio': ['studio-edition', 35],
    'repeat-builder': ['studio-edition', 45],
    'production-studio': ['studio-edition', 75],
    'seam-inspector': ['studio-edition', 22],
    'colorway-studio': ['studio-edition', 28],
    'mockup-studio': ['studio-edition', 34],

    /* Bundles */
    'essentials-bundle': ['collection', 49],
    'geometry-bundle': ['collection', 45],
    'nature-bundle': ['collection', 48],
    'retro-bundle': ['collection', 52],
    'surface-bundle': ['collection', 45],
    'architecture-bundle': ['collection', 50],
    'textile-bundle': ['collection', 58],
    'nursery-bundle': ['collection', 55],
    'makers-bundle': ['collection', 85],
    'print-shop-bundle': ['collection', 95],
    'every-collection': ['collection', 110],
    'studio-editions-bundle': ['collection', 120],
    'complete-library': ['collection', 145]
  };

  assert.equal(PRODUCTS.length, Object.keys(expected).length);

  for (const [slug, [tier, price]] of Object.entries(expected)) {
    const product = productBySlug(slug);
    assert.ok(product, 'missing ' + slug);
    assert.equal(product.tier, tier, slug + ' tier');
    assert.equal(product.price, price, slug + ' price');
  }
});

test('every price is inside the range the business sells in', () => {
  for (const product of PRODUCTS) {
    assert.ok(
      Number.isInteger(product.price) && product.price >= 10 && product.price <= 145,
      product.slug + ' is priced ' + product.price
    );
  }
});

test('every bundle costs less than its contents bought separately', () => {
  /*
   * A bundle that saves nothing is not a bundle, and its own page says in
   * so many words what the parts come to. That claim is computed from the
   * catalog, so this is the check that keeps it true.
   */
  const bundles = PRODUCTS.filter((p) => Array.isArray(p.grants) && p.grants.length > 1);
  assert.ok(bundles.length >= 12, 'expected the bundles to be in the catalog');

  for (const bundle of bundles) {
    const separately = bundle.grants.reduce((total, slug) => {
      const part = productBySlug(slug);
      assert.ok(part, bundle.slug + ' grants ' + slug + ', which is not sold');
      return total + part.price;
    }, 0);

    assert.ok(
      bundle.price < separately,
      bundle.slug + ' costs ' + bundle.price + ' but its contents come to ' + separately
    );
  }
});

test('a bundle grants only products that exist, and never itself', () => {
  for (const product of PRODUCTS) {
    if (!Array.isArray(product.grants)) continue;
    assert.ok(!product.grants.includes(product.slug), product.slug + ' grants itself');
    assert.equal(
      new Set(product.grants).size,
      product.grants.length,
      product.slug + ' grants something twice'
    );
    for (const slug of product.grants) {
      const part = productBySlug(slug);
      assert.ok(part, product.slug + ' grants ' + slug + ', which is not a product');
      assert.ok(
        !Array.isArray(part.grants) || part.grants.length <= 1,
        product.slug + ' grants ' + slug + ', which is itself a bundle'
      );
    }
  }
});

test('no product states a pattern count', () => {
  const counting = /\b\d+\s*(patterns|repeats|tiles|textures|designs|motifs|files)\b/i;

  for (const product of PRODUCTS) {
    const text = [product.short, ...product.full, ...product.features].join(' ');
    const match = counting.exec(text);
    assert.equal(match, null, product.slug + ' states a count: ' + (match && match[0]));
  }
});

/* ------------------------------------------------------------------ *
 * Checkout
 * ------------------------------------------------------------------ */

test('nothing claims to take payment while no checkout exists', () => {
  /*
   * Buying goes through the cart now, and the cart stops at a hand-off
   * that is not built. Nothing anywhere should suggest otherwise: no buy
   * button, and no promise of being taken to a payment provider.
   */
  for (const page of pages) {
    assert.ok(!/>\s*Buy /.test(page.html), page.url + ' has a buy button');
    assert.ok(
      !/taken to our payment provider/i.test(page.html),
      page.url + ' promises a payment provider that does not exist'
    );
  }
});

test('every product page offers the cart instead', () => {
  for (const product of PRODUCTS) {
    const html = fs.readFileSync(path.join(root, 'products', product.slug, 'index.html'), 'utf8');
    assert.ok(/\/js\/product-page\.js/.test(html), product.slug + ' does not load the product script');
    assert.ok(/href="\/cart\/"/.test(html), product.slug + ' does not link to the cart');
  }
});

test('the cart is reachable from every page of the shop', () => {
  /*
   * The Studio is a workspace rather than part of the shop and carries
   * its own header, so it is not expected to link to the cart.
   */
  for (const page of pages) {
    if (page.is404 || page.url.startsWith('studio/') || page.url.startsWith('/studio/')) continue;
    assert.ok(
      /href="\/cart\/"/.test(page.html),
      page.url + ' has no way to reach the cart'
    );
  }
});

test('the price and its four facts are on every product page', () => {
  for (const product of PRODUCTS) {
    const html = fs.readFileSync(path.join(root, 'products', product.slug, 'index.html'), 'utf8');
    assert.ok(html.includes('$' + product.price), product.slug + ' is missing its price');
    for (const fact of [
      'Instant access',
      'Commercial license included',
      '14-day refund policy',
      'Applicable taxes are shown at checkout.'
    ]) {
      assert.ok(html.includes(fact), product.slug + ' is missing: ' + fact);
    }
  }
});

/* ------------------------------------------------------------------ *
 * Links
 * ------------------------------------------------------------------ */

test('every internal link resolves to a page that exists', () => {
  const broken = [];

  for (const page of pages) {
    for (const match of page.html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const target = match[1];
      if (/^(https?:|mailto:|tel:|data:|#)/.test(target)) continue;
      if (!target.startsWith('/')) continue;
      if (!resolves(target)) broken.push(page.url + ' -> ' + target);
    }
  }

  assert.deepEqual(broken, [], 'broken links:\n' + broken.join('\n'));
});

test('every link into the site from JavaScript resolves too', () => {
  const scripts = allFiles.filter((file) => file.endsWith('.js'));
  const section =
    '(?:products|thank-you|studio|license|about|faq|contact|terms|privacy|refunds|' +
    'delivery|disclaimer|consumer-rights|accessibility)';
  const pattern = new RegExp("['\"](/" + section + "[^'\"#?]*)['\"]", 'g');

  // A path built by concatenation, such as '/products/' + slug + '/', shows
  // up here as the bare prefix. Those are checked against every product
  // rather than on their own.
  const prefixes = new Set(['/products/', '/thank-you/']);
  const broken = [];

  for (const file of scripts) {
    const source = fs.readFileSync(file, 'utf8');
    const where = path.relative(root, file);

    for (const match of source.matchAll(pattern)) {
      const target = match[1];

      if (prefixes.has(target)) {
        for (const product of PRODUCTS) {
          const full = target + product.slug + '/';
          if (!resolves(full)) broken.push(where + ' -> ' + full);
        }
        continue;
      }

      if (!resolves(target)) broken.push(where + ' -> ' + target);
    }
  }

  assert.deepEqual([...new Set(broken)], [], 'broken links in scripts:\n' + broken.join('\n'));
});

test('every on-page anchor points at an element that exists', () => {
  const broken = [];

  for (const page of pages) {
    const ids = new Set([...page.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const match of page.html.matchAll(/href="#([^"]+)"/g)) {
      if (!ids.has(match[1])) broken.push(page.url + ' -> #' + match[1]);
    }
  }

  // The home page's product anchors are created from the catalog at runtime.
  const unexplained = broken.filter((entry) => !/#product-|#collections|#studio-editions/.test(entry));
  assert.deepEqual(unexplained, [], 'dangling anchors:\n' + unexplained.join('\n'));
});

test('nothing is loaded from another server', () => {
  const offenders = [];

  for (const page of pages) {
    for (const match of page.html.matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)) {
      const url = match[1];
      // Canonical and Open Graph tags name our own URL, which is not a load.
      const context = page.html.slice(Math.max(0, match.index - 120), match.index);
      if (/rel="canonical"|property="og:|name="twitter:/.test(context)) continue;
      if (url.startsWith(SITE.origin)) continue;
      offenders.push(page.url + ' -> ' + url);
    }
  }

  assert.deepEqual(offenders, [], 'external resources:\n' + offenders.join('\n'));
});

test('no page links to a confirmation page', () => {
  const offenders = [];

  for (const page of pages) {
    if (page.isThankYou) continue;
    for (const match of page.html.matchAll(/href="([^"]*thank-you[^"]*)"/g)) {
      offenders.push(page.url + ' -> ' + match[1]);
    }
  }

  assert.deepEqual(offenders, [], 'confirmation pages must not be linked');
});

/* ------------------------------------------------------------------ *
 * Nothing left unfinished
 * ------------------------------------------------------------------ */

test('no placeholder text was left anywhere in the site', () => {
  const forbidden = [
    /\bTODO\b/,
    /\bFIXME\b/,
    /\bTBD\b/,
    /\bXXX\b/,
    /lorem ipsum/i,
    /coming soon/i,
    /\bplaceholder text\b/i,
    /\bdummy (text|content)\b/i,
    /\bexample\.com\b/,
    /\byour-?(email|domain|name here)\b/i,
    /\bINSERT [A-Z ]+\b/,
    /\[\s*(insert|add|your)\b[^\]]*\]/i
  ];

  const sources = allFiles.filter((file) =>
    /\.(html|css|js|mjs|json|xml|txt|webmanifest)$/.test(file)
  );

  const offenders = [];
  for (const file of sources) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) {
      const match = pattern.exec(text);
      if (match) offenders.push(path.relative(root, file) + ': ' + match[0]);
    }
  }

  assert.deepEqual(offenders, [], 'placeholder text found:\n' + offenders.join('\n'));
});

test('no contact details were invented anywhere', () => {
  // With no support address configured, no email address of any kind should
  // appear on the site, and no phone number, postal address, or jurisdiction.
  const sources = allFiles.filter((file) => /\.(html|css|js|mjs|json|xml|txt)$/.test(file));
  const offenders = [];

  for (const file of sources) {
    const text = fs.readFileSync(file, 'utf8');
    const relative = path.relative(root, file);

    if (!hasSupportEmail()) {
      for (const match of text.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)) {
        // The module contract documents a mailto example in prose only.
        if (match[0].startsWith('noreply@')) continue;
        offenders.push(relative + ': email ' + match[0]);
      }
    }

    for (const match of text.matchAll(/\+\d[\d\s().-]{8,}\d/g)) {
      offenders.push(relative + ': phone ' + match[0]);
    }

    for (const pattern of [
      /\bgoverned by the laws of\b/i,
      /\bexclusive jurisdiction\b/i,
      /\bcourts of\b/i
    ]) {
      const match = pattern.exec(text);
      if (match) offenders.push(relative + ': jurisdiction "' + match[0] + '"');
    }
  }

  assert.deepEqual(offenders, [], 'invented contact or legal details:\n' + offenders.join('\n'));
});

test('the Terms of Service has no governing law clause', () => {
  const terms = fs.readFileSync(path.join(root, 'terms', 'index.html'), 'utf8');
  for (const pattern of [/governing law/i, /jurisdiction/i, /applicable law of/i]) {
    assert.equal(pattern.exec(terms), null, 'the Terms should not set a jurisdiction');
  }
});

test('the copy rules are kept', () => {
  const forbidden = [
    [/\bhand-?drawn\b/i, 'the patterns must never be called hand-drawn'],
    [/\bbest\s?sell(er|ing)\b/i, 'no bestseller claims'],
    [/\btrending\b/i, 'no trend claims'],
    [/\blimited time\b/i, 'no urgency'],
    [/\bhurry\b/i, 'no urgency'],
    [/\bonly \d+ left\b/i, 'no scarcity'],
    [/\bsale ends\b/i, 'no countdowns'],
    [/\b\d+[,\d]*\s*(customers|happy customers|sales|downloads|users)\b/i, 'no user or sales counts'],
    [/\b\d(\.\d)?\s*(out of 5|stars)\b/i, 'no ratings'],
    [/\btestimonial\b/i, 'no testimonials'],
    [/\baward-?winning\b/i, 'no awards'],
    [/\bcolor[- ]accurate\b/i, 'no color accuracy claims'],
    [/\bPantone\b/i, 'no brand names'],
    [/\bPhotoshop\b/i, 'no software names'],
    [/\bIllustrator\b/i, 'no software names'],
    [/\bProcreate\b/i, 'no software names'],
    [/\bEtsy\b/i, 'no marketplace names'],
    [/\bRedbubble\b/i, 'no marketplace names'],
    [/\bSociety6\b/i, 'no marketplace names'],
    [/\bSpoonflower\b/i, 'no marketplace names'],
    [/\bPrintful\b/i, 'no marketplace names'],
    [/\bShopify\b/i, 'no platform names'],
    [/\bAmazon\b/i, 'no platform names'],
    [/\bStripe\b/i, 'no payment provider names'],
    [/\bPayPal\b/i, 'no payment provider names']
  ];

  const offenders = [];
  for (const page of pages) {
    const text = page.html.replace(/<[^>]+>/g, ' ');
    for (const [pattern, why] of forbidden) {
      const match = pattern.exec(text);
      if (match) offenders.push(page.url + ': "' + match[0] + '" — ' + why);
    }
  }

  assert.deepEqual(offenders, [], 'copy rule breaches:\n' + offenders.join('\n'));
});

test('the site uses no photographs', () => {
  const offenders = [];
  for (const page of pages) {
    for (const match of page.html.matchAll(/<img\b[^>]*>/g)) offenders.push(page.url + ': ' + match[0]);
  }
  assert.deepEqual(offenders, []);

  /*
   * Two kinds of raster file are allowed, and only two: the social card,
   * and the texture tiles, which are generated as pixels because grain has
   * no outline to describe. Anything else would mean a photograph or a
   * borrowed image had found its way in.
   */
  const raster = allFiles.filter((file) => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(file));
  const unexpected = raster.filter((file) => {
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (rel === 'og.png') return false;
    if (/^patterns\/[a-z-]+\/tex\/[a-z]+-\d+(-thumb)?\.png$/.test(rel)) return false;
    return true;
  });
  assert.deepEqual(
    unexpected.map((file) => path.relative(root, file)),
    [],
    'unexpected raster image'
  );

  // Nothing on this site is a photograph, so no JPEG should exist at all.
  const photographs = allFiles.filter((file) => /\.(jpg|jpeg)$/i.test(file));
  assert.deepEqual(photographs.map((file) => path.relative(root, file)), []);
});

/* ------------------------------------------------------------------ *
 * Metadata
 * ------------------------------------------------------------------ */

test('every page has a unique title and description', () => {
  const titles = new Map();
  const descriptions = new Map();

  for (const page of pages) {
    const title = titleOf(page.html);
    const description = descriptionOf(page.html);

    assert.ok(title && title.length > 10, page.url + ' needs a title');
    assert.ok(title.includes('Tilecraft Digital'), page.url + ' title should name the business');
    assert.ok(description && description.length > 40, page.url + ' needs a description');
    assert.ok(description.length < 300, page.url + ' description is too long');

    assert.ok(!titles.has(title), 'duplicate title on ' + page.url + ' and ' + titles.get(title));
    titles.set(title, page.url);

    assert.ok(
      !descriptions.has(description),
      'duplicate description on ' + page.url + ' and ' + descriptions.get(description)
    );
    descriptions.set(description, page.url);
  }
});

test('every public page has Open Graph tags and a canonical URL', () => {
  for (const page of pages) {
    if (!page.isPublic) continue;

    assert.ok(page.html.includes('property="og:title"'), page.url + ' og:title');
    assert.ok(page.html.includes('property="og:description"'), page.url + ' og:description');
    assert.ok(page.html.includes('property="og:url"'), page.url + ' og:url');
    assert.ok(page.html.includes('property="og:image"'), page.url + ' og:image');
    assert.ok(page.html.includes('property="og:type"'), page.url + ' og:type');
    assert.ok(page.html.includes('name="twitter:card"'), page.url + ' twitter:card');

    const canonical = attribute(page.html, /<link rel="canonical" href="([^"]+)"/);
    assert.ok(canonical, page.url + ' needs a canonical URL');
    assert.equal(canonical, SITE.origin + page.path, page.url + ' canonical is wrong');
  }
});

test('every page declares the character set, the viewport, and the favicon', () => {
  for (const page of pages) {
    assert.ok(page.html.includes('<meta charset="utf-8">'), page.url);
    assert.ok(page.html.includes('name="viewport"'), page.url);
    assert.ok(page.html.includes('rel="icon"'), page.url);
    assert.ok(page.html.startsWith('<!doctype html>'), page.url);
    assert.ok(page.html.includes('<html lang="en">'), page.url);
  }
});

test('every page has exactly one h1 and a skip link', () => {
  for (const page of pages) {
    const h1s = (page.html.match(/<h1\b/g) || []).length;
    // The Studio renders its heading from the module it opens.
    if (page.url === '/studio/index.html') {
      assert.ok(page.html.includes('class="skip-link"'), page.url + ' needs a skip link');
      continue;
    }
    assert.equal(h1s, 1, page.url + ' has ' + h1s + ' h1 elements');
    assert.ok(page.html.includes('class="skip-link"'), page.url + ' needs a skip link');
  }
});

test('static heading levels never skip a step', () => {
  for (const page of pages) {
    const levels = [...page.html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    let previous = 0;
    for (const level of levels) {
      if (previous !== 0) {
        assert.ok(level <= previous + 1, page.url + ': h' + previous + ' is followed by h' + level);
      }
      previous = level;
    }
  }
});

/* ------------------------------------------------------------------ *
 * Confirmation pages stay private
 * ------------------------------------------------------------------ */

test('confirmation pages are noindex and have no canonical or social tags', () => {
  for (const page of pages) {
    if (!page.isThankYou) continue;
    assert.ok(
      /<meta name="robots" content="noindex, nofollow">/.test(page.html),
      page.url + ' must be noindex'
    );
    assert.ok(!page.html.includes('rel="canonical"'), page.url + ' should have no canonical');
    assert.ok(!page.html.includes('property="og:'), page.url + ' should have no social tags');
  }
});

test('the 404 page is noindex and matches the site design', () => {
  const notFound = pages.find((page) => page.is404);
  assert.ok(/<meta name="robots" content="noindex/.test(notFound.html));
  assert.ok(notFound.html.includes('/css/style.css'));
  assert.ok(notFound.html.includes('class="site-header"'));
  assert.ok(notFound.html.includes('class="site-footer"'));
});

test('the sitemap lists every public page and no private one', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  assert.ok(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));

  for (const page of pages) {
    const url = SITE.origin + page.path;
    if (page.isPublic) assert.ok(listed.includes(url), 'sitemap is missing ' + page.path);
    else assert.ok(!listed.includes(url), 'sitemap must not list ' + page.path);
  }

  assert.equal(new Set(listed).size, listed.length, 'the sitemap repeats a URL');
  for (const url of listed) {
    assert.ok(url.startsWith(SITE.origin), url + ' is not on this site');
    assert.ok(resolves(url.slice(SITE.origin.length)), url + ' does not exist');
  }
});

test('robots.txt keeps crawlers out of the confirmation pages', () => {
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  assert.ok(robots.includes('User-agent: *'));
  assert.ok(robots.includes('Disallow: /thank-you/'));
  assert.ok(robots.includes('Sitemap: ' + SITE.origin + '/sitemap.xml'));
});

/* ------------------------------------------------------------------ *
 * Policies and disclosure
 * ------------------------------------------------------------------ */

test('every policy page is dated', () => {
  for (const slug of ['terms', 'privacy', 'refunds', 'delivery', 'disclaimer', 'consumer-rights']) {
    const html = fs.readFileSync(path.join(root, slug, 'index.html'), 'utf8');
    assert.ok(
      html.includes('Last updated: ' + SITE.lastUpdated),
      '/' + slug + '/ is missing its date'
    );
  }
});

test('the AI disclosure appears on every product page, the License page, and the FAQ', () => {
  const phrase = 'created with AI assistance and generated in code';

  for (const product of PRODUCTS) {
    const html = fs.readFileSync(path.join(root, 'products', product.slug, 'index.html'), 'utf8');
    // Product pages render their body from the catalog at runtime, so the
    // disclosure is checked in the module that builds it.
    assert.ok(html.includes('/js/product-page.js'), product.slug + ' must load the renderer');
  }

  const renderer = fs.readFileSync(path.join(root, 'js', 'product-page.js'), 'utf8');
  assert.ok(renderer.includes('AI_DISCLOSURE'), 'product pages must render the disclosure');

  for (const slug of ['license', 'faq']) {
    const html = fs.readFileSync(path.join(root, slug, 'index.html'), 'utf8');
    assert.ok(html.includes(phrase), '/' + slug + '/ is missing the AI disclosure');
  }

  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(home.includes(phrase), 'the home page should carry it too');
});

test('every policy sends people to the Contact page rather than an address', () => {
  for (const slug of ['terms', 'privacy', 'refunds', 'delivery', 'disclaimer', 'consumer-rights']) {
    const html = fs.readFileSync(path.join(root, slug, 'index.html'), 'utf8');
    assert.ok(html.includes('href="/contact/"'), '/' + slug + '/ should link to Contact');
  }
});

test('the footer carries the required links on every page', () => {
  const required = [
    '/license/',
    '/terms/',
    '/privacy/',
    '/refunds/',
    '/delivery/',
    '/disclaimer/',
    '/contact/'
  ];

  for (const page of pages) {
    if (page.url === '/studio/index.html') continue; // the Studio has its own chrome
    for (const link of required) {
      assert.ok(page.html.includes('href="' + link + '"'), page.url + ' is missing ' + link);
    }
    assert.ok(page.html.includes('Tilecraft Digital'), page.url + ' should name the business');
    assert.ok(page.html.includes('data-year'), page.url + ' needs the copyright year');
  }
});

test('the header carries the tiers, the License, the FAQ, and the Studio', () => {
  for (const page of pages) {
    if (page.url === '/studio/index.html') continue;
    for (const link of ['/#collections', '/#studio-editions', '/license/', '/faq/', '/studio/']) {
      assert.ok(page.html.includes('href="' + link + '"'), page.url + ' header is missing ' + link);
    }
  }
});

test('no support address is shown while none is configured', () => {
  if (hasSupportEmail()) return;
  for (const page of pages) {
    assert.ok(!page.html.includes('mailto:'), page.url + ' shows a mailto link with no address set');
  }
});

/* ------------------------------------------------------------------ *
 * The service worker
 *
 * A browser installs a new service worker only when sw.js itself changes,
 * and the Studio's precache is only refilled on install. If the worker's
 * stamp ever stops tracking the files it caches, a returning visitor is
 * pinned to the version they first loaded and never receives a fix. This
 * is the check that stops that happening quietly.
 * ------------------------------------------------------------------ */

test('the service worker precaches only files that exist', () => {
  const worker = fs.readFileSync(path.join(root, 'studio', 'sw.js'), 'utf8');
  const list = /const SHELL = \[([\s\S]*?)\];/.exec(worker);
  assert.ok(list, 'sw.js should declare a SHELL list');

  const urls = [...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(urls.length > 10, 'the shell should cover the Studio and its modules');

  for (const url of urls) {
    assert.ok(resolves(url), 'sw.js precaches ' + url + ', which does not exist');
  }
});

test('the service worker caches every script the Studio loads', () => {
  const worker = fs.readFileSync(path.join(root, 'studio', 'sw.js'), 'utf8');
  const studio = fs.readFileSync(path.join(root, 'studio', 'studio.js'), 'utf8');

  // Every module studio.js imports from js/ has to be in the precache, or
  // the Studio cannot start offline.
  const imported = [...studio.matchAll(/from '\.\.\/js\/([\w-]+\.js)'/g)].map((m) => '/js/' + m[1]);
  assert.ok(imported.length >= 8, 'expected the Studio to import several modules');

  for (const url of new Set(imported)) {
    assert.ok(worker.includes("'" + url + "'"), 'sw.js does not precache ' + url);
  }
});

test('the service worker stamp matches the files it precaches', () => {
  const workerPath = path.join(root, 'studio', 'sw.js');
  const worker = fs.readFileSync(workerPath, 'utf8');

  const declared = /const BUILD = '([^']*)';/.exec(worker);
  assert.ok(declared, 'sw.js should carry a BUILD stamp');

  const urls = [.../const SHELL = \[([\s\S]*?)\];/.exec(worker)[1].matchAll(/'([^']+)'/g)].map(
    (m) => m[1]
  );

  const hash = createHash('sha256');
  for (const url of urls.slice().sort()) {
    const relative = url.replace(/^\//, '').replace(/\/$/, '/index.html');
    hash.update(url);
    hash.update(fs.readFileSync(path.join(root, relative)));
  }
  hash.update(worker.replace(/const BUILD = '[^']*';/, ''));

  assert.equal(
    declared[1],
    hash.digest('hex').slice(0, 16),
    'the service worker stamp is stale — run `npm run build`'
  );
});

test('every URL named in a meta tag is on this site and exists', () => {
  // A social image that 404s is invisible until someone shares a link, so
  // the meta tags are resolved against disk the same way links are.
  const broken = [];
  const foreign = [];

  for (const page of pages) {
    const urls = [
      ...page.html.matchAll(/<meta (?:property|name)="(og:image|og:url|twitter:image)" content="([^"]+)"/g)
    ].map((m) => ({ tag: m[1], url: m[2] }));

    const canonical = attribute(page.html, /<link rel="canonical" href="([^"]+)"/);
    if (canonical) urls.push({ tag: 'canonical', url: canonical });

    for (const { tag, url } of urls) {
      if (!url.startsWith(SITE.origin)) {
        foreign.push(page.url + ' ' + tag + ' -> ' + url);
        continue;
      }
      const pathname = url.slice(SITE.origin.length) || '/';
      if (!resolves(pathname)) broken.push(page.url + ' ' + tag + ' -> ' + url);
    }
  }

  assert.deepEqual(foreign, [], 'meta tags naming another origin:\n' + foreign.join('\n'));
  assert.deepEqual(broken, [], 'meta tags naming a file that does not exist:\n' + broken.join('\n'));
});
