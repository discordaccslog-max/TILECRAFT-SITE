/*
 * A contact sheet of the texture collection, recolored the way the Studio
 * recolors them: the grayscale is used to mix between the background and
 * the ink of a colorway.
 *
 *   node tools/patterns/texture-sheet.mjs [colorway]
 *
 * Build-time only.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { encodePng } from './raster.mjs';
import { hexToRgb } from '../../js/patterns/engine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const collection = 'textures-and-grain';
const colorwayIndex = Number(process.argv[2] || 0);

const specs = JSON.parse(fs.readFileSync(path.join(root, 'patterns', collection, 'specs.json'), 'utf8'));

/* A minimal reader for the grayscale PNGs this project writes. */
function readGrayPng(file) {
  const buf = fs.readFileSync(file);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('latin1', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width + 1);
    const filter = raw[rowStart];
    for (let x = 0; x < width; x++) {
      const value = raw[rowStart + 1 + x];
      out[y * width + x] = filter === 1 ? (value + (x > 0 ? out[y * width + x - 1] : 0)) & 0xff : value;
    }
  }
  return { width, height, data: out };
}

const CELL = 150;
const GAP = 6;
const cols = 6;
const rows = Math.ceil(specs.length / cols);
const width = cols * (CELL + GAP) + GAP;
const height = rows * (CELL + GAP) + GAP;
const sheet = new Uint8Array(width * height * 3).fill(238);

specs.forEach((spec, index) => {
  const colorway = spec.colorways[colorwayIndex % spec.colorways.length];
  const bg = hexToRgb(colorway.colors.bg);
  const ink = hexToRgb(colorway.colors.ink);
  const tex = readGrayPng(path.join(root, 'patterns', collection, spec.raster));

  const cx = GAP + (index % cols) * (CELL + GAP);
  const cy = GAP + Math.floor(index / cols) * (CELL + GAP);

  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const g = tex.data[(y % tex.height) * tex.width + (x % tex.width)] / 255;
      const dst = ((cy + y) * width + cx + x) * 3;
      for (let c = 0; c < 3; c++) sheet[dst + c] = Math.round(bg[c] + (ink[c] - bg[c]) * g);
    }
  }
});

const out = path.join(here, 'sheet-' + collection + '.png');
fs.writeFileSync(out, encodePng(sheet, width, height, 3));
console.log('wrote ' + path.relative(root, out) + '  (' + specs.length + ' textures)');
