/*
 * Confetti & Specks
 *
 * Scattered small marks: confetti, dashes, torn paper, grains and flecks.
 * Scatter is the one family where nothing lands on a grid line, so every
 * mark here is placed on a jittered grid and the build repeats anything
 * crossing an edge on the opposite side — which is what makes a scatter
 * repeat without looking like it does.
 *
 * Drawn from first principles. Nothing here reproduces or imitates any
 * existing designer's pattern or any company's mark.
 */

import { wrap, TAU } from '../lib.mjs';

const dot = (cx, cy, r, fill) => ({ t: 'circle', cx, cy, r, fill });
const poly = (pts, fill) => ({ t: 'poly', pts, fill });

/** A rectangle turned about its own centre. */
function turnedRect(cx, cy, w, h, angle, fill) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [
    cx + x * cos - y * sin,
    cy + x * sin + y * cos
  ]);
  return poly(pts, fill);
}

/** A rough torn-paper shape: a circle with its radius knocked about. */
function torn(r, cx, cy, radius, fill, points = 9) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * TAU;
    const rr = radius * r.range(0.55, 1.2);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return poly(pts, fill);
}

/** Walk a jittered grid, calling back with a position per cell. */
function scatter(r, tile, cells, jitter, fn, skip = 0) {
  const step = tile / cells;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      if (skip && r.chance(skip)) continue;
      fn(
        (i + 0.5 + r.range(-jitter, jitter)) * step,
        (j + 0.5 + r.range(-jitter, jitter)) * step,
        step,
        i,
        j
      );
    }
  }
}

const RECIPES = {
  confetti(r, tile) {
    // Small turned rectangles at every angle, in three inks.
    const cells = r.pick([4, 5, 6, 7]);
    const slots = ['ink', 'accent', 'accent2'];
    const long = r.range(0.2, 0.46);
    const out = [];

    scatter(r, tile, cells, 0.34, (cx, cy, step) => {
      out.push(turnedRect(cx, cy, step * long, step * long * r.range(0.25, 0.5), r() * Math.PI, r.pick(slots)));
    });
    return out;
  },

  specks(r, tile) {
    // Very small dots at mixed sizes, an even flecked ground.
    const cells = r.pick([8, 10, 12, 14]);
    const big = r.range(0.05, 0.2);
    const out = [];

    scatter(r, tile, cells, 0.4, (cx, cy, step) => {
      const large = r.chance(big);
      out.push(dot(cx, cy, step * (large ? r.range(0.18, 0.3) : r.range(0.06, 0.15)), large ? 'accent' : 'ink'));
    }, 0.15);
    return out;
  },

  dashScatter(r, tile) {
    // Short dashes at a shared lean, which gives the field a direction.
    const cells = r.pick([5, 6, 7, 8]);
    const base = r() * Math.PI;
    const spread = r.range(0.05, 0.6);
    const out = [];

    scatter(r, tile, cells, 0.33, (cx, cy, step, i, j) => {
      out.push(turnedRect(cx, cy, step * r.range(0.3, 0.6), step * r.range(0.05, 0.11), base + r.range(-spread, spread), (i + j) % 3 === 0 ? 'accent' : 'ink'));
    }, 0.1);
    return out;
  },

  tornPaper(r, tile) {
    // Rough paper shapes at a spread of sizes, overlapping a little.
    const cells = r.pick([3, 4, 5]);
    const slots = ['ink', 'accent', 'accent2'];
    const out = [];

    scatter(r, tile, cells, 0.3, (cx, cy, step) => {
      out.push(torn(r, cx, cy, step * r.range(0.2, 0.4), r.pick(slots), r.int(7, 11)));
    }, 0.12);
    return out;
  },

  grains(r, tile) {
    // Long thin grains, all leaning one way, like rice or seed.
    const cells = r.pick([6, 7, 8, 9]);
    const base = r() * Math.PI;
    const out = [];

    scatter(r, tile, cells, 0.36, (cx, cy, step, i, j) => {
      const len = step * r.range(0.3, 0.55);
      out.push({
        t: 'ellipse',
        cx,
        cy,
        rx: len / 2,
        ry: len * r.range(0.1, 0.2),
        rot: base + r.range(-0.3, 0.3),
        fill: (i + j) % 2 ? 'accent' : 'ink'
      });
    }, 0.08);
    return out;
  },

  mixedShapes(r, tile) {
    // Circles, squares and triangles together, the party-confetti mix.
    const cells = r.pick([4, 5, 6]);
    const slots = ['ink', 'accent', 'accent2'];
    const out = [];

    scatter(r, tile, cells, 0.32, (cx, cy, step) => {
      const size = step * r.range(0.14, 0.3);
      const slot = r.pick(slots);
      const kind = r.int(0, 2);
      if (kind === 0) {
        out.push(dot(cx, cy, size, slot));
      } else if (kind === 1) {
        out.push(turnedRect(cx, cy, size * 1.8, size * 1.8, r() * Math.PI, slot));
      } else {
        const a = r() * TAU;
        const pts = [0, 1, 2].map((k) => {
          const ang = a + (k / 3) * TAU;
          return [cx + Math.cos(ang) * size * 1.3, cy + Math.sin(ang) * size * 1.3];
        });
        out.push(poly(pts, slot));
      }
    }, 0.1);
    return out;
  },

  sprinkles(r, tile) {
    // Rounded dashes in bright inks, the hundreds-and-thousands look.
    const cells = r.pick([5, 6, 7, 8]);
    const slots = ['ink', 'accent', 'accent2'];
    const out = [];

    scatter(r, tile, cells, 0.35, (cx, cy, step) => {
      const len = step * r.range(0.3, 0.5);
      const w = len * r.range(0.22, 0.34);
      const a = r() * Math.PI;
      out.push(turnedRect(cx, cy, len, w, a, r.pick(slots)));
      // Rounded ends, drawn as two dots at the tips.
      const dx = (Math.cos(a) * len) / 2;
      const dy = (Math.sin(a) * len) / 2;
      const slot = r.pick(slots);
      out.push(dot(cx + dx, cy + dy, w / 2, slot));
      out.push(dot(cx - dx, cy - dy, w / 2, slot));
    }, 0.08);
    return out;
  },

  flecks(r, tile) {
    // Tiny angular flecks, very fine and dense, like paper inclusions.
    const cells = r.pick([10, 12, 14, 16]);
    const out = [];

    scatter(r, tile, cells, 0.42, (cx, cy, step, i, j) => {
      const size = step * r.range(0.14, 0.34);
      out.push(turnedRect(cx, cy, size, size * r.range(0.3, 0.8), r() * Math.PI, (i * j) % 5 === 0 ? 'accent' : 'ink'));
    }, 0.2);
    return out;
  },

  bubbleConfetti(r, tile) {
    // Open rings mixed with filled dots.
    const cells = r.pick([5, 6, 7]);
    const openShare = r.range(0.3, 0.7);
    const out = [];

    scatter(r, tile, cells, 0.34, (cx, cy, step, i, j) => {
      const radius = step * r.range(0.12, 0.28);
      if (r.chance(openShare)) {
        out.push({ t: 'ring', cx, cy, r: radius, w: step * r.range(0.02, 0.05), stroke: 'ink' });
      } else {
        out.push(dot(cx, cy, radius, (i + j) % 2 ? 'accent' : 'accent2'));
      }
    }, 0.1);
    return out;
  },

  driftSpecks(r, tile) {
    /*
     * Specks whose density changes across the tile. The density follows a
     * whole number of cycles, so the drift closes rather than banding at
     * the edge.
     */
    const cells = r.pick([10, 12, 14]);
    const step = tile / cells;
    const cycles = r.pick([1, 2]);
    const out = [];

    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const t = i / cells;
        const density = 0.25 + 0.65 * (0.5 - Math.cos(t * TAU * cycles) / 2);
        if (!r.chance(density)) continue;
        const cx = (i + 0.5 + r.range(-0.4, 0.4)) * step;
        const cy = (j + 0.5 + r.range(-0.4, 0.4)) * step;
        out.push(dot(cx, cy, step * r.range(0.08, 0.22), (i + j) % 3 === 0 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  crumbs(r, tile) {
    // Irregular little crumbs, mostly small with a few larger pieces.
    const cells = r.pick([6, 7, 8]);
    const out = [];

    scatter(r, tile, cells, 0.38, (cx, cy, step, i, j) => {
      const big = r.chance(0.18);
      const radius = step * (big ? r.range(0.2, 0.32) : r.range(0.07, 0.16));
      out.push(torn(r, cx, cy, radius, big ? 'accent' : 'ink', r.int(5, 8)));
    }, 0.12);
    return out;
  }
};

/* ------------------------------------------------------------------ *
 * Metadata
 * ------------------------------------------------------------------ */

const NAMES = {
  confetti: ['Confetti', 'Party Throw', 'Paper Rain'],
  specks: ['Speck', 'Fleckfield', 'Pepper'],
  dashScatter: ['Dash Scatter', 'Leaning Dash', 'Hatchfall'],
  tornPaper: ['Torn Paper', 'Shred', 'Rough Cut'],
  grains: ['Grain', 'Seed Scatter', 'Rice'],
  mixedShapes: ['Mixed Confetti', 'Shape Throw', 'Jumble'],
  sprinkles: ['Sprinkle', 'Hundreds', 'Nonpareil'],
  flecks: ['Fleck', 'Inclusion', 'Chip'],
  bubbleConfetti: ['Ring Confetti', 'Open and Filled', 'Bubble Throw'],
  driftSpecks: ['Drifting Speck', 'Density Drift', 'Gather'],
  crumbs: ['Crumb', 'Fragment', 'Shard Fall']
};

const SUFFIX = ['Two', 'Dense', 'Sparse', 'Fine', 'Bold'];

export const COLLECTION = 'confetti-and-specks';
export const PREFIX = 'cnf';
export const TARGET = 22;
export const TILES = [260, 300, 340];
export const COVERAGE = { minInk: 0.02 };
export { RECIPES };

export function metaFor(key, seen) {
  const names = NAMES[key];
  if (!names) throw new Error('confetti-and-specks: no names for recipe ' + key);
  const base = names[seen % names.length];
  return {
    name: seen < names.length ? base : base + ' ' + SUFFIX[seen % SUFFIX.length],
    tags: tagsFor(key)
  };
}

function tagsFor(key) {
  const map = {
    confetti: ['confetti', 'scattered', 'bright'],
    specks: ['specks', 'fine', 'even'],
    dashScatter: ['dashes', 'scattered', 'directional'],
    tornPaper: ['torn', 'organic', 'bold'],
    grains: ['grains', 'scattered', 'directional'],
    mixedShapes: ['confetti', 'mixed', 'bright'],
    sprinkles: ['sprinkles', 'scattered', 'bright'],
    flecks: ['specks', 'fine', 'dense'],
    bubbleConfetti: ['rings', 'scattered', 'mixed'],
    driftSpecks: ['specks', 'graduated', 'scattered'],
    crumbs: ['crumbs', 'organic', 'scattered']
  };
  return map[key] || ['scatter'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, COVERAGE, metaFor };
