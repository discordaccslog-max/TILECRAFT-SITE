/*
 * Tile & Terrazzo
 *
 * Ceramic-tile repeats, terrazzo, and mosaic.
 *
 * A tile pattern has to work twice: the single tile has to stand up on its
 * own, and four of them have to meet at a corner without producing an
 * accidental shape. Every repeat here is laid out on an exact division of
 * the tile, and the rotational blocks are built as a quarter-turn group so
 * that corners resolve by construction.
 *
 * These are generic ceramic and terrazzo constructions. Nothing reproduces
 * a specific manufacturer's design.
 */

import { TAU } from '../lib.mjs';

const poly = (pts, fill) => ({ t: 'poly', pts, fill });

/** Rotate a point about a centre. */
function rot(px, py, cx, cy, angle) {
  const dx = px - cx;
  const dy = py - cy;
  return [cx + dx * Math.cos(angle) - dy * Math.sin(angle), cy + dx * Math.sin(angle) + dy * Math.cos(angle)];
}

/** Draw a motif four times at quarter turns about a cell centre. */
function quarterTurns(motif, cx, cy) {
  const out = [];
  for (let k = 0; k < 4; k++) {
    const angle = (k * TAU) / 4;
    for (const p of motif) {
      const q = { ...p };
      if (q.pts) q.pts = q.pts.map(([x, y]) => rot(x, y, cx, cy, angle));
      if ('cx' in q && 'cy' in q) {
        const [nx, ny] = rot(q.cx, q.cy, cx, cy, angle);
        q.cx = nx;
        q.cy = ny;
        if (q.a0 != null) {
          q.a0 += angle;
          q.a1 += angle;
        }
        if (q.rot != null) q.rot += angle;
      }
      out.push(q);
    }
  }
  return out;
}

/** An irregular chip, as used in terrazzo. */
function chip(r, cx, cy, size) {
  const sides = r.int(5, 8);
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * TAU + r.range(-0.2, 0.2);
    const rad = size * r.range(0.6, 1.15);
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  return pts;
}

/* ------------------------------------------------------------------ *
 * Recipes
 * ------------------------------------------------------------------ */

const RECIPES = {
  terrazzoFine(r, tile) {
    const out = [];
    const count = r.int(650, 950);
    const slots = ['ink', 'accent', 'accent2'];
    for (let i = 0; i < count; i++) {
      out.push(poly(chip(r, r() * tile, r() * tile, tile * r.range(0.008, 0.018)), r.pick(slots)));
    }
    return out;
  },

  terrazzoMedium(r, tile) {
    const out = [];
    const count = r.int(260, 420);
    const slots = ['ink', 'accent', 'accent2'];
    for (let i = 0; i < count; i++) {
      out.push(poly(chip(r, r() * tile, r() * tile, tile * r.range(0.016, 0.034)), r.pick(slots)));
    }
    return out;
  },

  terrazzoBold(r, tile) {
    const out = [];
    const count = r.int(80, 130);
    const slots = ['ink', 'accent', 'accent2'];
    for (let i = 0; i < count; i++) {
      out.push(poly(chip(r, r() * tile, r() * tile, tile * r.range(0.03, 0.065)), r.pick(slots)));
    }
    // A scatter of fine chips stops the big ones looking stranded.
    for (let i = 0; i < count * 2; i++) {
      out.push(poly(chip(r, r() * tile, r() * tile, tile * r.range(0.006, 0.013)), r.pick(slots)));
    }
    return out;
  },

  mosaicSquares(r, tile) {
    const n = r.pick([10, 12, 16]);
    const step = tile / n;
    const gap = step * r.range(0.1, 0.18);
    const slots = ['ink', 'accent', 'accent2', 'bg'];
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const slot = r.pick(slots);
        if (slot === 'bg') continue;
        out.push({ t: 'rect', x: i * step + gap / 2, y: j * step + gap / 2, w: step - gap, h: step - gap, fill: slot, rx: step * 0.1 });
      }
    }
    return out;
  },

  mosaicRandomWalk(r, tile) {
    const n = r.pick([8, 10, 12]);
    const step = tile / n;
    const gap = step * 0.12;
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // A gradient of probability makes bands of colour rather than noise.
        const t = (Math.sin((i / n) * TAU) + Math.cos((j / n) * TAU)) * 0.25 + 0.5;
        const slot = r() < t ? 'ink' : r.chance(0.5) ? 'accent' : 'accent2';
        out.push({ t: 'rect', x: i * step + gap / 2, y: j * step + gap / 2, w: step - gap, h: step - gap, fill: slot });
      }
    }
    return out;
  },

  ceramicSquare(r, tile) {
    const n = r.pick([2, 3]);
    const step = tile / n;
    const w = step * r.range(0.04, 0.07);
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * step;
        const y = j * step;
        out.push({ t: 'rect', x, y, w: step, h: step, fill: 'bg' });
        out.push({ t: 'line', pts: [[x, y], [x + step, y], [x + step, y + step], [x, y + step]], w, stroke: 'ink', closed: true, cap: 'butt', join: 'miter' });
        const inset = step * r.range(0.16, 0.26);
        out.push({ t: 'line', pts: [[x + inset, y + inset], [x + step - inset, y + inset], [x + step - inset, y + step - inset], [x + inset, y + step - inset]], w: w * 0.7, stroke: 'accent', closed: true, cap: 'butt', join: 'miter' });
        out.push({ t: 'circle', cx: x + step / 2, cy: y + step / 2, r: step * r.range(0.07, 0.12), fill: 'ink' });
      }
    }
    return out;
  },

  quarterTurnBlock(r, tile) {
    const n = r.pick([2, 4]);
    const step = tile / n;
    const out = [];
    const w = step * r.range(0.05, 0.09);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = i * step + step / 2;
        const cy = j * step + step / 2;
        // One quadrant's worth of motif, then turned four times.
        const motif = [
          { t: 'arc', cx: cx - step / 2, cy: cy - step / 2, r: step * 0.5, a0: 0, a1: TAU / 4, w, stroke: 'ink', cap: 'butt' },
          { t: 'circle', cx: cx - step * 0.26, cy: cy - step * 0.26, r: step * 0.07, fill: 'accent' }
        ];
        out.push(...quarterTurns(motif, cx, cy));
      }
    }
    return out;
  },

  encausticStar(r, tile) {
    const n = r.pick([2, 3]);
    const step = tile / n;
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = i * step + step / 2;
        const cy = j * step + step / 2;
        const radius = step * r.range(0.3, 0.42);
        const points = r.pick([8, 12]);
        const pts = [];
        for (let k = 0; k < points * 2; k++) {
          const a = (k / (points * 2)) * TAU;
          const rad = k % 2 === 0 ? radius : radius * r.range(0.45, 0.6);
          pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
        }
        out.push(poly(pts, 'ink'));
        out.push({ t: 'circle', cx, cy, r: radius * 0.26, fill: 'accent' });
        // Corner marks tie neighbouring tiles together.
        for (const [dx, dy] of [[0, 0], [step, 0], [0, step], [step, step]]) {
          out.push({ t: 'circle', cx: i * step + dx, cy: j * step + dy, r: step * 0.09, fill: 'accent2' });
        }
      }
    }
    return out;
  },

  hexMosaic(r, tile) {
    const cols = r.pick([4, 5, 6]);
    const cw = tile / cols;
    const rows = r.pick([6, 8]);
    const rh = tile / rows;
    const radius = cw * 0.52;
    const slots = ['ink', 'accent', 'accent2'];
    const out = [];
    for (let row = -1; row <= rows; row++) {
      for (let c = -1; c <= cols; c++) {
        const cx = c * cw + (row % 2 ? cw / 2 : 0);
        const cy = row * rh;
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + Math.PI / 6;
          pts.push([cx + Math.cos(a) * radius * 0.88, cy + Math.sin(a) * radius * 0.88]);
        }
        out.push(poly(pts, r.pick(slots)));
      }
    }
    return out;
  },

  octagonSquare(r, tile) {
    const n = r.pick([3, 4]);
    const step = tile / n;
    const out = [];
    const cut = step * 0.29;
    const joint = step * r.range(0.03, 0.055);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * step;
        const y = j * step;
        const g = joint;
        out.push(poly([
          [x + cut + g * 0.4, y + g], [x + step - cut - g * 0.4, y + g],
          [x + step - g, y + cut + g * 0.4], [x + step - g, y + step - cut - g * 0.4],
          [x + step - cut - g * 0.4, y + step - g], [x + cut + g * 0.4, y + step - g],
          [x + g, y + step - cut - g * 0.4], [x + g, y + cut + g * 0.4]
        ], 'ink'));
        // The small square that falls between four octagons.
        out.push(poly([
          [x, y - cut], [x + cut, y], [x, y + cut], [x - cut, y]
        ], 'accent'));
      }
    }
    return out;
  },

  ribbonInterlace(r, tile) {
    const n = r.pick([2, 3]);
    const step = tile / n;
    const w = step * r.range(0.12, 0.18);
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = i * step + step / 2;
        const cy = j * step + step / 2;
        const radius = step * 0.32;
        for (let k = 0; k < 4; k++) {
          const a0 = (k * TAU) / 4;
          out.push({
            t: 'arc',
            cx: cx + Math.cos(a0 + TAU / 8) * radius,
            cy: cy + Math.sin(a0 + TAU / 8) * radius,
            r: radius,
            a0: a0 + TAU / 2,
            a1: a0 + TAU / 2 + TAU / 4,
            w,
            stroke: k % 2 ? 'accent' : 'ink',
            cap: 'butt'
          });
        }
      }
    }
    return out;
  },

  chipAndGrout(r, tile) {
    const n = r.pick([3, 4]);
    const step = tile / n;
    const w = step * r.range(0.055, 0.085);
    const out = [];
    const slots = ['ink', 'accent', 'accent2'];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const count = r.int(45, 75);
        for (let k = 0; k < count; k++) {
          out.push(poly(
            chip(r, i * step + r() * step, j * step + r() * step, step * r.range(0.035, 0.085)),
            r.pick(slots)
          ));
        }
      }
    }
    // Grout lines drawn over the chips, as a real terrazzo tile would be cut.
    for (let i = 0; i <= n; i++) {
      out.push({ t: 'line', pts: [[i * step, -1], [i * step, tile + 1]], w, stroke: 'bg', cap: 'butt' });
      out.push({ t: 'line', pts: [[-1, i * step], [tile + 1, i * step]], w, stroke: 'bg', cap: 'butt' });
    }
    return out;
  },

  diagonalTile(r, tile) {
    /*
     * Square tiles split corner to corner, laid so the diagonals form a
     * figure across the grid rather than all leaning the same way.
     *
     * Which figure depends on the turn rule, and that is what makes one of
     * these different from the next: a quarter turn per cell pinwheels, a
     * half turn per row gives chevrons, and a parity rule reads as a basket.
     * Without that the recipe has only the grid size to vary, which is not
     * enough for two of them to be different patterns.
     */
    const n = r.pick([3, 4, 5, 6]);
    const step = tile / n;
    const rule = r.pick(['pinwheel', 'chevron', 'basket', 'quarter']);
    const centre = r.pick(['dot', 'ring', 'none']);
    const pairs = r.chance(0.4) ? ['ink', 'accent2'] : ['ink', 'accent'];
    const out = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * step;
        const y = j * step;

        let turn;
        if (rule === 'pinwheel') turn = (i + j * 2) % 4;
        else if (rule === 'chevron') turn = (j % 2) * 2 + (i % 2);
        else if (rule === 'basket') turn = ((i + j) % 2) * 2;
        else turn = (i * j) % 4;

        const corners = [[x, y], [x + step, y], [x + step, y + step], [x, y + step]];
        const mid = [x + step / 2, y + step / 2];

        out.push(poly([corners[turn], corners[(turn + 1) % 4], corners[(turn + 2) % 4]], pairs[0]));
        out.push(poly([corners[(turn + 2) % 4], corners[(turn + 3) % 4], corners[turn]], pairs[1]));

        // Something at the centre keeps each square reading as a square
        // instead of merging with its neighbour into a band.
        if (centre === 'dot') {
          out.push({ t: 'circle', cx: mid[0], cy: mid[1], r: step * 0.077, fill: 'bg' });
        } else if (centre === 'ring') {
          out.push({ t: 'ring', cx: mid[0], cy: mid[1], r: step * 0.16, w: step * 0.05, fill: 'bg' });
        }
      }
    }

    return out;
  },

  pebbleMosaic(r, tile) {
    const out = [];
    const count = r.int(60, 110);
    const slots = ['ink', 'accent', 'accent2'];
    for (let i = 0; i < count; i++) {
      const cx = r() * tile;
      const cy = r() * tile;
      const size = tile * r.range(0.018, 0.04);
      out.push({ t: 'ellipse', cx, cy, rx: size, ry: size * r.range(0.6, 0.95), rot: r() * TAU, fill: r.pick(slots) });
    }
    return out;
  },

  bandedTile(r, tile) {
    const n = r.pick([2, 3]);
    const step = tile / n;
    const bands = r.pick([3, 4, 5]);
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * step;
        const y = j * step;
        const vertical = (i + j) % 2 === 0;
        for (let b = 0; b < bands; b++) {
          const t = b / bands;
          const thickness = step / bands;
          const slot = b % 2 === 0 ? 'ink' : 'accent';
          if (vertical) out.push({ t: 'rect', x: x + t * step, y, w: thickness, h: step, fill: slot });
          else out.push({ t: 'rect', x, y: y + t * step, w: step, h: thickness, fill: slot });
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
  terrazzoFine: ['Terrazzo Fine', 'Micro Chip', 'Grit Terrazzo'],
  terrazzoMedium: ['Terrazzo', 'Chip Stone', 'Palladiana'],
  terrazzoBold: ['Terrazzo Bold', 'Large Chip', 'Boulder'],
  mosaicSquares: ['Mosaic', 'Tesserae', 'Smalti'],
  mosaicRandomWalk: ['Drifting Mosaic', 'Tide Mosaic', 'Gradient Tile'],
  ceramicSquare: ['Ceramic Square', 'Framed Tile', 'Inset Tile'],
  quarterTurnBlock: ['Quarter Turn', 'Four Tile', 'Rotational'],
  encausticStar: ['Encaustic Star', 'Star Tile', 'Compass Tile'],
  hexMosaic: ['Hex Mosaic', 'Honeycomb Tile', 'Hex Floor'],
  octagonSquare: ['Octagon & Dot', 'Cushion Tile', 'Roman Floor'],
  ribbonInterlace: ['Interlace', 'Ribbon Tile', 'Knotwork'],
  chipAndGrout: ['Cut Terrazzo', 'Grouted Chip', 'Slab'],
  diagonalTile: ['Diagonal Tile', 'Split Square', 'Folded Tile'],
  pebbleMosaic: ['Pebble', 'River Stone', 'Shingle'],
  bandedTile: ['Banded Tile', 'Striped Square', 'Parquet Band']
};

const SUFFIX = ['Two', 'Fine', 'Bold', 'Close', 'Open'];

export const COLLECTION = 'tile-and-terrazzo';
export const PREFIX = 'tlz';
export const TARGET = 30;
export const TILES = [300, 340, 380];
export { RECIPES };

export function metaFor(key, seen) {
  const names = NAMES[key];
  const base = names[seen % names.length];
  return {
    name: seen < names.length ? base : base + ' ' + SUFFIX[seen % SUFFIX.length],
    tags: tagsFor(key)
  };
}

function tagsFor(key) {
  const map = {
    terrazzoFine: ['terrazzo', 'fine'],
    terrazzoMedium: ['terrazzo'],
    terrazzoBold: ['terrazzo', 'bold'],
    mosaicSquares: ['mosaic', 'squares'],
    mosaicRandomWalk: ['mosaic', 'squares'],
    ceramicSquare: ['ceramic', 'squares'],
    quarterTurnBlock: ['ceramic', 'rotational'],
    encausticStar: ['ceramic', 'encaustic', 'stars'],
    hexMosaic: ['mosaic', 'hexagons'],
    octagonSquare: ['ceramic', 'octagons'],
    ribbonInterlace: ['ceramic', 'interlace'],
    chipAndGrout: ['terrazzo', 'grout'],
    diagonalTile: ['ceramic', 'triangles'],
    pebbleMosaic: ['mosaic', 'pebble'],
    bandedTile: ['ceramic', 'bands']
  };
  return map[key] || ['tile'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, metaFor };
