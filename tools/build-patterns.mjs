/*
 * Tilecraft Digital — pattern build
 *
 *   node tools/build-patterns.mjs [collection]
 *
 * Generates every pattern in code, checks each one, and writes:
 *
 *   patterns/<collection>/specs.json     the specs the Studio recolors from
 *   patterns/<collection>/catalog.json   metadata: names, tags, colorways
 *   patterns/<collection>/svg/<id>.svg   the shipped vector tile
 *   patterns/<collection>/tex/<id>.png   raster tiles, for the textures
 *
 * Every pattern is rasterized and put through three checks before it is
 * accepted. Anything that fails is discarded and regenerated with a new
 * seed, up to a limit, and the build fails loudly rather than shipping a
 * pattern that does not tile.
 *
 *   seams     the tile's edges must meet their opposite edge as smoothly
 *             as the tile meets itself anywhere inside
 *   coverage  the tile must carry ink, must not be a solid block, and must
 *             not leave a bare cell that would read as a gap when tiled
 *   svg       the written file must parse and must declare the right box
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderSvg, colorsOf } from '../js/patterns/engine.mjs';
import {
  rasterize, checkSeams, checkCoverage, checkPeriodic,
  fingerprint, fingerprintDistance, textureFingerprint, encodePng
} from './patterns/raster.mjs';
import { rng, colorwaysFor, wrap } from './patterns/lib.mjs';

import * as geometric from './patterns/collections/geometric.mjs';
import * as textures from './patterns/collections/textures.mjs';
import * as botanical from './patterns/collections/botanical.mjs';
import * as midcentury from './patterns/collections/midcentury.mjs';
import * as tiles from './patterns/collections/tile.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = [geometric, textures, botanical, midcentury, tiles];
const ATTEMPTS = 30;
const CHECK_SIZE = 320;

/*
 * Patterns are compared in flat colours, so two of them are judged on what
 * they draw rather than on which colorway came first — a buyer can recolor
 * either one into the other, so colour is not what makes them different.
 */
const FLAT = { bg: '#ffffff', ink: '#000000', accent: '#808080', accent2: '#c0c0c0' };

/*
 * How far apart two patterns in one collection have to look.
 *
 * Measured rather than guessed: across the collections, patterns that are
 * genuinely different designs sit at least 6 apart on this scale, while a
 * pair that differed only in line weight measured 0.0. Four sits in the gap
 * between the two, so a duplicate is caught and a close relation is not.
 */
const LOOK_APART = 4;

/*
 * The same idea for textures, on the grain scale.
 *
 * Measured the same way: across the texture pack, pairs that were the same
 * grain at two sizes sat between 1 and 5 apart, while the median pair sat
 * at 27. Eight is clear of the duplicates and well under the median, so a
 * pack can still hold several weaves without them being the same weave.
 *
 * The first attempt at this pack drew thirty textures from fifteen recipes,
 * and a threshold had to be set high to stop each recipe's second draw
 * being a sibling of its first. That was treating the symptom: the pack now
 * has a recipe per texture, so the figure only has to catch two unrelated
 * recipes landing on the same surface. The sheet was reviewed by eye after
 * it was set, which is the check that actually matters.
 */
const GRAIN_APART = 8;

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const round = (n) => Math.round(n * 100) / 100;

/** Shrink a spec's numbers before writing, which halves the JSON. */
function compact(value) {
  if (typeof value === 'number') return round(value);
  if (Array.isArray(value)) return value.map(compact);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = compact(v);
    return out;
  }
  return value;
}

function idFor(prefix, index) {
  return prefix + '-' + String(index + 1).padStart(3, '0');
}

/** A plan of which recipe to use for each pattern in a collection. */
function planFor(module) {
  const keys = Object.keys(module.RECIPES);

  // Every recipe needs a name and tags, or patterns ship unlabelled.
  for (const key of keys) {
    const meta = module.metaFor(key, 0);
    if (!meta || !meta.name) {
      throw new Error(module.COLLECTION + ': recipe "' + key + '" has no name');
    }
  }

  const plan = [];
  const seen = {};
  for (let i = 0; i < module.TARGET; i++) {
    const key = keys[i % keys.length];
    seen[key] = (seen[key] || 0) + 1;
    plan.push({ key, seen: seen[key] - 1 });
  }
  return plan;
}

function validateSvg(document, tile) {
  // A standalone document opens with the XML declaration, which is what the
  // Studio exports and what is written to disk, so the element itself is
  // checked after it.
  if (!document.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')) {
    return 'has no XML declaration';
  }
  const svg = document.replace(/^<\?xml[^>]*\?>\s*/, '');

  if (!svg.startsWith('<svg ')) return 'does not start with an svg element';
  if (!svg.endsWith('</svg>')) return 'is not closed';
  if (!svg.includes('viewBox="0 0 ' + tile + ' ' + tile + '"')) return 'has the wrong viewBox';
  if (svg.includes('NaN') || svg.includes('Infinity')) return 'contains a number that is not finite';
  if (svg.includes('undefined')) return 'contains an undefined value';

  // Tags must balance, so the file opens anywhere.
  const opens = (svg.match(/<[a-zA-Z]/g) || []).length;
  const closes = (svg.match(/<\//g) || []).length;
  const selfClosing = (svg.match(/\/>/g) || []).length;
  if (opens !== closes + selfClosing) return 'has unbalanced tags';

  return null;
}

/* ------------------------------------------------------------------ *
 * Build one collection
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Textures: generated as pixels rather than shapes
 *
 * Grain has no outline to describe, so these recipes return a square of
 * values from 0 (bare) to 1 (full ink). The same seam and coverage checks
 * apply, run against the grayscale directly.
 * ------------------------------------------------------------------ */

function grayToImage(gray, size) {
  const data = new Uint8Array(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    // Checks run against ink-on-white, which is how a texture is read.
    const v = Math.round(255 - gray[i] * 255);
    data[i * 3] = v;
    data[i * 3 + 1] = v;
    data[i * 3 + 2] = v;
  }
  return { width: size, height: size, data };
}

function buildRasterCollection(module, report) {
  const collection = module.COLLECTION;
  const outDir = path.join(root, 'patterns', collection);
  const texDir = path.join(outDir, 'tex');

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(texDir, { recursive: true });

  const plan = planFor(module);
  const size = module.RASTER_SIZE;
  const specs = [];
  const catalog = [];
  let regenerated = 0;

  // As with the vector collections: a texture that looks like one already
  // in the pack is drawn again rather than shipped under a second name.
  const takenLooks = [];

  plan.forEach((entry, index) => {
    const id = idFor(module.PREFIX, index);
    const meta = module.metaFor(entry.key, entry.seen);
    let accepted = null;
    let lastProblem = 'not attempted';

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const seed = collection + ':' + entry.key + ':' + index + ':' + attempt;
      const random = rng(seed);

      let gray;
      try {
        gray = module.RECIPES[entry.key](random, size);
      } catch (error) {
        lastProblem = 'the recipe threw: ' + error.message;
        continue;
      }

      const image = grayToImage(gray, size);

      const seams = checkSeams(image);
      if (!seams.ok) {
        lastProblem =
          'the edges do not meet (vertical ' + seams.vertical.edge.toFixed(1) +
          '/' + seams.vertical.limit.toFixed(1) +
          ', horizontal ' + seams.horizontal.edge.toFixed(1) +
          '/' + seams.horizontal.limit.toFixed(1) + ')';
        continue;
      }

      // A texture that is nearly blank or nearly solid is not a texture.
      let total = 0;
      let peak = 0;
      for (const v of gray) {
        total += v;
        if (v > peak) peak = v;
      }
      const mean = total / gray.length;
      if (mean < 0.015 || mean > 0.9 || peak < 0.12) {
        lastProblem = 'the texture is too faint or too solid (mean ' + mean.toFixed(3) + ', peak ' + peak.toFixed(2) + ')';
        continue;
      }

      /*
       * Faintness is not the same as subtlety. A paper grain is meant to be
       * quiet, but one whose whole tonal range is a couple of dozen levels
       * disappears the moment it is used, so it is drawn again rather than
       * sold. The floor is set from the pack: the one texture that was
       * invisible on the contact sheet spanned 28 levels, and the quietest
       * usable one spanned 57.
       */
      const tones = [];
      for (let i = 0; i < image.data.length; i += 3 * 7) tones.push(image.data[i]);
      tones.sort((a, b) => a - b);
      const spread = tones[Math.floor(tones.length * 0.95)] - tones[Math.floor(tones.length * 0.05)];
      if (spread < 60) {
        lastProblem = 'the texture is too faint to see (it spans only ' + spread + ' levels of 255)';
        continue;
      }

      const look = textureFingerprint(image, 8);
      const twin = takenLooks.find((seen) => fingerprintDistance(seen.look, look) < GRAIN_APART);
      if (twin) {
        lastProblem =
          'it looks like ' + twin.id + ' (' +
          fingerprintDistance(twin.look, look).toFixed(1) + ' apart, ' + GRAIN_APART + ' needed)';
        continue;
      }

      accepted = { gray, mean, seed, attempt, look };
      if (attempt > 0) regenerated++;
      break;
    }

    if (!accepted) {
      report.failures.push(collection + '/' + id + ' (' + entry.key + '): ' + lastProblem);
      return;
    }

    takenLooks.push({ id, look: accepted.look });

    const bytes = new Uint8Array(size * size);
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.round(accepted.gray[i] * 255);
    fs.writeFileSync(path.join(texDir, id + '.png'), encodePng(bytes, size, size, 1));

    const thumbSize = 128;
    const factor = size / thumbSize;
    const thumb = new Uint8Array(thumbSize * thumbSize);
    for (let y = 0; y < thumbSize; y++) {
      for (let x = 0; x < thumbSize; x++) {
        let sum = 0;
        for (let dy = 0; dy < factor; dy++) {
          for (let dx = 0; dx < factor; dx++) {
            sum += accepted.gray[(y * factor + dy) * size + x * factor + dx];
          }
        }
        thumb[y * thumbSize + x] = Math.round((sum / (factor * factor)) * 255);
      }
    }
    fs.writeFileSync(path.join(texDir, id + '-thumb.png'), encodePng(thumb, thumbSize, thumbSize, 1));

    const colorways = colorwaysFor(collection, rng(accepted.seed + ':colors'), 4);

    const spec = {
      id,
      name: meta.name,
      collection,
      recipe: entry.key,
      tags: meta.tags,
      type: 'raster',
      tile: size,
      seed: accepted.seed,
      raster: 'tex/' + id + '.png',
      thumb: 'tex/' + id + '-thumb.png',
      rasterSize: size,
      density: Math.round(accepted.mean * 1000) / 1000,
      colorways
    };

    specs.push(spec);
    catalog.push({
      id,
      name: spec.name,
      tags: spec.tags,
      type: 'raster',
      tile: size,
      svg: null,
      raster: spec.raster,
      thumb: spec.thumb,
      colorways: colorways.map((c) => c.name)
    });
  });

  fs.writeFileSync(path.join(outDir, 'specs.json'), JSON.stringify(specs));
  fs.writeFileSync(
    path.join(outDir, 'catalog.json'),
    JSON.stringify(
      {
        collection,
        built: new Date().toISOString().slice(0, 10),
        count: catalog.length,
        colorwaysPerPattern: 4,
        patterns: catalog
      },
      null,
      1
    )
  );

  report.collections.push({
    collection,
    count: catalog.length,
    target: module.TARGET,
    regenerated,
    colorways: catalog.length * 4
  });

  return catalog.length;
}

function buildCollection(module, report) {
  if (module.KIND === 'raster') return buildRasterCollection(module, report);
  const collection = module.COLLECTION;
  const prefix = module.PREFIX;
  const outDir = path.join(root, 'patterns', collection);
  const svgDir = path.join(outDir, 'svg');
  const texDir = path.join(outDir, 'tex');

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(svgDir, { recursive: true });
  if (module.RASTER) fs.mkdirSync(texDir, { recursive: true });

  const plan = planFor(module);
  const specs = [];
  const catalog = [];
  let regenerated = 0;

  /*
   * What has already been accepted, so a pattern that looks like one
   * earlier in the collection can be rejected and drawn again. Two
   * patterns differing only in line weight are one pattern with two names,
   * and a buyer counting forty would be right to feel short-changed.
   */
  const takenLooks = [];

  plan.forEach((entry, index) => {
    const id = idFor(prefix, index);
    const meta = module.metaFor(entry.key, entry.seen);

    let accepted = null;
    let lastProblem = 'not attempted';

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const seed = collection + ':' + entry.key + ':' + index + ':' + attempt;
      const random = rng(seed);
      const tile = module.TILES[random.int(0, module.TILES.length - 1)];
      const colorways = colorwaysFor(collection, rng(seed + ':colors'), 4);

      let draw;
      try {
        // Every motif that crosses an edge is repeated on the opposite
        // side here, which is what makes the tile seamless. The checks
        // below then confirm it actually worked.
        draw = wrap(module.RECIPES[entry.key](random, tile), tile);
      } catch (error) {
        lastProblem = 'the recipe threw: ' + error.message;
        continue;
      }

      const spec = {
        id,
        name: meta.name,
        collection,
        recipe: entry.key,
        tags: meta.tags,
        type: module.RASTER ? 'raster' : 'vector',
        tile,
        seed,
        colorways,
        draw: compact(draw)
      };

      const colors = colorsOf(spec, 0);
      const image = rasterize(spec, colors, CHECK_SIZE);

      const seams = checkSeams(image);
      if (!seams.ok) {
        lastProblem =
          'the edges do not meet (vertical ' + seams.vertical.edge.toFixed(1) +
          ' against a limit of ' + seams.vertical.limit.toFixed(1) +
          ', horizontal ' + seams.horizontal.edge.toFixed(1) +
          ' against ' + seams.horizontal.limit.toFixed(1) + ')';
        continue;
      }

      // Matching edges is not the same as repeating. A construction that
      // does not close shows a line across a wall while its edges still
      // meet, so the tile is checked by translation as well.
      const periodic = checkPeriodic(spec, colors, 256);
      if (!periodic.ok) {
        lastProblem =
          'the tile does not repeat (shifting it by half a tile moves the artwork by ' +
          periodic.mean.toFixed(2) + ' per pixel, worst ' + periodic.worst.toFixed(0) + ')';
        continue;
      }

      const coverage = checkCoverage(image, colors.bg, module.COVERAGE);
      if (!coverage.ok) {
        lastProblem =
          'the tile is poorly filled (ink ' + (coverage.overall * 100).toFixed(1) +
          '%, emptiest cell ' + (coverage.emptiest * 100).toFixed(1) +
          '%, variance ' + coverage.variance.toFixed(0) + ')';
        continue;
      }

      // The same standalone document the Studio exports, so a file taken
      // from here and a file exported from a module are identical.
      const svg = renderSvg(spec, colors, { standalone: true });
      const svgProblem = validateSvg(svg, tile);
      if (svgProblem) {
        lastProblem = 'the SVG ' + svgProblem;
        continue;
      }

      // Flat colours, so two patterns are compared on their drawing
      // rather than on which colorway happened to come first.
      const look = fingerprint(rasterize(spec, FLAT, 192), 16);
      const twin = takenLooks.find((seen) => fingerprintDistance(seen.look, look) < LOOK_APART);
      if (twin) {
        lastProblem =
          'it looks like ' + twin.id + ' (' +
          fingerprintDistance(twin.look, look).toFixed(1) + ' apart, ' + LOOK_APART + ' needed)';
        continue;
      }

      accepted = { spec, svg, image, colors, attempt, look };
      if (attempt > 0) regenerated++;
      break;
    }

    if (!accepted) {
      report.failures.push(collection + '/' + id + ' (' + entry.key + '): ' + lastProblem);
      return;
    }

    takenLooks.push({ id, look: accepted.look });

    fs.writeFileSync(path.join(svgDir, id + '.svg'), accepted.svg + '\n');

    if (module.RASTER) {
      // Textures ship as a raster tile as well, at the resolution the
      // recipe asks for, so they can be used without redrawing.
      const size = module.RASTER_SIZE || 512;
      const big = rasterize(accepted.spec, accepted.colors, size);
      const gray = new Uint8Array(size * size);
      for (let i = 0; i < size * size; i++) {
        gray[i] = Math.round(
          0.2126 * big.data[i * 3] + 0.7152 * big.data[i * 3 + 1] + 0.0722 * big.data[i * 3 + 2]
        );
      }
      fs.writeFileSync(path.join(texDir, id + '.png'), encodePng(gray, size, size, 1));
      accepted.spec.raster = 'tex/' + id + '.png';
      accepted.spec.rasterSize = size;
    }

    specs.push(accepted.spec);
    catalog.push({
      id,
      name: accepted.spec.name,
      tags: accepted.spec.tags,
      type: accepted.spec.type,
      tile: accepted.spec.tile,
      svg: 'svg/' + id + '.svg',
      raster: accepted.spec.raster || null,
      colorways: accepted.spec.colorways.map((c) => c.name)
    });
  });

  fs.writeFileSync(path.join(outDir, 'specs.json'), JSON.stringify(specs));
  fs.writeFileSync(
    path.join(outDir, 'catalog.json'),
    JSON.stringify(
      {
        collection,
        built: new Date().toISOString().slice(0, 10),
        count: catalog.length,
        colorwaysPerPattern: 4,
        patterns: catalog
      },
      null,
      1
    )
  );

  report.collections.push({
    collection,
    count: catalog.length,
    target: module.TARGET,
    regenerated,
    colorways: catalog.length * 4
  });

  return catalog.length;
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

const only = process.argv[2];
const report = { collections: [], failures: [] };
const started = Date.now();

for (const module of MODULES) {
  if (only && module.COLLECTION !== only) continue;
  process.stdout.write('  ' + module.COLLECTION.padEnd(24));
  const count = buildCollection(module, report);
  process.stdout.write(count + ' patterns\n');
}

console.log('');
for (const c of report.collections) {
  console.log(
    '  ' + c.collection.padEnd(24) +
    String(c.count).padStart(3) + ' patterns, ' +
    String(c.colorways).padStart(4) + ' colorways' +
    (c.regenerated ? '   (' + c.regenerated + ' regenerated)' : '')
  );
}

/* ------------------------------------------------------------------ *
 * A summary the site reads
 *
 * The product pages state how many patterns and colorways a collection
 * holds. Those numbers come from here, written from what was actually
 * generated, so a page can never claim a count the files do not back up.
 * ------------------------------------------------------------------ */

if (!only) {
  const summary = {
    built: new Date().toISOString().slice(0, 10),
    collections: {},
    totals: { patterns: 0, colorways: 0 }
  };

  for (const c of report.collections) {
    summary.collections[c.collection] = {
      patterns: c.count,
      colorwaysPerPattern: 4,
      colorways: c.colorways
    };
    summary.totals.patterns += c.count;
    summary.totals.colorways += c.colorways;
  }

  fs.writeFileSync(path.join(root, 'patterns', 'index.json'), JSON.stringify(summary, null, 1));
}

const total = report.collections.reduce((n, c) => n + c.count, 0);
console.log('\n  ' + total + ' patterns in ' + ((Date.now() - started) / 1000).toFixed(1) + 's');

if (report.failures.length) {
  console.error('\nFAILED to produce ' + report.failures.length + ' pattern(s):');
  for (const f of report.failures) console.error('  ' + f);
  process.exitCode = 1;
}
