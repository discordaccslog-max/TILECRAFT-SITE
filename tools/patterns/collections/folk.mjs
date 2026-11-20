/*
 * Folk Geometry
 *
 * Counted-thread geometry: cross-stitch blocks, diamond bands, stepped
 * borders and small block flowers. Everything is built on a square count,
 * the way counted embroidery is, so the motifs land on whole cells and the
 * borders meet exactly at the tile edge.
 *
 * These are generic counted-thread constructions drawn from first
 * principles. Nothing here reproduces or imitates a particular community's
 * traditional textile, any existing designer's pattern, or any company's
 * mark.
 */

import { wrap } from '../lib.mjs';

const cell = (x, y, size, fill) => ({ t: 'rect', x, y, w: size, h: size, fill });

/** Stamp a small bitmap of cells, given as rows of characters. */
function stamp(out, rows, originX, originY, size, legend) {
  rows.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      const slot = legend[ch];
      if (slot) out.push(cell(originX + i * size, originY + j * size, size, slot));
    });
  });
}

/* Motifs as little bitmaps: '.' is bare ground. */
const FLOWER = [
  '..A..',
  '.AAA.',
  'ABBBA',
  '.AAA.',
  '..A..'
];

const DIAMOND = [
  '..A..',
  '.ABA.',
  'AB.BA',
  '.ABA.',
  '..A..'
];

const CROSS = [
  'A...A',
  '.A.A.',
  '..B..',
  '.A.A.',
  'A...A'
];

const STAR8 = [
  '..A..',
  'A.A.A',
  '.ABA.',
  'A.A.A',
  '..A..'
];

const RECIPES = {
  crossStitch(r, tile) {
    // A field of small crosses on a counted grid.
    const n = r.pick([8, 10, 12, 16]);
    const size = tile / n;
    const dense = r.chance(0.5);
    const out = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (!dense && (i + j) % 2) continue;
        const slot = (i + j) % 4 === 0 ? 'accent' : 'ink';
        out.push(cell(i * size, j * size, size * 0.92, slot));
      }
    }
    return out;
  },

  blockFlowers(r, tile) {
    // Counted block flowers on a grid, every other row dropped.
    const n = r.pick([2, 3, 4]);
    const step = tile / n;
    const size = step / 7;
    const drop = r.chance(0.6);
    const motif = r.pick([FLOWER, STAR8, DIAMOND]);
    const out = [];

    for (let j = 0; j < n; j++) {
      const offset = drop && j % 2 ? step / 2 : 0;
      for (let i = 0; i <= n; i++) {
        stamp(out, motif, i * step + offset + size, j * step + size, size, { A: 'ink', B: 'accent' });
      }
    }
    return out;
  },

  diamondBands(r, tile) {
    /*
     * Rows of counted diamonds separated by rules. The diamond width is a
     * whole number of cells and the row is a whole number of diamonds, so
     * the band closes.
     */
    const rows = r.pick([3, 4, 6]);
    const rowStep = tile / rows;
    const perRow = r.pick([3, 4, 6]);
    const unit = tile / perRow;
    const size = unit / 7;
    const out = [];

    for (let j = 0; j < rows; j++) {
      const y = j * rowStep;
      // The rule above each band.
      out.push({ t: 'rect', x: -1, y, w: tile + 2, h: size, fill: 'accent2' });
      for (let i = 0; i < perRow; i++) {
        stamp(out, DIAMOND, i * unit + size, y + size * 1.6, size, {
          A: j % 2 ? 'accent' : 'ink',
          B: 'accent2'
        });
      }
    }
    return out;
  },

  steppedBorder(r, tile) {
    /*
     * A stepped key border running across the tile: up a few cells, along,
     * down again, so the line returns to its starting height.
     */
    const rows = r.pick([2, 3, 4]);
    const rowStep = tile / rows;
    const cells = r.pick([12, 16, 20]);
    const size = tile / cells;
    const height = r.pick([2, 3]);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const base = j * rowStep + rowStep / 2;
      const slot = j % 2 ? 'accent' : 'ink';
      for (let i = 0; i < cells; i++) {
        // A triangle wave over the cell index, in whole cells.
        const phase = i % (height * 2);
        const lift = phase <= height ? phase : height * 2 - phase;
        out.push(cell(i * size, base - lift * size, size, slot));
      }
    }
    return out;
  },

  zigzagBands(r, tile) {
    // Chevron rows drawn in counted cells, two colours alternating.
    const bands = r.pick([2, 3, 4]);
    const bandStep = tile / bands;
    const cells = r.pick([8, 12, 16]);
    const size = tile / cells;
    const thickness = r.pick([1, 2]);
    const out = [];

    for (let b = 0; b < bands; b++) {
      const base = b * bandStep + bandStep / 2;
      for (let i = 0; i < cells; i++) {
        const up = i < cells / 2;
        const lift = up ? i : cells - i;
        for (let k = 0; k < thickness; k++) {
          out.push(cell(i * size, base - lift * size * 0.5 + k * size, size, b % 2 ? 'accent' : 'ink'));
        }
      }
    }
    return out;
  },

  rowOfTrees(r, tile) {
    /*
     * A counted conifer: a stack of rows, each one cell wider than the
     * last, on a short trunk. A standing motif rather than a flat one.
     */
    const cols = r.pick([3, 4, 5]);
    const rows = r.pick([2, 3]);
    const cw = tile / cols;
    const ch = tile / rows;
    const size = Math.min(cw, ch) / 9;
    const tiers = r.pick([3, 4]);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? cw / 2 : 0;
      for (let i = 0; i <= cols; i++) {
        const cx = i * cw + offset;
        const top = j * ch + ch * 0.18;
        for (let t = 0; t < tiers; t++) {
          const width = (t + 1) * 2 - 1;
          for (let k = 0; k < width; k++) {
            out.push(cell(cx + (k - (width - 1) / 2) * size, top + t * size, size, 'ink'));
          }
        }
        out.push(cell(cx, top + tiers * size, size, 'accent'));
      }
    }
    return out;
  },

  checkerDiamond(r, tile) {
    // Large diamonds filled with a counted chequer.
    const n = r.pick([2, 3, 4]);
    const step = tile / n;
    const cells = r.pick([6, 8]);
    const size = step / cells;
    const out = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let a = 0; a < cells; a++) {
          for (let b = 0; b < cells; b++) {
            // Inside the diamond when the taxicab distance from the centre
            // is within half the cell count.
            const da = Math.abs(a - (cells - 1) / 2);
            const db = Math.abs(b - (cells - 1) / 2);
            if (da + db > cells / 2) continue;
            const slot = (a + b) % 2 ? 'accent' : 'ink';
            out.push(cell(i * step + a * size, j * step + b * size, size, slot));
          }
        }
      }
    }
    return out;
  },

  bandedRows(r, tile) {
    // Alternating counted bands: solid, dotted, solid, open.
    const rows = r.pick([6, 8, 10, 12]);
    const rowStep = tile / rows;
    const cells = r.pick([12, 16, 20]);
    const size = tile / cells;
    const out = [];

    for (let j = 0; j < rows; j++) {
      const kind = j % 4;
      const y = j * rowStep;
      if (kind === 0) {
        out.push({ t: 'rect', x: -1, y, w: tile + 2, h: rowStep * 0.5, fill: 'ink' });
      } else if (kind === 1) {
        for (let i = 0; i < cells; i += 2) out.push(cell(i * size, y, size, 'accent'));
      } else if (kind === 2) {
        out.push({ t: 'rect', x: -1, y, w: tile + 2, h: rowStep * 0.22, fill: 'accent2' });
      }
    }
    return out;
  },

  hookBorder(r, tile) {
    /*
     * A meander: a counted line that runs along, turns in on itself and
     * comes back out. The unit is square so it tiles both ways.
     */
    const units = r.pick([3, 4, 6]);
    const unit = tile / units;
    const size = unit / 6;
    const rows = r.pick([2, 3, 4]);
    const rowStep = tile / rows;
    const out = [];

    const HOOK = [
      'AAAAA.',
      'A.....',
      'A.AAA.',
      'A.A...',
      'A.A.A.',
      '....A.'
    ];

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < units; i++) {
        stamp(out, HOOK, i * unit, j * rowStep + rowStep * 0.1, size, {
          A: j % 2 ? 'accent' : 'ink'
        });
      }
    }
    return out;
  },

  seedRows(r, tile) {
    // Small counted seeds in offset rows, the simplest folk filler.
    const cols = r.pick([6, 8, 10]);
    const rows = r.pick([6, 8, 10]);
    const cw = tile / cols;
    const ch = tile / rows;
    const size = Math.min(cw, ch) * r.range(0.22, 0.42);
    const pair = r.chance(0.5);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? cw / 2 : 0;
      for (let i = 0; i <= cols; i++) {
        const cx = i * cw + offset;
        const cy = (j + 0.5) * ch;
        out.push(cell(cx - size / 2, cy - size / 2, size, (i + j) % 2 ? 'accent' : 'ink'));
        if (pair) out.push(cell(cx - size / 2, cy - size / 2 - size * 1.4, size * 0.6, 'accent2'));
      }
    }
    return out;
  },

  medallionBlock(r, tile) {
    // One large counted medallion per cell, built from concentric rings
    // of cells rather than from circles.
    const n = r.pick([2, 3]);
    const step = tile / n;
    const cells = r.pick([9, 11]);
    const size = step / cells;
    const out = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const mid = (cells - 1) / 2;
        for (let a = 0; a < cells; a++) {
          for (let b = 0; b < cells; b++) {
            const ring2 = Math.max(Math.abs(a - mid), Math.abs(b - mid));
            if (ring2 % 2 === 1) continue;
            const slot = ring2 === 0 ? 'accent2' : ring2 % 4 === 0 ? 'ink' : 'accent';
            out.push(cell(i * step + a * size, j * step + b * size, size, slot));
          }
        }
      }
    }
    return out;
  }
};

/* ------------------------------------------------------------------ *
 * Metadata
 * ------------------------------------------------------------------ */

const NAMES = {
  crossStitch: ['Cross Stitch', 'Counted Ground', 'Sampler'],
  blockFlowers: ['Block Flower', 'Stitched Bloom', 'Posy Square'],
  diamondBands: ['Diamond Band', 'Counted Diamond', 'Lozenge Row'],
  steppedBorder: ['Stepped Border', 'Key Line', 'Terrace Run'],
  zigzagBands: ['Zigzag Band', 'Counted Chevron', 'Peak Row'],
  rowOfTrees: ['Tree Row', 'Conifer', 'Forest Count'],
  checkerDiamond: ['Checked Diamond', 'Harlequin Count', 'Filled Lozenge'],
  bandedRows: ['Banded Row', 'Sampler Band', 'Rule and Dot'],
  hookBorder: ['Hook Border', 'Meander', 'Turned Line'],
  seedRows: ['Seed Row', 'Counted Seed', 'Grain Square'],
  medallionBlock: ['Block Medallion', 'Counted Roundel', 'Square Rose']
};

const SUFFIX = ['Two', 'Bold', 'Fine', 'Close', 'Wide'];

export const COLLECTION = 'folk-geometry';
export const PREFIX = 'flk';
export const TARGET = 22;
export const TILES = [240, 288, 336];
export const COVERAGE = { minInk: 0.03 };
export { RECIPES };

export function metaFor(key, seen) {
  const names = NAMES[key];
  if (!names) throw new Error('folk-geometry: no names for recipe ' + key);
  const base = names[seen % names.length];
  return {
    name: seen < names.length ? base : base + ' ' + SUFFIX[seen % SUFFIX.length],
    tags: tagsFor(key)
  };
}

function tagsFor(key) {
  const map = {
    crossStitch: ['counted', 'grid', 'dense'],
    blockFlowers: ['counted', 'flowers', 'motif'],
    diamondBands: ['counted', 'diamonds', 'bands'],
    steppedBorder: ['counted', 'stepped', 'border'],
    zigzagBands: ['counted', 'chevron', 'bands'],
    rowOfTrees: ['counted', 'trees', 'motif'],
    checkerDiamond: ['counted', 'diamonds', 'checked'],
    bandedRows: ['counted', 'bands', 'rows'],
    hookBorder: ['counted', 'meander', 'border'],
    seedRows: ['counted', 'seeds', 'scattered'],
    medallionBlock: ['counted', 'medallion', 'motif']
  };
  return map[key] || ['folk'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, COVERAGE, metaFor };
