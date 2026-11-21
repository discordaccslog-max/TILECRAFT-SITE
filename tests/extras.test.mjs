/*
 * The extras, and the tools that were added with them.
 *
 * An extra is a promise on a product page, so the thing that matters most
 * here is that each one is wired to something in the Studio. A line item
 * nobody delivers is the worst failure this catalog could have, and it is
 * the one a human reviewer is least likely to notice.
 *
 * The parts that need a canvas are exercised in the browser; these are
 * the parts that can be settled from the source and from pure functions.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { OPTIONS, PRODUCTS, optionsFor } from '../js/products.js';
import { seedPack, MOTIF_COUNT } from '../studio/modules/_shared/starters.mjs';
import { MOTIFS } from '../studio/modules/pattern-generator-studio/generate.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/* Where each extra is switched on. */
const DELIVERED_BY = {
  'extra-colorways': ['studio/modules/_shared/viewer.mjs'],
  'print-specs': ['studio/modules/_shared/viewer.mjs'],
  'palette-files': ['studio/modules/_shared/viewer.mjs'],
  'mockup-pack': [
    'studio/modules/_shared/viewer.mjs',
    'studio/modules/pattern-generator-studio/index.js',
    'studio/modules/repeat-builder/index.js',
    'studio/modules/mockup-studio/index.js'
  ],
  'seam-report': ['studio/modules/_shared/viewer.mjs'],
  'motif-library': ['studio/modules/repeat-builder/index.js'],
  'seed-pack': ['studio/modules/pattern-generator-studio/index.js'],
  'large-format': ['studio/modules/production-studio/index.js']
};

/* ------------------------------------------------------------------ *
 * Every extra is actually delivered
 * ------------------------------------------------------------------ */

test('every extra on offer is switched on somewhere in the Studio', () => {
  for (const id of Object.keys(OPTIONS)) {
    const files = DELIVERED_BY[id];
    assert.ok(files && files.length, id + ' has nowhere recorded that delivers it');

    const delivered = files.some((file) => read(file).includes("'" + id + "'"));
    assert.ok(
      delivered,
      id + ' is sold but no module reads it: checked ' + files.join(', ')
    );
  }
});

test('nothing is sold that the catalog does not describe', () => {
  const sold = new Set();
  for (const product of PRODUCTS) for (const option of optionsFor(product)) sold.add(option.id);

  for (const id of sold) {
    assert.ok(OPTIONS[id], id + ' is offered by a product but is not in OPTIONS');
    assert.ok(DELIVERED_BY[id], id + ' is offered by a product but nothing delivers it');
  }
});

test('an extra is read through the license, never assumed', () => {
  /*
   * Every gate goes through context.options, which is built from the
   * licenses held on the device. A module reaching for localStorage or
   * for the license list itself would be deciding entitlement on its own.
   */
  const files = new Set(Object.values(DELIVERED_BY).flat());
  for (const file of files) {
    const source = read(file);
    assert.match(source, /context\.options/, file + ' never asks what the license carries');
    assert.ok(
      !/localStorage/.test(source),
      file + ' reads storage directly rather than asking the Studio'
    );
  }
});

test('the extras that produce documents have something to produce them with', () => {
  const extras = read('studio/modules/_shared/extras.mjs');
  for (const fn of ['specSheet', 'seamReport', 'paletteEntries', 'swatchSheet', 'measureSeams']) {
    assert.ok(extras.includes('export function ' + fn) || extras.includes('export async function ' + fn), fn + ' is missing');
  }
});

/* ------------------------------------------------------------------ *
 * The seed pack
 * ------------------------------------------------------------------ */

test('the seed pack is sixty distinct starting points', () => {
  const pack = seedPack();
  assert.equal(pack.length, 60);
  assert.equal(new Set(pack.map((p) => p.seed)).size, 60, 'two entries share a seed');
  assert.equal(new Set(pack.map((p) => p.name)).size, 60, 'two entries share a name');
});

test('every seed in the pack names a motif the generator can draw', () => {
  const known = new Set(MOTIFS.map((m) => (typeof m === 'string' ? m : m.value)));
  for (const entry of seedPack()) {
    assert.ok(
      known.has(entry.settings.motif),
      entry.name + ' asks for motif "' + entry.settings.motif + '", which the generator does not have'
    );
  }
});

test('every seed in the pack names a layout the generator can use', () => {
  for (const entry of seedPack()) {
    assert.ok(
      ['grid', 'halfDrop', 'scatter'].includes(entry.settings.layout),
      entry.name + ' asks for layout "' + entry.settings.layout + '"'
    );
  }
});

test('the pack is the same every time, so a seed keeps its pattern', () => {
  assert.deepEqual(seedPack(), seedPack());
});

test('a seed from the pack is readable and uses no ambiguous characters', () => {
  for (const entry of seedPack()) {
    assert.match(entry.seed, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/, entry.name + ': ' + entry.seed);
  }
});

test('the pack covers every motif the generator offers', () => {
  const used = new Set(seedPack().map((e) => e.settings.motif));
  for (const motif of MOTIFS.map((m) => (typeof m === 'string' ? m : m.value))) {
    assert.ok(used.has(motif), 'the pack never uses ' + motif);
  }
});

/* ------------------------------------------------------------------ *
 * The motif library
 * ------------------------------------------------------------------ */

test('the motif library holds the forty shapes the page promises', () => {
  assert.equal(MOTIF_COUNT, 40);
  const blurb = OPTIONS['motif-library'].blurb;
  assert.match(blurb, /Forty/i, 'the page says something other than forty');
});

test('the motif library is drawn in code, not fetched', () => {
  const source = read('studio/modules/_shared/starters.mjs');
  assert.ok(!/https?:\/\//.test(source.replace(/^\s*\*.*$/gm, '')), 'the library reaches for a URL');
  assert.ok(!source.includes('fetch('), 'the library fetches something');
  assert.ok(!source.includes('data:image'), 'the library embeds a bitmap');
});

/* ------------------------------------------------------------------ *
 * Mockup scenes
 * ------------------------------------------------------------------ */

test('the mockup pack adds exactly the six scenes it promises', () => {
  const source = read('studio/modules/_shared/mockups.mjs');
  const extras = [...source.matchAll(/^\s{2}(\w+):\s*\{\s*$/gm)].length;
  assert.ok(extras >= 12, 'expected twelve scenes in all, found ' + extras);

  const marked = (source.match(/extra: true/g) || []).length;
  assert.equal(marked, 6, 'the pack should add six scenes, found ' + marked);

  const blurb = OPTIONS['mockup-pack'].blurb;
  assert.match(blurb, /Six more/i);
});

test('every scene the pack names on the product page exists', () => {
  const source = read('studio/modules/_shared/mockups.mjs');
  // Scene labels are sentence case, so the comparison ignores case.
  const labels = [...source.matchAll(/label: '([^']+)'/g)].map((m) => m[1].toLowerCase());

  for (const promised of ['cushion', 'mug', 'label', 'book cover', 'tiled wall', 'gift wrap']) {
    assert.ok(
      labels.includes(promised),
      'the pack promises a ' + promised + ' scene; mockups.mjs has ' + labels.join(', ')
    );
  }
});

/* ------------------------------------------------------------------ *
 * Large-format presets
 * ------------------------------------------------------------------ */

test('the large-format presets are real sizes, larger than the standard ones', () => {
  const source = read('studio/modules/production-studio/index.js');
  const block = source.slice(source.indexOf('const LARGE_PRESETS'), source.indexOf('const COLLECTIONS'));
  const sizes = [...block.matchAll(/inches: \[(\d+), (\d+)\]/g)].map((m) => [Number(m[1]), Number(m[2])]);

  assert.ok(sizes.length >= 6, 'expected at least six large presets, found ' + sizes.length);
  for (const [w, h] of sizes) {
    assert.ok(Math.max(w, h) >= 36, 'a large-format preset is only ' + w + ' x ' + h + ' inches');
  }
});

test('Production Studio works across every Collection, not the first five', () => {
  const source = read('studio/modules/production-studio/index.js');
  const block = source.slice(source.indexOf('const COLLECTIONS'), source.indexOf('export async function mount'));
  const slugs = [...block.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);

  const collections = PRODUCTS.filter((p) => p.tier === 'collection' && !p.grants).map((p) => p.slug);
  for (const slug of collections) {
    assert.ok(slugs.includes(slug), 'Production Studio does not know about ' + slug);
  }
});

test('the tools that work across Collections know about all of them', () => {
  const collections = PRODUCTS.filter((p) => p.tier === 'collection' && !p.grants).map((p) => p.slug);
  for (const file of [
    'studio/modules/colorway-studio/index.js',
    'studio/modules/mockup-studio/index.js'
  ]) {
    const source = read(file);
    for (const slug of collections) {
      assert.ok(source.includes("'" + slug + "'"), file + ' does not know about ' + slug);
    }
  }
});
