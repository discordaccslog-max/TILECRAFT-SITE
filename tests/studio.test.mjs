/*
 * The Studio: modules, gating, and working offline.
 *
 * A module is a product. If one loads for somebody who has not bought it,
 * the shop is giving the work away; if one fails to load for somebody who
 * has, they have paid for nothing. These tests cover that boundary, the
 * wiring that makes a module findable, and the things that have to be true
 * for saved work to survive — the backup carrying module data, and the
 * service worker keeping a module once it has been used.
 */

import '../tests/helpers/environment.mjs';
import { resetEnvironment } from './helpers/environment.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { PRODUCTS, productBySlug } from '../js/products.js';
import {
  activate,
  generateCode,
  clearLicenses,
  isUnlocked,
  unlockedSlugs,
  codeFromHash,
  activationUrl
} from '../js/license.js';
import { scopedStorage, exportAll } from '../js/storage.js';
import { buildBackup, restoreBackup } from '../js/backup.js';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'studio/modules/manifest.json'), 'utf8'));

const COLLECTION_SLUGS = [
  'geometric-essentials',
  'textures-and-grain',
  'botanical-linework',
  'mid-century-shapes',
  'tile-and-terrazzo'
];

/* ------------------------------------------------------------------ *
 * Every product has a module, and every module a product
 * ------------------------------------------------------------------ */

test('every product that unlocks a workspace has a module', () => {
  // The bundle grants the five collections rather than a workspace of its
  // own, so it is the one product with nothing to load.
  const needsModule = PRODUCTS.filter((p) => !p.grants);
  const slugs = manifest.modules.map((m) => m.slug);

  for (const product of needsModule) {
    assert.ok(slugs.includes(product.slug), product.slug + ' has no module in the manifest');
  }
  assert.equal(manifest.modules.length, needsModule.length);
});

test('every module in the manifest is a product that is sold', () => {
  for (const module of manifest.modules) {
    assert.ok(productBySlug(module.slug), module.slug + ' is a module for no product');
  }
});

test('every module entry points at a file that exists', () => {
  for (const module of manifest.modules) {
    const file = path.join(root, 'studio', module.entry);
    assert.ok(fs.existsSync(file), module.slug + ' points at a missing file: ' + module.entry);

    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /export\s+(async\s+)?function\s+mount\b/, module.slug + ' exports no mount function');
  }
});

test('a module imports only from inside the site', () => {
  // Nothing here is fetched from a CDN, so a bare or remote import would
  // mean a module that cannot load offline.
  for (const module of manifest.modules) {
    const source = fs.readFileSync(path.join(root, 'studio', module.entry), 'utf8');
    /*
     * Anchored to the start of a line, because "from" appears in ordinary
     * prose too: a status message reading 'Lifted a palette from ' + name
     * looks exactly like an import to a looser pattern.
     */
    for (const match of source.matchAll(/^\s*(?:import|export)[^'"\n]*\bfrom\s+['"]([^'"]+)['"]/gm)) {
      const target = match[1];
      assert.ok(
        target.startsWith('.') || target.startsWith('/'),
        module.slug + ' imports ' + target + ', which is not a path inside the site'
      );
    }
  }
});

/* ------------------------------------------------------------------ *
 * Licence gating
 * ------------------------------------------------------------------ */

test('a module is locked until its product is bought', () => {
  resetEnvironment();
  clearLicenses();

  for (const module of manifest.modules) {
    assert.equal(isUnlocked(module.slug), false, module.slug + ' is unlocked with no license at all');
  }
  assert.deepEqual([...unlockedSlugs()], []);
});

test('buying one collection unlocks that collection and nothing else', () => {
  resetEnvironment();
  clearLicenses();

  const product = productBySlug('botanical-linework');
  const result = activate(generateCode(product));
  assert.equal(result.ok, true, result.reason);

  assert.equal(isUnlocked('botanical-linework'), true);
  for (const module of manifest.modules) {
    if (module.slug === 'botanical-linework') continue;
    assert.equal(isUnlocked(module.slug), false, module.slug + ' was unlocked by the wrong purchase');
  }
  assert.deepEqual([...unlockedSlugs()], ['botanical-linework']);
});

test('the bundle unlocks all five collections and no tool', () => {
  resetEnvironment();
  clearLicenses();

  const bundle = productBySlug('essentials-bundle');
  assert.equal(activate(generateCode(bundle)).ok, true);

  for (const slug of COLLECTION_SLUGS) {
    assert.equal(isUnlocked(slug), true, slug + ' should be unlocked by the bundle');
  }

  // The Studio Editions are separate products and are not in the bundle.
  for (const slug of ['pattern-generator-studio', 'repeat-builder', 'production-studio']) {
    assert.equal(isUnlocked(slug), false, slug + ' should not come with the bundle');
  }

  assert.deepEqual([...unlockedSlugs()].sort(), [...COLLECTION_SLUGS].sort());
});

test('a tool unlocks only itself', () => {
  resetEnvironment();
  clearLicenses();

  assert.equal(activate(generateCode(productBySlug('repeat-builder'))).ok, true);
  assert.equal(isUnlocked('repeat-builder'), true);
  assert.equal(isUnlocked('production-studio'), false);
  for (const slug of COLLECTION_SLUGS) {
    assert.equal(isUnlocked(slug), false, slug + ' should not come with a tool');
  }
});

test('licenses add up rather than replacing each other', () => {
  resetEnvironment();
  clearLicenses();

  activate(generateCode(productBySlug('essentials-bundle')));
  activate(generateCode(productBySlug('production-studio')));

  const unlocked = unlockedSlugs();
  assert.equal(unlocked.size, 6);
  assert.ok(unlocked.has('production-studio'));
  assert.ok(unlocked.has('tile-and-terrazzo'));
});

test('a code that was not issued unlocks nothing', () => {
  resetEnvironment();
  clearLicenses();

  for (const bad of [
    'TILE-GMTR-AAAAAAAA-AA',
    'TILE-ZZZZ-K7N4PXBM-WC',
    'NOPE-GMTR-K7N4PXBM-WC',
    'TILE-GMTR-K7N4PXB-WC',
    '',
    'free access please'
  ]) {
    const result = activate(bad);
    assert.equal(result.ok, false, bad + ' was accepted');
  }
  assert.deepEqual([...unlockedSlugs()], []);
});

/* ------------------------------------------------------------------ *
 * Activation links
 * ------------------------------------------------------------------ */

test('an activation link carries a code that unlocks its product', () => {
  resetEnvironment();
  clearLicenses();

  for (const product of PRODUCTS) {
    const code = generateCode(product, { orderId: 'demo-' + product.slug });
    const url = activationUrl(code);

    assert.ok(url.includes('/studio/#activate='), 'link is not a Studio activation link: ' + url);

    // Follow the link the way the Studio does: read the hash, activate.
    const fromLink = codeFromHash(new URL(url).hash);
    assert.equal(fromLink, code, 'the link did not round-trip the code');

    clearLicenses();
    const result = activate(fromLink);
    assert.equal(result.ok, true, product.slug + ': ' + result.reason);

    const expected = product.grants || [product.slug];
    assert.deepEqual([...unlockedSlugs()].sort(), [...expected].sort(), product.slug + ' unlocked the wrong thing');
  }
});

test('an activation link is the same every time for the same order', () => {
  const product = productBySlug('mid-century-shapes');
  const a = generateCode(product, { orderId: 'order-9912' });
  const b = generateCode(product, { orderId: 'order-9912' });
  assert.equal(a, b);
  assert.notEqual(a, generateCode(product, { orderId: 'order-9913' }));
});

/* ------------------------------------------------------------------ *
 * Saved work, and getting it back
 * ------------------------------------------------------------------ */

test('each module keeps its saved work to itself', async () => {
  resetEnvironment();

  const generator = scopedStorage('pattern-generator-studio');
  const builder = scopedStorage('repeat-builder');

  await generator.set('favourites', [{ seed: 'ABC123', motif: 'stars' }]);
  await builder.set('favourites', [{ name: 'my repeat' }]);

  assert.deepEqual(await generator.get('favourites'), [{ seed: 'ABC123', motif: 'stars' }]);
  assert.deepEqual(await builder.get('favourites'), [{ name: 'my repeat' }]);
  assert.deepEqual(await generator.keys(), ['favourites']);

  // Clearing one module leaves the other alone.
  await generator.clear();
  assert.equal(await generator.get('favourites'), undefined);
  assert.deepEqual(await builder.get('favourites'), [{ name: 'my repeat' }]);
});

test('a backup carries every module’s saved work, and brings it back', async () => {
  resetEnvironment();
  clearLicenses();

  // Somebody with the bundle and a tool, who has saved work in both.
  activate(generateCode(productBySlug('essentials-bundle'), { orderId: 'order-77' }));
  activate(generateCode(productBySlug('pattern-generator-studio'), { orderId: 'order-78' }));

  const colours = scopedStorage('tile-and-terrazzo');
  const generator = scopedStorage('pattern-generator-studio');
  const builder = scopedStorage('repeat-builder');

  await colours.set('colorways', [{ name: 'Mine', colors: { bg: '#fff', ink: '#111' } }]);
  await generator.set('favourites', [{ seed: 'KEEPME1', motif: 'arcs' }]);
  await generator.set('settings', { density: 6, scale: 0.7 });
  await builder.set('project', { layout: 'brick', motifs: 2 });

  const backup = await buildBackup();

  // The device is wiped: a cleared browser, or a new machine.
  resetEnvironment();
  clearLicenses();
  assert.deepEqual([...unlockedSlugs()], []);
  assert.equal(await generator.get('favourites'), undefined);

  const restored = await restoreBackup(backup);
  assert.ok(restored.licenses >= 2, 'licenses did not come back');

  assert.equal(isUnlocked('tile-and-terrazzo'), true, 'the bundle did not come back');
  assert.equal(isUnlocked('pattern-generator-studio'), true, 'the tool did not come back');

  assert.deepEqual(await colours.get('colorways'), [{ name: 'Mine', colors: { bg: '#fff', ink: '#111' } }]);
  assert.deepEqual(await generator.get('favourites'), [{ seed: 'KEEPME1', motif: 'arcs' }]);
  assert.deepEqual(await generator.get('settings'), { density: 6, scale: 0.7 });
  assert.deepEqual(await builder.get('project'), { layout: 'brick', motifs: 2 });
});

test('a backup records work saved by a module that is not licensed', async () => {
  // Repeat Builder work belongs to the person who made it, so losing a
  // license should not quietly lose the files they made with it.
  resetEnvironment();
  clearLicenses();

  await scopedStorage('repeat-builder').set('project', { layout: 'mirror' });
  const backup = await buildBackup();
  const saved = backup.work || backup.storage || [];
  const json = JSON.stringify(saved);
  assert.match(json, /repeat-builder/);
  assert.match(json, /mirror/);
});

/* ------------------------------------------------------------------ *
 * Working offline
 * ------------------------------------------------------------------ */

const serviceWorker = fs.readFileSync(path.join(root, 'studio/sw.js'), 'utf8');

test('the service worker keeps a module after it has been used', () => {
  // Modules are not in the precache — they arrive when a product is first
  // opened — so the runtime rule is what makes them work offline later.
  assert.match(
    serviceWorker,
    /RUNTIME_CACHE/,
    'there is no runtime cache for anything fetched after install'
  );
  assert.ok(
    !/SHELL[\s\S]{0,400}modules\/(geometric|pattern-generator)/.test(serviceWorker),
    'a product module is in the precache, which would ship it to people who have not bought it'
  );
  assert.match(serviceWorker, /cache\.put|caches\.open/, 'nothing is ever written to the cache');
});

test('the Studio shell is precached, so it opens offline', () => {
  const shell = serviceWorker.slice(serviceWorker.indexOf('const SHELL'), serviceWorker.indexOf('];', serviceWorker.indexOf('const SHELL')));
  for (const required of ['/studio/', '/studio/studio.js', '/studio/studio.css', '/studio/modules/manifest.json']) {
    assert.ok(shell.includes(required), required + ' is missing from the precache');
  }
});

test('every precached file exists on disk', () => {
  const start = serviceWorker.indexOf('const SHELL');
  const shell = serviceWorker.slice(start, serviceWorker.indexOf('];', start));
  const urls = [...shell.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((u) => u.startsWith('/'));

  assert.ok(urls.length >= 10, 'the precache list looks too short: ' + urls.length);

  for (const url of urls) {
    const relative = url.endsWith('/') ? url + 'index.html' : url;
    assert.ok(
      fs.existsSync(path.join(root, relative.replace(/^\//, ''))),
      'precached but missing from disk: ' + url
    );
  }
});

test('the service worker is stamped with the build, so a deploy refreshes it', () => {
  const stamp = serviceWorker.match(/const BUILD = '([^']+)'/);
  assert.ok(stamp, 'the service worker carries no build stamp');
  assert.ok(stamp[1].length >= 8, 'the build stamp is too short to be a hash: ' + stamp[1]);
  assert.match(serviceWorker, /VERSION\s*=\s*'tilecraft-studio-'\s*\+\s*BUILD/);
});
