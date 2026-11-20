/*
 * Art Deco Lines
 *
 * Fans, sunbursts, stepped forms and ray bands: the geometry of the 1920s
 * and 30s drawn from first principles. Everything is built on an exact
 * division of the tile, and any alternation of direction or colour has a
 * period that divides the tile, so the repeat closes rather than nearly
 * closing.
 *
 * These are ordinary deco constructions — radiating fans, stepped
 * ziggurats, banded rays. Nothing here reproduces or imitates any existing
 * designer's pattern or any company's mark.
 */

import { wrap, TAU } from '../lib.mjs';

const line = (x1, y1, x2, y2, w, stroke, cap = 'butt') => ({
  t: 'line', pts: [[x1, y1], [x2, y2]], w, stroke, cap
});

const poly = (pts, fill) => ({ t: 'poly', pts, fill });
const dot = (cx, cy, r, fill) => ({ t: 'circle', cx, cy, r, fill });
const ring = (cx, cy, r, w, stroke) => ({ t: 'ring', cx, cy, r, w, stroke });
const arc = (cx, cy, r, w, a0, a1, stroke) => ({ t: 'arc', cx, cy, r, w, a0, a1, stroke });

/** A wedge from a centre, between two angles. */
function wedge(cx, cy, radius, a0, a1, fill, steps = 10) {
  const pts = [[cx, cy]];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return poly(pts, fill);
}

const RECIPES = {
  /* --- Fans and sunbursts --- */

  sunburstGrid(r, tile) {
    // Fans on a grid, each radiating from its own corner.
    const n = r.pick([2, 3, 4]);
    const step = tile / n;
    const rays = r.pick([7, 9, 11, 13]);
    const slots = ['ink', 'accent'];
    const out = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = i * step + step / 2;
        const cy = j * step + step / 2;
        const radius = step * r.range(0.42, 0.5);
        for (let k = 0; k < rays; k++) {
          const a0 = (k / rays) * TAU;
          const a1 = a0 + TAU / rays / 2;
          out.push(wedge(cx, cy, radius, a0, a1, slots[(i + j + k) % 2]));
        }
      }
    }
    return out;
  },

  cornerFans(r, tile) {
    // Quarter fans in the corners, which meet across the tile edges and
    // read as whole fans once the pattern repeats.
    const bands = r.pick([4, 5, 6, 7]);
    const weight = (tile / bands) * r.range(0.14, 0.3);
    const out = [];
    const corners = [[0, 0], [tile, 0], [0, tile], [tile, tile]];
    const centre = r.chance(0.5);

    for (const [cx, cy] of corners) {
      for (let k = 1; k <= bands; k++) {
        out.push(ring(cx, cy, (tile / 2) * (k / bands) * 0.92, weight, k % 2 ? 'ink' : 'accent'));
      }
    }
    if (centre) {
      for (let k = 1; k <= Math.max(2, bands - 2); k++) {
        out.push(ring(tile / 2, tile / 2, (tile / 2) * (k / bands) * 0.7, weight * 0.8, 'accent2'));
      }
    }
    return out;
  },

  rayBands(r, tile) {
    // Horizontal bands of rays, each band leaning the other way.
    const rows = r.pick([4, 6, 8]);
    const rowStep = tile / rows;
    const perRow = r.pick([8, 12, 16]);
    const step = tile / perRow;
    const weight = step * r.range(0.16, 0.34);
    const lean = rowStep * r.range(0.4, 1);
    const out = [];

    for (let row = 0; row < rows; row++) {
      const y = row * rowStep;
      const dir = row % 2 ? -1 : 1;
      for (let i = 0; i <= perRow; i++) {
        const x = i * step;
        out.push(line(x, y, x + lean * dir, y + rowStep, weight, row % 2 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  /* --- Stepped forms --- */

  ziggurat(r, tile) {
    /*
     * Stepped pyramids sitting on a baseline, all the same way up within a
     * row. Flipping alternate cells stacks a pyramid apex to apex with its
     * neighbour, which reads as a row of bottles rather than architecture,
     * so the rows alternate instead and each one keeps its own ground.
     */
    const columns = r.pick([2, 3, 4]);
    const step = tile / columns;
    const steps = r.pick([3, 4, 5]);
    const rows = r.pick([2, 3, 4]);
    const rowStep = tile / rows;
    const gap = step * r.range(0.04, 0.14);
    const base = rowStep * r.range(0.06, 0.12);
    const out = [];

    for (let row = 0; row < rows; row++) {
      // Every row stands the same way up. Turning alternate rows over puts
      // two apexes together, and a pair of stepped pyramids nose to nose
      // reads as a bottle rather than as architecture.
      const slot = row % 2 ? 'accent' : 'ink';
      const y = row * rowStep;

      // The ground each row stands on, which is what makes it read as built.
      out.push({ t: 'rect', x: -1, y: y + rowStep - base, w: tile + 2, h: base, fill: 'accent2' });

      for (let c = 0; c < columns; c++) {
        const x = c * step;
        const body = rowStep - base;

        for (let s2 = 0; s2 < steps; s2++) {
          const inset = gap + ((step / 2 - gap) * s2) / steps;
          const h = body / steps;
          out.push({
            t: 'rect',
            x: x + inset,
            y: y + body - (s2 + 1) * h,
            w: step - inset * 2,
            h: h * 0.94,
            fill: slot
          });
        }
      }
    }
    return out;
  },

  steppedChevron(r, tile) {
    /*
     * A zigzag drawn as a staircase rather than a straight diagonal: up
     * across the first half of the tile, down across the second, so the
     * line arrives back at the height it started and the repeat closes.
     *
     * Drawn as a polyline per band so it reads as one continuous stepped
     * line, which a field of separate blocks does not.
     */
    const n = r.pick([6, 8, 10]);
    const step = tile / n;
    const bands = r.pick([2, 3, 4]);
    const bandStep = tile / bands;
    const weight = step * r.range(0.16, 0.34);
    const amplitude = bandStep * r.range(0.35, 0.5);
    const rise = (amplitude * 2) / n;
    const out = [];

    for (let band = -1; band <= bands; band++) {
      const base = band * bandStep + bandStep / 2;
      const pts = [];

      for (let i = 0; i <= n; i++) {
        const up = i <= n / 2;
        const height = up ? i * rise : (n - i) * rise;
        const y = base - height + amplitude / 2;
        // A step is a horizontal run then a vertical lift, repeated.
        pts.push([i * step, y]);
        if (i < n) pts.push([(i + 1) * step, y]);
      }

      out.push({
        t: 'line',
        pts,
        w: weight,
        stroke: band % 2 ? 'accent' : 'ink',
        cap: 'butt',
        join: 'miter'
      });
    }
    return out;
  },

  /* --- Bands and rules --- */

  decoBands(r, tile) {
    // Wide bands separated by fine double rules, the deco border idiom.
    const bands = r.pick([3, 4, 6]);
    const step = tile / bands;
    const thick = step * r.range(0.3, 0.52);
    const hair = step * r.range(0.03, 0.07);
    const vertical = r.chance(0.5);
    const out = [];

    for (let i = 0; i < bands; i++) {
      const at = i * step;
      const push = (pos, w, slot) => {
        out.push(
          vertical
            ? { t: 'rect', x: pos, y: -1, w, h: tile + 2, fill: slot }
            : { t: 'rect', x: -1, y: pos, w: tile + 2, h: w, fill: slot }
        );
      };
      push(at, thick, i % 2 ? 'accent' : 'ink');
      push(at + thick + hair * 2, hair, 'accent2');
      push(at + thick + hair * 4, hair, 'accent2');
    }
    return out;
  },

  fanScallop(r, tile) {
    // Overlapping half-fans in rows, each row dropped half a fan across.
    const columns = r.pick([3, 4, 5, 6]);
    const step = tile / columns;
    const rows = r.pick([3, 4, 5, 6]);
    const rowStep = tile / rows;
    const ribs = r.pick([3, 4, 5]);
    const weight = step * r.range(0.03, 0.07);
    const out = [];

    for (let row = 0; row < rows; row++) {
      const offset = row % 2 ? step / 2 : 0;
      for (let c = 0; c <= columns; c++) {
        const cx = c * step + offset;
        const cy = row * rowStep;
        for (let k = 1; k <= ribs; k++) {
          out.push(arc(cx, cy, (step / 2) * (k / ribs), weight, 0, Math.PI, k % 2 ? 'ink' : 'accent'));
        }
      }
    }
    return out;
  },

  /* --- Shields and medallions --- */

  medallions(r, tile) {
    // A ringed medallion in each cell, with a stepped frame around it.
    const n = r.pick([2, 3, 4]);
    const step = tile / n;
    const rings = r.pick([2, 3, 4]);
    const weight = step * r.range(0.025, 0.05);
    const frame = r.chance(0.6);
    const out = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = i * step + step / 2;
        const cy = j * step + step / 2;
        for (let k = 1; k <= rings; k++) {
          out.push(ring(cx, cy, (step * 0.4) * (k / rings), weight, k % 2 ? 'ink' : 'accent'));
        }
        out.push(dot(cx, cy, step * 0.06, 'accent2'));
        if (frame) {
          const inset = step * 0.08;
          out.push(line(x1(cx, step, inset), cy - step / 2 + inset, x2(cx, step, inset), cy - step / 2 + inset, weight, 'accent2'));
          out.push(line(x1(cx, step, inset), cy + step / 2 - inset, x2(cx, step, inset), cy + step / 2 - inset, weight, 'accent2'));
        }
      }
    }
    return out;
  },

  shieldRows(r, tile) {
    // Pointed shields in offset rows.
    const columns = r.pick([3, 4, 5]);
    const step = tile / columns;
    const rows = r.pick([3, 4, 5]);
    const rowStep = tile / rows;
    const out = [];
    const slots = ['ink', 'accent', 'accent2'];

    for (let row = 0; row < rows; row++) {
      const offset = row % 2 ? step / 2 : 0;
      for (let c = 0; c <= columns; c++) {
        const cx = c * step + offset;
        const top = row * rowStep;
        const w = step * r.range(0.3, 0.44);
        const h = rowStep * r.range(0.6, 0.86);
        out.push(poly(
          [
            [cx - w, top],
            [cx + w, top],
            [cx + w, top + h * 0.55],
            [cx, top + h],
            [cx - w, top + h * 0.55]
          ],
          slots[(row + c) % slots.length]
        ));
      }
    }
    return out;
  },

  /* --- Grilles --- */

  grille(r, tile) {
    // A deco screen: uprights crossed by a repeating bar motif.
    const uprights = r.pick([6, 8, 10, 12]);
    const step = tile / uprights;
    const weight = step * r.range(0.1, 0.22);
    const rungs = r.pick([4, 6, 8]);
    const rungStep = tile / rungs;
    const out = [];

    for (let i = 0; i < uprights; i++) {
      out.push({ t: 'rect', x: i * step, y: -1, w: weight, h: tile + 2, fill: 'ink' });
    }
    for (let j = 0; j < rungs; j++) {
      const y = j * rungStep;
      const wide = j % 2 === 0;
      out.push({
        t: 'rect',
        x: -1,
        y,
        w: tile + 2,
        h: weight * (wide ? 1.6 : 0.8),
        fill: wide ? 'accent' : 'accent2'
      });
    }
    return out;
  },

  diamondLattice(r, tile) {
    // Elongated diamonds on a lattice, each with a fine inner diamond.
    const cols = r.pick([3, 4, 5, 6]);
    const rows = r.pick([3, 4, 5, 6]);
    const cw = tile / cols;
    const ch = tile / rows;
    const weight = Math.min(cw, ch) * r.range(0.03, 0.07);
    const inner = r.chance(0.65);
    const out = [];

    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        const cx = i * cw;
        const cy = j * ch;
        const pts = [[cx, cy - ch / 2], [cx + cw / 2, cy], [cx, cy + ch / 2], [cx - cw / 2, cy]];
        // An outline is a closed polyline rather than a polygon, because a
        // polygon here is always filled.
        out.push({ t: 'line', pts: [...pts, pts[0]], w: weight, stroke: 'ink', cap: 'butt', join: 'miter' });
        if (inner) {
          const s2 = 0.45;
          out.push({
            t: 'poly',
            pts: pts.map(([x, y]) => [cx + (x - cx) * s2, cy + (y - cy) * s2]),
            fill: (i + j) % 2 ? 'accent' : 'accent2'
          });
        }
      }
    }
    return out;
  }
};

/* Helpers used by medallions, kept out of the recipe for readability. */
const x1 = (cx, step, inset) => cx - step / 2 + inset;
const x2 = (cx, step, inset) => cx + step / 2 - inset;

/* ------------------------------------------------------------------ *
 * Metadata
 * ------------------------------------------------------------------ */

const NAMES = {
  sunburstGrid: ['Sunburst', 'Rayfield', 'Solarium'],
  cornerFans: ['Corner Fan', 'Quarter Round', 'Fanlight'],
  rayBands: ['Ray Band', 'Slant Rule', 'Comb Band'],
  ziggurat: ['Ziggurat', 'Step Pyramid', 'Terrace'],
  steppedChevron: ['Stepped Chevron', 'Block Zigzag', 'Pixel Point'],
  decoBands: ['Deco Band', 'Double Rule', 'Border Line'],
  fanScallop: ['Fan Scallop', 'Ribbed Fan', 'Shell Rank'],
  medallions: ['Medallion', 'Roundel', 'Target'],
  shieldRows: ['Shield', 'Crest', 'Pennon'],
  grille: ['Grille', 'Screen', 'Lattice Bar'],
  diamondLattice: ['Diamond Lattice', 'Harlequin', 'Trellis Point']
};

const SUFFIX = ['Two', 'Bold', 'Fine', 'Wide', 'Close'];

export const COLLECTION = 'art-deco-lines';
export const PREFIX = 'dco';
export const TARGET = 24;
export const TILES = [260, 300, 340];
export const COVERAGE = { minInk: 0.02 };
export { RECIPES };

export function metaFor(key, seen) {
  const names = NAMES[key];
  if (!names) throw new Error('art-deco-lines: no names for recipe ' + key);
  const base = names[seen % names.length];
  return {
    name: seen < names.length ? base : base + ' ' + SUFFIX[seen % SUFFIX.length],
    tags: tagsFor(key)
  };
}

function tagsFor(key) {
  const map = {
    sunburstGrid: ['fans', 'radial', 'bold'],
    cornerFans: ['fans', 'radial', 'lines'],
    rayBands: ['rays', 'bands', 'lines'],
    ziggurat: ['stepped', 'blocks', 'bold'],
    steppedChevron: ['stepped', 'chevron', 'blocks'],
    decoBands: ['bands', 'rules', 'stripes'],
    fanScallop: ['fans', 'scallop', 'lines'],
    medallions: ['medallion', 'rings', 'grid'],
    shieldRows: ['shields', 'solid', 'rows'],
    grille: ['grille', 'bars', 'screen'],
    diamondLattice: ['diamonds', 'lattice', 'lines']
  };
  return map[key] || ['deco'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, COVERAGE, metaFor };
