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
import { rasterize, checkSeams, checkCoverage, encodePng } from './patterns/raster.mjs';
import { rng, colorwaysFor, wrap } from './patterns/lib.mjs';

import * as geometric from './patterns/collections/geometric.mjs';
import * as textures from './patterns/collections/textures.mjs';
import * as botanical from './patterns/collections/botanical.mjs';
import * as midcentury from './patterns/collections/midcentury.mjs';
import * as tiles from './patterns/collections/tile.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = [geometric, textures, botanical, midcentury, tiles];
const ATTEMPTS = 14;
const CHECK_SIZE = 320;

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

function validateSvg(svg, tile) {
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

      accepted = { gray, mean, seed, attempt };
      if (attempt > 0) regenerated++;
      break;
    }

    if (!accepted) {
      report.failures.push(collection + '/' + id + ' (' + entry.key + '): ' + lastProblem);
      return;
    }

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

      const coverage = checkCoverage(image, colors.bg, module.COVERAGE);
      if (!coverage.ok) {
        lastProblem =
          'the tile is poorly filled (ink ' + (coverage.overall * 100).toFixed(1) +
          '%, emptiest cell ' + (coverage.emptiest * 100).toFixed(1) +
          '%, variance ' + coverage.variance.toFixed(0) + ')';
        continue;
      }

      const svg = renderSvg(spec, colors, { standalone: false });
      const svgProblem = validateSvg(svg, tile);
      if (svgProblem) {
        lastProblem = 'the SVG ' + svgProblem;
        continue;
      }

      accepted = { spec, svg, image, colors, attempt };
      if (attempt > 0) regenerated++;
      break;
    }

    if (!accepted) {
      report.failures.push(collection + '/' + id + ' (' + entry.key + '): ' + lastProblem);
      return;
    }

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

const total = report.collections.reduce((n, c) => n + c.count, 0);
console.log('\n  ' + total + ' patterns in ' + ((Date.now() - started) / 1000).toFixed(1) + 's');

if (report.failures.length) {
  console.error('\nFAILED to produce ' + report.failures.length + ' pattern(s):');
  for (const f of report.failures) console.error('  ' + f);
  process.exitCode = 1;
}
