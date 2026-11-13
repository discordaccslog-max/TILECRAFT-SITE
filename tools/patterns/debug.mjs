/*
 * Diagnose one recipe.
 *
 *   node tools/patterns/debug.mjs <collection-module> <recipe> [attempt]
 *
 * Renders the tile, reports where its edges disagree, and writes a 2x2
 * tiling to tools/patterns/debug.png so the seam can be looked at.
 *
 * Build-time only.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rasterize, checkSeams, encodePng } from './raster.mjs';
import { rng, colorwaysFor } from './lib.mjs';
import { colorsOf } from '../../js/patterns/engine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [moduleName, recipeName, attemptArg] = process.argv.slice(2);

const module = await import('./collections/' + moduleName + '.mjs');
const attempt = Number(attemptArg || 0);
const seed = module.COLLECTION + ':' + recipeName + ':0:' + attempt;
const random = rng(seed);
const tile = module.TILES[random.int(0, module.TILES.length - 1)];

const spec = {
  name: recipeName,
  tile,
  colorways: colorwaysFor(module.COLLECTION, rng(seed + ':colors'), 4),
  draw: module.RECIPES[recipeName](random, tile)
};

const colors = colorsOf(spec, 0);
const size = 256;
const image = rasterize(spec, colors, size);
const seams = checkSeams(image);

console.log('recipe   ', recipeName, '| tile', tile, '| primitives', spec.draw.length);
console.log('vertical ', seams.vertical.edge.toFixed(2), 'limit', seams.vertical.limit.toFixed(2), seams.vertical.ok ? 'ok' : 'FAIL');
console.log('horizontal', seams.horizontal.edge.toFixed(2), 'limit', seams.horizontal.limit.toFixed(2), seams.horizontal.ok ? 'ok' : 'FAIL');

/* Where along each edge does it disagree? */
function worstRows(image) {
  const { width, height, data } = image;
  const rows = [];
  for (let y = 0; y < height; y++) {
    const a = (y * width + width - 1) * 3;
    const b = (y * width) * 3;
    const d = Math.abs(data[a] - data[b]) + Math.abs(data[a + 1] - data[b + 1]) + Math.abs(data[a + 2] - data[b + 2]);
    rows.push([y, d / 3]);
  }
  return rows.sort((p, q) => q[1] - p[1]).slice(0, 6);
}

function worstCols(image) {
  const { width, height, data } = image;
  const cols = [];
  for (let x = 0; x < width; x++) {
    const a = ((height - 1) * width + x) * 3;
    const b = x * 3;
    const d = Math.abs(data[a] - data[b]) + Math.abs(data[a + 1] - data[b + 1]) + Math.abs(data[a + 2] - data[b + 2]);
    cols.push([x, d / 3]);
  }
  return cols.sort((p, q) => q[1] - p[1]).slice(0, 6);
}

console.log('worst rows (left/right): ', worstRows(image).map(([y, d]) => y + ':' + d.toFixed(0)).join('  '));
console.log('worst cols (top/bottom): ', worstCols(image).map(([x, d]) => x + ':' + d.toFixed(0)).join('  '));

/* A 2x2 tiling, so the seam is visible. */
const out = new Uint8Array(size * 2 * size * 2 * 3);
for (let y = 0; y < size * 2; y++) {
  for (let x = 0; x < size * 2; x++) {
    const src = ((y % size) * size + (x % size)) * 3;
    const dst = (y * size * 2 + x) * 3;
    out[dst] = image.data[src];
    out[dst + 1] = image.data[src + 1];
    out[dst + 2] = image.data[src + 2];
  }
}
fs.writeFileSync(path.join(here, 'debug.png'), encodePng(out, size * 2, size * 2, 3));
console.log('wrote tools/patterns/debug.png');
