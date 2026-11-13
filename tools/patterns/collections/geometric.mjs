/*
 * Geometric Essentials
 *
 * Grids, chevrons, triangles, hexagons, dots, and interlocking shapes.
 * Every recipe below is built from straight edges, regular angles, and
 * even spacing, and every one is laid out on an exact division of the tile
 * so that the repeat lands on the edge rather than near it.
 *
 * These are ordinary geometric constructions — grids, tessellations,
 * weaves — drawn from first principles. Nothing here reproduces or imitates
 * any existing designer's pattern or any company's mark.
 */

import { wrap, TAU, halfDropGrid } from '../lib.mjs';

const line = (x1, y1, x2, y2, w, stroke, cap = 'butt') => ({
  t: 'line', pts: [[x1, y1], [x2, y2]], w, stroke, cap
});

const poly = (pts, fill) => ({ t: 'poly', pts, fill });
const dot = (cx, cy, r, fill) => ({ t: 'circle', cx, cy, r, fill });
const ring = (cx, cy, r, w, stroke) => ({ t: 'ring', cx, cy, r, w, stroke });

/* ------------------------------------------------------------------ *
 * Recipes
 * ------------------------------------------------------------------ */

const RECIPES = {
  /* --- Grids --- */

  squareGrid(r, tile) {
    const n = r.pick([4, 5, 6, 8]);
    const step = tile / n;
    const w = step * r.range(0.06, 0.13);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(line(i * step, -1, i * step, tile + 1, w, 'ink'));
      out.push(line(-1, i * step, tile + 1, i * step, w, 'ink'));
    }
    if (r.chance(0.45)) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if ((i + j) % 2 === 0) out.push(dot(i * step, j * step, w * r.range(1.4, 2.2), 'accent'));
        }
      }
    }
    return out;
  },

  doubleGrid(r, tile) {
    const n = r.pick([3, 4, 6]);
    const step = tile / n;
    const w = step * 0.05;
    const gap = step * r.range(0.08, 0.16);
    const out = [];
    for (let i = 0; i < n; i++) {
      for (const d of [-gap, gap]) {
        out.push(line(i * step + d, -1, i * step + d, tile + 1, w, 'ink'));
        out.push(line(-1, i * step + d, tile + 1, i * step + d, w, 'ink'));
      }
    }
    return out;
  },

  brickGrid(r, tile) {
    const rows = r.pick([5, 6, 8]);
    const cols = r.pick([3, 4]);
    const rh = tile / rows;
    const cw = tile / cols;
    const w = rh * r.range(0.08, 0.14);
    const out = [];
    for (let i = 0; i <= rows; i++) out.push(line(-1, i * rh, tile + 1, i * rh, w, 'ink'));
    for (let row = 0; row < rows; row++) {
      const shift = row % 2 ? cw / 2 : 0;
      for (let c = 0; c < cols; c++) {
        const x = (c * cw + shift) % tile;
        out.push(line(x, row * rh, x, (row + 1) * rh, w, 'ink'));
      }
    }
    return out;
  },

  diagonalStripes(r, tile) {
    const count = r.pick([6, 8, 10, 12]);
    const step = (tile * 2) / count;
    const w = step * r.range(0.18, 0.42);
    const out = [];
    for (let i = -count; i <= count * 2; i++) {
      const o = i * step;
      out.push(line(o - tile, -1, o + tile, tile + 1, w, i % 2 === 0 ? 'ink' : 'accent'));
    }
    return out;
  },

  diamondLattice(r, tile) {
    const n = r.pick([4, 5, 6]);
    const step = tile / n;
    const w = step * r.range(0.05, 0.1);
    const out = [];
    for (let i = -n; i <= n * 2; i++) {
      out.push(line(i * step - tile, -1, i * step + tile, tile + 1, w, 'ink'));
      out.push(line(i * step - tile, tile + 1, i * step + tile, -1, w, 'ink'));
    }
    if (r.chance(0.5)) {
      for (const [x, y] of halfDropGrid(tile, n, n)) {
        out.push(dot(x, y, step * r.range(0.07, 0.13), 'accent'));
      }
    }
    return out;
  },

  /* --- Chevrons and zigzags --- */

  chevronBands(r, tile) {
    const bands = r.pick([4, 5, 6]);
    const peaks = r.pick([2, 3, 4]);
    const bh = tile / bands;
    const pw = tile / peaks;
    const out = [];
    for (let b = 0; b < bands; b++) {
      const y = b * bh;
      const pts = [];
      for (let i = 0; i <= peaks * 2; i++) {
        pts.push([(i * pw) / 2, y + (i % 2 === 0 ? 0 : bh * 0.62)]);
      }
      const lower = pts.map(([x, py]) => [x, py + bh]).reverse();
      out.push(poly(pts.concat(lower), b % 2 === 0 ? 'ink' : 'accent'));
    }
    return out;
  },

  zigzagLines(r, tile) {
    const rows = r.pick([4, 6, 8]);
    const peaks = r.pick([3, 4, 6]);
    const rh = tile / rows;
    const pw = tile / peaks;
    const w = rh * r.range(0.1, 0.2);
    const out = [];
    for (let row = 0; row <= rows; row++) {
      const pts = [];
      for (let i = 0; i <= peaks * 2; i++) {
        pts.push([(i * pw) / 2, row * rh + (i % 2 === 0 ? -rh * 0.22 : rh * 0.22)]);
      }
      out.push({ t: 'line', pts, w, stroke: row % 2 === 0 ? 'ink' : 'accent', cap: 'butt', join: 'miter' });
    }
    return out;
  },

  /* --- Triangles --- */

  triangleRows(r, tile) {
    const cols = r.pick([4, 5, 6]);
    const rows = r.pick([4, 5, 6]);
    const cw = tile / cols;
    const rh = tile / rows;
    const out = [];
    for (let row = 0; row < rows; row++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw;
        const y = row * rh;
        const up = (c + row) % 2 === 0;
        const fill = up ? 'ink' : 'accent';
        out.push(poly(
          up
            ? [[x, y + rh], [x + cw / 2, y], [x + cw, y + rh]]
            : [[x, y], [x + cw, y], [x + cw / 2, y + rh]],
          fill
        ));
      }
    }
    return out;
  },

  halfSquares(r, tile) {
    const n = r.pick([4, 6, 8]);
    const step = tile / n;
    // A rule rather than a coin toss: these are the arrangements that make
    // half-square triangles read as a design instead of as noise.
    const layouts = [
      (i, j) => (i + j) % 4,
      (i, j) => (i % 2) + (j % 2) * 2,
      (i, j) => ((i + j) % 2) * 2 + (j % 2),
      (i, j) => (Math.floor(i / 2) + Math.floor(j / 2)) % 4,
      (i, j) => (i * 2 + j) % 4
    ];
    const layout = r.pick(layouts);
    const twoTone = r.chance(0.6);
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * step;
        const y = j * step;
        const turn = layout(i, j) % 4;
        const corners = [[x, y], [x + step, y], [x + step, y + step], [x, y + step]];
        out.push(poly(
          [corners[turn], corners[(turn + 1) % 4], corners[(turn + 2) % 4]],
          twoTone && (i + j) % 2 === 0 ? 'accent' : 'ink'
        ));
      }
    }
    return out;
  },

  triangleOutlines(r, tile) {
    const cols = r.pick([3, 4, 5]);
    const cw = tile / cols;
    const rh = cw * 0.87;
    const rows = Math.round(tile / rh);
    const actualRh = tile / rows;
    const w = cw * r.range(0.05, 0.09);
    const out = [];
    for (let row = 0; row < rows; row++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw + (row % 2 ? cw / 2 : 0);
        const y = row * actualRh;
        out.push({
          t: 'line',
          pts: [[x, y + actualRh], [x + cw / 2, y], [x + cw, y + actualRh], [x, y + actualRh]],
          w,
          stroke: 'ink',
          cap: 'round',
          join: 'round'
        });
      }
    }
    return out;
  },

  /* --- Hexagons --- */

  hexOutline(r, tile) {
    const cols = r.pick([3, 4]);
    const radius = tile / (cols * Math.sqrt(3));
    const w = radius * r.range(0.1, 0.18);
    const out = [];
    const hexHeight = radius * 1.5;
    const rows = Math.round(tile / hexHeight);
    const rh = tile / rows;
    const cw = tile / cols;
    for (let row = -1; row <= rows; row++) {
      for (let c = -1; c <= cols; c++) {
        const cx = c * cw + (row % 2 ? cw / 2 : 0);
        const cy = row * rh;
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + Math.PI / 6;
          pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
        }
        out.push({ t: 'line', pts, w, stroke: 'ink', closed: true, cap: 'round', join: 'round' });
      }
    }
    return out;
  },

  hexFilled(r, tile) {
    const cols = r.pick([3, 4, 5]);
    const cw = tile / cols;
    const radius = cw * 0.46;
    const rows = r.pick([4, 5, 6]);
    const rh = tile / rows;
    const out = [];
    for (let row = -1; row <= rows; row++) {
      for (let c = -1; c <= cols; c++) {
        const cx = c * cw + (row % 2 ? cw / 2 : 0);
        const cy = row * rh;
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + Math.PI / 6;
          pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
        }
        out.push(poly(pts, (row + c) % 3 === 0 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  /* --- Dots and circles --- */

  dotField(r, tile) {
    const n = r.pick([5, 6, 8, 10]);
    const step = tile / n;
    const radius = step * r.range(0.14, 0.3);
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        out.push(dot(i * step + step / 2, j * step + step / 2, radius, 'ink'));
      }
    }
    return out;
  },

  dotDuet(r, tile) {
    const n = r.pick([4, 5, 6]);
    const step = tile / n;
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * step + step / 2;
        const y = j * step + step / 2;
        out.push(dot(x, y, step * r.range(0.16, 0.24), 'ink'));
        out.push(dot(x + step / 2, y + step / 2, step * r.range(0.06, 0.1), 'accent'));
      }
    }
    return out;
  },

  ringGrid(r, tile) {
    const n = r.pick([3, 4, 5]);
    const step = tile / n;
    const w = step * r.range(0.04, 0.08);
    const count = r.pick([2, 3]);
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = i * step + step / 2;
        const cy = j * step + step / 2;
        for (let k = 1; k <= count; k++) {
          out.push(ring(cx, cy, (step * 0.42 * k) / count, w, k === count ? 'accent' : 'ink'));
        }
      }
    }
    return out;
  },

  quarterArcs(r, tile) {
    const n = r.pick([3, 4]);
    const step = tile / n;
    const w = step * r.range(0.13, 0.2);
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * step;
        const y = j * step;
        const turn = r.int(0, 3);
        const corners = [[x, y], [x + step, y], [x + step, y + step], [x, y + step]];
        const [cx, cy] = corners[turn];
        out.push({ t: 'arc', cx, cy, r: step * 0.5, a0: (turn * TAU) / 4, a1: (turn * TAU) / 4 + TAU / 4, w, stroke: 'ink', cap: 'butt' });
      }
    }
    return out;
  },

  scallops(r, tile) {
    const cols = r.pick([3, 4, 5]);
    const rows = r.pick([4, 5, 6]);
    const cw = tile / cols;
    const rh = tile / rows;
    const w = cw * r.range(0.06, 0.1);
    const out = [];
    for (let row = -1; row <= rows; row++) {
      for (let c = -1; c <= cols; c++) {
        const cx = c * cw + (row % 2 ? cw / 2 : 0);
        out.push({ t: 'arc', cx, cy: row * rh + rh, r: cw * 0.5, a0: Math.PI, a1: TAU, w, stroke: row % 2 ? 'accent' : 'ink', cap: 'butt' });
      }
    }
    return out;
  },

  circleInSquare(r, tile) {
    const n = r.pick([3, 4, 5]);
    const step = tile / n;
    const w = step * 0.06;
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * step;
        const y = j * step;
        out.push({ t: 'rect', x: x + step * 0.1, y: y + step * 0.1, w: step * 0.8, h: step * 0.8, fill: 'ink' });
        out.push(dot(x + step / 2, y + step / 2, step * 0.26, 'bg'));
        out.push(ring(x + step / 2, y + step / 2, step * 0.36, w, 'accent'));
      }
    }
    return out;
  },

  /* --- Interlocking and weaves --- */

  basketweave(r, tile) {
    const n = r.pick([3, 4]);
    const step = tile / n;
    const bar = step * 0.42;
    const gap = step * 0.04;
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * step;
        const y = j * step;
        const horizontal = (i + j) % 2 === 0;
        const fill = horizontal ? 'ink' : 'accent';
        for (let k = 0; k < 2; k++) {
          if (horizontal) {
            out.push({ t: 'rect', x: x + gap, y: y + gap + k * (bar + gap * 2), w: step - gap * 2, h: bar, fill, rx: bar * 0.18 });
          } else {
            out.push({ t: 'rect', x: x + gap + k * (bar + gap * 2), y: y + gap, w: bar, h: step - gap * 2, fill, rx: bar * 0.18 });
          }
        }
      }
    }
    return out;
  },

  herringbone(r, tile) {
    const n = r.pick([4, 6]);
    const step = tile / n;
    const w = step * r.range(0.3, 0.42);
    const out = [];
    for (let row = -1; row <= n * 2; row++) {
      for (let c = -1; c <= n; c++) {
        const x = c * step * 2 + (row % 2 ? step : 0);
        const y = row * step * 0.5;
        const up = (row + c) % 2 === 0;
        const fill = up ? 'ink' : 'accent';
        out.push({
          t: 'line',
          pts: up ? [[x, y + step], [x + step, y]] : [[x, y], [x + step, y + step]],
          w,
          stroke: fill,
          cap: 'butt'
        });
      }
    }
    return out;
  },

  interlockingL(r, tile) {
    const n = r.pick([3, 4]);
    const step = tile / n;
    const arm = step * 0.44;
    const thick = step * r.range(0.16, 0.24);
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = i * step + step / 2;
        const cy = j * step + step / 2;
        const turn = (i + j) % 4;
        const fill = (i + j) % 2 === 0 ? 'ink' : 'accent';
        const a = (turn * TAU) / 4;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        const vx = -uy;
        const vy = ux;
        out.push({
          t: 'line',
          pts: [
            [cx - ux * arm, cy - uy * arm],
            [cx, cy],
            [cx + vx * arm, cy + vy * arm]
          ],
          w: thick,
          stroke: fill,
          cap: 'butt',
          join: 'miter'
        });
      }
    }
    return out;
  },

  nestedSquares(r, tile) {
    const n = r.pick([2, 2, 3]);
    const step = tile / n;
    const rings = r.pick([2, 3]);
    const w = step * 0.05;
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = i * step + step / 2;
        const cy = j * step + step / 2;
        for (let k = 1; k <= rings; k++) {
          const s = (step * 0.82 * k) / rings;
          out.push({
            t: 'line',
            pts: [
              [cx - s / 2, cy - s / 2],
              [cx + s / 2, cy - s / 2],
              [cx + s / 2, cy + s / 2],
              [cx - s / 2, cy + s / 2]
            ],
            w,
            stroke: k % 2 ? 'ink' : 'accent',
            closed: true,
            cap: 'butt',
            join: 'miter'
          });
        }
      }
    }
    return out;
  },

  pinwheel(r, tile) {
    const n = r.pick([2, 3, 4]);
    const step = tile / n;
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * step;
        const y = j * step;
        const h = step / 2;
        out.push(poly([[x, y], [x + h, y], [x + h, y + h], [x, y + h]], 'ink'));
        out.push(poly([[x + h, y], [x + step, y], [x + step, y + h]], 'accent'));
        out.push(poly([[x + h, y + h], [x + step, y + h], [x + step, y + step]], 'ink'));
        out.push(poly([[x, y + h], [x + h, y + step], [x, y + step]], 'accent'));
      }
    }
    return out;
  },

  crosses(r, tile) {
    const n = r.pick([4, 5, 6]);
    const step = tile / n;
    const arm = step * r.range(0.26, 0.36);
    const w = step * r.range(0.08, 0.14);
    const out = [];
    for (const [x, y] of halfDropGrid(tile, n, n)) {
      out.push(line(x - arm, y, x + arm, y, w, 'ink', 'round'));
      out.push(line(x, y - arm, x, y + arm, w, 'ink', 'round'));
    }
    return out;
  },

  dashes(r, tile) {
    const cols = r.pick([5, 6, 8]);
    const rows = r.pick([5, 6, 8]);
    const cw = tile / cols;
    const rh = tile / rows;
    const w = rh * r.range(0.14, 0.22);
    const out = [];
    for (let row = 0; row < rows; row++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw + (row % 2 ? cw / 2 : 0);
        const y = row * rh + rh / 2;
        const vertical = r.chance(0.3);
        const len = (vertical ? rh : cw) * 0.56;
        if (vertical) out.push(line(x, y - len / 2, x, y + len / 2, w, 'ink', 'round'));
        else out.push(line(x - len / 2, y, x + len / 2, y, w, (row + c) % 3 === 0 ? 'accent' : 'ink', 'round'));
      }
    }
    return out;
  },

  steps(r, tile) {
    const n = r.pick([4, 6, 8]);
    const step = tile / n;
    const w = step * r.range(0.22, 0.34);
    const out = [];
    for (let k = -n; k <= n; k++) {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        pts.push([i * step + k * step, i * step]);
        pts.push([(i + 1) * step + k * step, i * step]);
      }
      out.push({ t: 'line', pts, w, stroke: k % 2 === 0 ? 'ink' : 'accent', cap: 'butt', join: 'miter' });
    }
    return out;
  },

  concentric(r, tile) {
    const rings = r.pick([4, 5, 6]);
    const w = (tile / rings) * r.range(0.1, 0.18);
    const out = [];
    // Corners only, so the four quarter-fans meet across the tile edges and
    // read as one continuous set of ripples.
    const origins = [[0, 0], [tile, 0], [0, tile], [tile, tile]];
    if (r.chance(0.5)) origins.push([tile / 2, tile / 2]);
    for (const [cx, cy] of origins) {
      for (let k = 1; k <= rings; k++) {
        out.push(ring(cx, cy, (tile / 2) * (k / rings) * 0.94, w, 'ink'));
      }
    }
    return out;
  }
};

/* ------------------------------------------------------------------ *
 * Generation
 * ------------------------------------------------------------------ */

const NAMES = {
  squareGrid: ['Drafting', 'Ledger', 'Graph', 'Plotting'],
  doubleGrid: ['Double Rule', 'Twin Line', 'Margin'],
  brickGrid: ['Running Bond', 'Stack Bond', 'Course'],
  diagonalStripes: ['Bias', 'Slant', 'Rake', 'Cant'],
  diamondLattice: ['Lattice', 'Trellis', 'Harlequin'],
  chevronBands: ['Chevron', 'Flight', 'Arrowhead'],
  zigzagLines: ['Zigzag', 'Pulse', 'Ric Rac'],
  triangleRows: ['Pennant', 'Bunting', 'Spire'],
  halfSquares: ['Half Square', 'Turning Point', 'Sail'],
  triangleOutlines: ['Open Triangle', 'Wireframe', 'Gable'],
  hexOutline: ['Honeycomb', 'Hex Outline', 'Comb'],
  hexFilled: ['Solid Hex', 'Hex Field', 'Cell'],
  dotField: ['Dot Field', 'Polka', 'Spot'],
  dotDuet: ['Dot Duet', 'Major Minor', 'Pair'],
  ringGrid: ['Ring Grid', 'Target', 'Eyelet'],
  quarterArcs: ['Quarter Arc', 'Turning Arc', 'Elbow'],
  scallops: ['Scallop', 'Fishscale', 'Shell'],
  circleInSquare: ['Port Hole', 'Inset Circle', 'Aperture'],
  basketweave: ['Basketweave', 'Parquet', 'Woven'],
  herringbone: ['Herringbone', 'Chevron Weave', 'Feather'],
  interlockingL: ['Interlock', 'Key', 'Bracket'],
  nestedSquares: ['Nested Square', 'Frame', 'Concentric Square'],
  pinwheel: ['Pinwheel', 'Windmill', 'Turnstile'],
  crosses: ['Plus', 'Cross Stitch', 'Crossing'],
  dashes: ['Dash', 'Stitch', 'Tally'],
  steps: ['Staircase', 'Stepped', 'Riser'],
  concentric: ['Concentric', 'Ripple', 'Echo']
};

const SUFFIX = ['One', 'Two', 'Three', 'Fine', 'Bold', 'Wide', 'Close', 'Open', 'Soft', 'Sharp'];

export const COLLECTION = 'geometric-essentials';
export const PREFIX = 'geo';
export const TARGET = 40;
export const TILES = [240, 240, 288, 320];
export { RECIPES };

/** The display name and tags for the nth use of a recipe. */
export function metaFor(key, seen) {
  const names = NAMES[key];
  const base = names[seen % names.length];
  const name = seen < names.length ? base : base + ' ' + SUFFIX[seen % SUFFIX.length];
  return { name, tags: tagsFor(key) };
}

function tagsFor(key) {
  const map = {
    squareGrid: ['grid', 'lines'],
    doubleGrid: ['grid', 'lines'],
    brickGrid: ['grid', 'brick'],
    diagonalStripes: ['stripes', 'diagonal'],
    diamondLattice: ['lattice', 'diagonal'],
    chevronBands: ['chevron', 'bold'],
    zigzagLines: ['chevron', 'lines'],
    triangleRows: ['triangles', 'bold'],
    halfSquares: ['triangles', 'blocks'],
    triangleOutlines: ['triangles', 'lines'],
    hexOutline: ['hexagons', 'lines'],
    hexFilled: ['hexagons', 'blocks'],
    dotField: ['dots'],
    dotDuet: ['dots'],
    ringGrid: ['dots', 'lines'],
    quarterArcs: ['arcs', 'lines'],
    scallops: ['arcs', 'scallop'],
    circleInSquare: ['dots', 'blocks'],
    basketweave: ['interlocking', 'blocks'],
    herringbone: ['interlocking', 'diagonal'],
    interlockingL: ['interlocking', 'lines'],
    nestedSquares: ['squares', 'lines'],
    pinwheel: ['triangles', 'blocks'],
    crosses: ['crosses', 'lines'],
    dashes: ['dashes', 'lines'],
    steps: ['steps', 'diagonal'],
    concentric: ['arcs', 'dots']
  };
  return map[key] || ['geometric'];
}

export default { COLLECTION, TARGET, TILES, RECIPES, metaFor };
