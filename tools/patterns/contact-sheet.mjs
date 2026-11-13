/*
 * A contact sheet of a collection, for looking at the patterns the way a
 * buyer would: tiled, at a few scales, side by side.
 *
 *   node tools/patterns/contact-sheet.mjs <collection> [tilesAcross] [colorway]
 *
 * Writes tools/patterns/sheet-<collection>.png. Build-time only.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rasterize, encodePng } from './raster.mjs';
import { colorsOf } from '../../js/patterns/engine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

const collection = process.argv[2];
const across = Number(process.argv[3] || 8);
const colorwayIndex = Number(process.argv[4] || 0);

const specs = JSON.parse(
  fs.readFileSync(path.join(root, 'patterns', collection, 'specs.json'), 'utf8')
);

const CELL = 150;     // pixels per pattern cell on the sheet
const REPEATS = 2;    // how many times the tile repeats inside a cell
const GAP = 6;
const LABEL = 0;

const cols = across;
const rows = Math.ceil(specs.length / cols);
const width = cols * (CELL + GAP) + GAP;
const height = rows * (CELL + GAP + LABEL) + GAP;
const sheet = new Uint8Array(width * height * 3).fill(238);

specs.forEach((spec, index) => {
  const colors = colorsOf(spec, colorwayIndex);
  const unit = Math.round(CELL / REPEATS);
  const tileImage = rasterize(spec, colors, unit);

  const cx = GAP + (index % cols) * (CELL + GAP);
  const cy = GAP + Math.floor(index / cols) * (CELL + GAP + LABEL);

  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const src = ((y % unit) * unit + (x % unit)) * 3;
      const dst = ((cy + y) * width + cx + x) * 3;
      sheet[dst] = tileImage.data[src];
      sheet[dst + 1] = tileImage.data[src + 1];
      sheet[dst + 2] = tileImage.data[src + 2];
    }
  }
});

const out = path.join(here, 'sheet-' + collection + '.png');
fs.writeFileSync(out, encodePng(sheet, width, height, 3));
console.log(
  'wrote ' + path.relative(root, out) + '  (' + specs.length + ' patterns, ' +
  width + 'x' + height + ')'
);
