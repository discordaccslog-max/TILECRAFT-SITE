/*
 * Stars & Night
 *
 * Star fields, points, crescents and sparkles. The stars are drawn as
 * point geometry — a ring of outer and inner vertices — rather than traced
 * from anything, and every layout sits on an exact division of the tile.
 *
 * Nothing here reproduces or imitates any existing designer's pattern, any
 * company's mark, or any flag, emblem or team device.
 */

import { wrap, TAU } from '../lib.mjs';

const dot = (cx, cy, r, fill) => ({ t: 'circle', cx, cy, r, fill });
const ring = (cx, cy, r, w, stroke) => ({ t: 'ring', cx, cy, r, w, stroke });
const poly = (pts, fill) => ({ t: 'poly', pts, fill });

/** A star of `points` points, alternating outer and inner radius. */
function star(cx, cy, points, outer, inner, fill, rotation = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const a = rotation + (i / (points * 2)) * TAU;
    pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return poly(pts, fill);
}

/** A four-armed sparkle, drawn with concave sides. */
function sparkle(cx, cy, radius, waist, fill) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    const r2 = i % 2 === 0 ? radius : radius * waist;
    pts.push([cx + Math.cos(a) * r2, cy + Math.sin(a) * r2]);
  }
  return poly(pts, fill);
}

const RECIPES = {
  starGrid(r, tile) {
    // Even rows of stars, every other row dropped half a cell across.
    const cols = r.pick([3, 4, 5, 6]);
    const rows = r.pick([3, 4, 5, 6]);
    const cw = tile / cols;
    const ch = tile / rows;
    const points = r.pick([5, 6, 8]);
    const outer = Math.min(cw, ch) * r.range(0.26, 0.42);
    const waist = r.range(0.38, 0.52);
    const drop = r.chance(0.6);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const offset = drop && j % 2 ? cw / 2 : 0;
      for (let i = 0; i <= cols; i++) {
        out.push(star(i * cw + offset, (j + 0.5) * ch, points, outer, outer * waist, (i + j) % 2 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  starField(r, tile) {
    // Stars at a spread of sizes on a jittered grid, as a night sky.
    const cells = r.pick([4, 5, 6, 7]);
    const step = tile / cells;
    const points = r.pick([4, 5, 6]);
    const out = [];

    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const cx = (i + 0.5 + r.range(-0.3, 0.3)) * step;
        const cy = (j + 0.5 + r.range(-0.3, 0.3)) * step;
        const big = r.chance(0.3);
        const outer = step * (big ? r.range(0.2, 0.32) : r.range(0.07, 0.16));
        out.push(star(cx, cy, points, outer, outer * r.range(0.34, 0.5), big ? 'accent' : 'ink'));
        if (r.chance(0.3)) out.push(dot(cx + step * 0.3, cy - step * 0.25, step * 0.03, 'accent2'));
      }
    }
    return out;
  },

  sparkleScatter(r, tile) {
    // Four-pointed sparkles with long arms, which read as glints.
    const cells = r.pick([3, 4, 5, 6]);
    const step = tile / cells;
    const waist = r.range(0.1, 0.24);
    const out = [];

    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const cx = (i + 0.5 + r.range(-0.26, 0.26)) * step;
        const cy = (j + 0.5 + r.range(-0.26, 0.26)) * step;
        const radius = step * r.range(0.16, 0.42);
        out.push(sparkle(cx, cy, radius, waist, (i + j) % 2 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  constellation(r, tile) {
    /*
     * Dots joined by fine lines along the rows of a grid, which reads as a
     * star chart. The joins run between neighbours in the same row so the
     * figure closes across the tile edge.
     */
    const cols = r.pick([4, 5, 6]);
    const rows = r.pick([3, 4, 5]);
    const cw = tile / cols;
    const ch = tile / rows;
    const weight = Math.min(cw, ch) * r.range(0.015, 0.035);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const ys = [];
      for (let i = 0; i <= cols; i++) {
        ys.push((j + 0.5) * ch + (i === cols ? 0 : r.range(-0.22, 0.22)) * ch);
      }
      ys[cols] = ys[0];

      for (let i = 0; i < cols; i++) {
        out.push({
          t: 'line',
          pts: [[i * cw, ys[i]], [(i + 1) * cw, ys[i + 1]]],
          w: weight,
          stroke: 'accent2',
          cap: 'round'
        });
      }
      for (let i = 0; i <= cols; i++) {
        out.push(dot(i * cw, ys[i], Math.min(cw, ch) * r.range(0.04, 0.09), i % 2 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  crescents(r, tile) {
    /*
     * A crescent is one disc with another taken out of it. There is no
     * subtraction here, so the bite is drawn in the background colour,
     * which comes to the same thing on an opaque ground.
     */
    const cols = r.pick([3, 4, 5]);
    const rows = r.pick([3, 4, 5]);
    const cw = tile / cols;
    const ch = tile / rows;
    const radius = Math.min(cw, ch) * r.range(0.26, 0.4);
    const bite = r.range(0.3, 0.55);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? cw / 2 : 0;
      for (let i = 0; i <= cols; i++) {
        const cx = i * cw + offset;
        const cy = (j + 0.5) * ch;
        out.push(dot(cx, cy, radius, (i + j) % 2 ? 'accent' : 'ink'));
        out.push(dot(cx + radius * bite, cy - radius * bite * 0.4, radius * 0.92, 'bg'));
      }
    }
    return out;
  },

  starBurst(r, tile) {
    // A star with rays radiating from it, on a wide grid.
    const n = r.pick([2, 3, 4]);
    const step = tile / n;
    const points = r.pick([6, 8, 12]);
    const rays = points;
    const weight = step * r.range(0.012, 0.03);
    const out = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = (i + 0.5) * step;
        const cy = (j + 0.5) * step;
        const outer = step * r.range(0.14, 0.22);
        for (let k = 0; k < rays; k++) {
          const a = (k / rays) * TAU;
          const far = step * r.range(0.3, 0.44);
          out.push({
            t: 'line',
            pts: [[cx + Math.cos(a) * outer, cy + Math.sin(a) * outer], [cx + Math.cos(a) * far, cy + Math.sin(a) * far]],
            w: weight,
            stroke: 'accent2',
            cap: 'round'
          });
        }
        out.push(star(cx, cy, points, outer, outer * 0.44, 'ink'));
      }
    }
    return out;
  },

  moonPhases(r, tile) {
    // A row of discs, each with a different amount bitten out of it.
    const cols = r.pick([4, 6, 8]);
    const rows = r.pick([2, 3, 4]);
    const cw = tile / cols;
    const ch = tile / rows;
    const radius = Math.min(cw, ch) * r.range(0.26, 0.4);
    const out = [];

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const cx = (i + 0.5) * cw;
        const cy = (j + 0.5) * ch;
        // The phase runs through a whole cycle across the row, so the row
        // meets itself at the tile edge.
        const phase = i / cols;
        out.push(dot(cx, cy, radius, j % 2 ? 'accent' : 'ink'));
        const shift = Math.cos(phase * TAU) * radius * 1.6;
        if (Math.abs(shift) < radius * 1.9) out.push(dot(cx + shift, cy, radius * 0.98, 'bg'));
      }
    }
    return out;
  },

  nightDots(r, tile) {
    // Small dots at mixed sizes and weights, as a quiet star ground.
    const cells = r.pick([6, 8, 10, 12]);
    const step = tile / cells;
    const out = [];

    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        if (r.chance(0.28)) continue;
        const cx = (i + 0.5 + r.range(-0.25, 0.25)) * step;
        const cy = (j + 0.5 + r.range(-0.25, 0.25)) * step;
        const radius = step * r.range(0.05, 0.2);
        const open = r.chance(0.25);
        if (open) out.push(ring(cx, cy, radius, step * 0.03, 'accent'));
        else out.push(dot(cx, cy, radius, (i + j) % 3 === 0 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  starLattice(r, tile) {
    // Stars at the crossings of a fine diagonal lattice.
    const n = r.pick([3, 4, 5, 6]);
    const step = tile / n;
    const weight = step * r.range(0.015, 0.035);
    const points = r.pick([4, 6]);
    const out = [];

    for (let i = 0; i <= n; i++) {
      out.push({ t: 'line', pts: [[i * step - tile, -1], [i * step + tile, tile + 1]], w: weight, stroke: 'accent2', cap: 'butt' });
      out.push({ t: 'line', pts: [[i * step + tile, -1], [i * step - tile, tile + 1]], w: weight, stroke: 'accent2', cap: 'butt' });
    }
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const outer = step * r.range(0.1, 0.2);
        out.push(star(i * step, j * step, points, outer, outer * 0.42, (i + j) % 2 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  comets(r, tile) {
    // A star with a tapering tail, all leaning the same way.
    const cols = r.pick([3, 4, 5]);
    const rows = r.pick([3, 4, 5]);
    const cw = tile / cols;
    const ch = tile / rows;
    const angle = r.range(-0.9, -0.3);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? cw / 2 : 0;
      for (let i = 0; i <= cols; i++) {
        const cx = i * cw + offset;
        const cy = (j + 0.5) * ch;
        const len = Math.min(cw, ch) * r.range(0.4, 0.8);
        const head = Math.min(cw, ch) * r.range(0.08, 0.14);
        const dx = Math.cos(angle) * len;
        const dy = Math.sin(angle) * len;
        out.push(poly(
          [
            [cx, cy - head],
            [cx, cy + head],
            [cx - dx, cy - dy]
          ],
          'accent2'
        ));
        out.push(star(cx, cy, 4, head * 2.1, head * 0.7, (i + j) % 2 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  twinkle(r, tile) {
    // Tiny four-point sparkles on an exact grid, very fine and even.
    const n = r.pick([6, 8, 10, 12]);
    const step = tile / n;
    const waist = r.range(0.12, 0.3);
    const drop = r.chance(0.5);
    const out = [];

    for (let j = 0; j < n; j++) {
      const offset = drop && j % 2 ? step / 2 : 0;
      for (let i = 0; i <= n; i++) {
        const size = step * r.range(0.2, 0.36);
        out.push(sparkle(i * step + offset, (j + 0.5) * step, size, waist, (i + j) % 2 ? 'accent' : 'ink'));
      }
    }
    return out;
  }
};

/* ------------------------------------------------------------------ *
 * Metadata
 * ------------------------------------------------------------------ */

const NAMES = {
  starGrid: ['Star Grid', 'Ordered Sky', 'Even Stars'],
  starField: ['Star Field', 'Deep Sky', 'Scattered Stars'],
  sparkleScatter: ['Sparkle', 'Glint', 'Flicker'],
  constellation: ['Constellation', 'Star Chart', 'Joined Stars'],
  crescents: ['Crescent', 'New Moon', 'Waning'],
  starBurst: ['Star Burst', 'Radiant', 'Beacon'],
  moonPhases: ['Moon Phase', 'Lunar Row', 'Cycle'],
  nightDots: ['Night Dot', 'Quiet Sky', 'Far Stars'],
  starLattice: ['Star Lattice', 'Crossed Sky', 'Net of Stars'],
  comets: ['Comet', 'Shooting Star', 'Trail'],
  twinkle: ['Twinkle', 'Fine Sparkle', 'Dust Stars']
};

const SUFFIX = ['Two', 'Bright', 'Faint', 'Close', 'Wide'];

export const COLLECTION = 'stars-and-night';
export const PREFIX = 'str';
export const TARGET = 22;
export const TILES = [280, 320, 360];
export const COVERAGE = { minInk: 0.02 };
export { RECIPES };

export function metaFor(key, seen) {
  const names = NAMES[key];
  if (!names) throw new Error('stars-and-night: no names for recipe ' + key);
  const base = names[seen % names.length];
  return {
    name: seen < names.length ? base : base + ' ' + SUFFIX[seen % SUFFIX.length],
    tags: tagsFor(key)
  };
}

function tagsFor(key) {
  const map = {
    starGrid: ['stars', 'grid', 'even'],
    starField: ['stars', 'scattered', 'mixed'],
    sparkleScatter: ['sparkles', 'scattered', 'bold'],
    constellation: ['stars', 'lines', 'joined'],
    crescents: ['moons', 'solid', 'rows'],
    starBurst: ['stars', 'radial', 'rays'],
    moonPhases: ['moons', 'rows', 'solid'],
    nightDots: ['dots', 'scattered', 'fine'],
    starLattice: ['stars', 'lattice', 'lines'],
    comets: ['comets', 'rows', 'solid'],
    twinkle: ['sparkles', 'fine', 'grid']
  };
  return map[key] || ['stars'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, COVERAGE, metaFor };
