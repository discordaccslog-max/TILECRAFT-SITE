/*
 * Botanical Linework
 *
 * Stylized leaves, vines, stems, and blossoms, reduced to line.
 *
 * Everything is drawn from parametric shapes: a leaf is a width profile
 * swept along an axis, a vine is a sine with leaves hung off it, a blossom
 * is petals on a circle. Stroke weights stay even and motifs keep clear
 * space between them, which is what makes the line read when the pattern
 * is scaled down.
 *
 * These are generic plant forms constructed from curves. Nothing is traced
 * from, or modelled on, anyone else's drawing.
 */

import { TAU, halfDropGrid, jitteredGrid } from '../lib.mjs';

/* ------------------------------------------------------------------ *
 * Shape helpers
 * ------------------------------------------------------------------ */

/**
 * The outline of a leaf: a width profile swept along an axis, with a sharp
 * tip and a sharp base. Returned as points so it can be filled or stroked.
 */
function leafPoints(cx, cy, length, width, angle, taper = 1.25, steps = 26) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  /*
   * Two things decide whether this reads as a leaf.
   *
   * The exponent: at 1 the sides are straight near the tip and curved
   * through the middle, which is the shape of a leaf. Push it well above 1
   * and the sides straighten into a rhombus; drop it below 1 and the ends
   * swell into a bean. A little over 1 keeps the curve with a clean point.
   *
   * The proportion: the width argument is a half-width, so a leaf comes out
   * twice as fat as the number suggests. Halving it here puts every caller
   * at a leaf-like ratio of roughly one to three without tuning each one.
   */
  const side = (sign) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const w = width * 0.5 * Math.pow(Math.sin(Math.PI * t), taper) * sign;
      const x = t * length;
      pts.push([cx + x * cos - w * sin, cy + x * sin + w * cos]);
    }
    return pts;
  };
  return side(1).concat(side(-1).reverse());
}

/** A wavy stem running the full height or width of the tile. */
function stemPoints(start, length, amplitude, cycles, vertical, phase = 0, steps = 48) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const along = t * length;
    const across = Math.sin(phase + t * TAU * cycles) * amplitude;
    pts.push(vertical ? [start + across, along] : [along, start + across]);
  }
  return pts;
}

/** Petals arranged around a point. */
function blossom(cx, cy, petals, radius, petalWidth, stroke, w, rotation = 0) {
  const out = [];
  for (let i = 0; i < petals; i++) {
    const a = rotation + (i / petals) * TAU;
    out.push({
      t: 'line',
      pts: leafPoints(cx, cy, radius, petalWidth, a),
      w,
      stroke,
      closed: true,
      cap: 'round',
      join: 'round'
    });
  }
  return out;
}

const outline = (pts, w, stroke, closed = true) => ({
  t: 'line', pts, w, stroke, closed, cap: 'round', join: 'round'
});

/* ------------------------------------------------------------------ *
 * Recipes
 * ------------------------------------------------------------------ */

const RECIPES = {
  leafSprig(r, tile) {
    const cols = r.pick([2, 3]);
    const rows = r.pick([2, 3]);
    const w = tile * r.range(0.013, 0.018);
    const out = [];
    for (const [x, y] of halfDropGrid(tile, cols, rows)) {
      const height = (tile / rows) * r.range(0.6, 0.78);
      const angle = -Math.PI / 2 + r.range(-0.25, 0.25);
      out.push(outline(stemPoints(x, height, tile * 0.012, 0.6, true, 0).map(([sx, sy]) => [sx, y - height / 2 + sy]), w, 'ink', false));
      const pairs = r.int(3, 5);
      for (let i = 1; i <= pairs; i++) {
        const t = i / (pairs + 1);
        const sy = y - height / 2 + t * height;
        const len = (tile / cols) * r.range(0.16, 0.24) * (1 - t * 0.35);
        for (const sign of [-1, 1]) {
          out.push(outline(leafPoints(x, sy, len, len * 0.34, sign > 0 ? -0.6 : Math.PI + 0.6), w, 'ink'));
        }
      }
      void angle;
    }
    return out;
  },

  leafScatter(r, tile) {
    const count = r.pick([6, 8, 9]);
    const w = tile * r.range(0.012, 0.017);
    const out = [];
    for (const [x, y] of jitteredGrid(r, tile, count, 0.3)) {
      const len = tile * r.range(0.24, 0.33);
      out.push(outline(leafPoints(x - len / 2, y, len, len * r.range(0.3, 0.42), r() * TAU), w, 'ink'));
    }
    return out;
  },

  leafFilled(r, tile) {
    const count = r.pick([5, 6, 8]);
    const out = [];
    for (const [x, y] of jitteredGrid(r, tile, count, 0.28)) {
      const len = tile * r.range(0.24, 0.32);
      const a = r() * TAU;
      out.push({ t: 'poly', pts: leafPoints(x, y, len, len * 0.34, a), fill: r.chance(0.3) ? 'accent' : 'ink' });
      // A centre vein keeps a solid leaf from reading as a blob.
      out.push({
        t: 'line',
        pts: [[x, y], [x + Math.cos(a) * len, y + Math.sin(a) * len]],
        w: tile * 0.006,
        stroke: 'bg',
        cap: 'round'
      });
    }
    return out;
  },

  trailingVine(r, tile) {
    const strands = r.pick([2, 3]);
    const w = tile * r.range(0.013, 0.018);
    const cycles = r.pick([1, 2]);
    const out = [];
    for (let s = 0; s < strands; s++) {
      const x = ((s + 0.5) / strands) * tile;
      const amp = (tile / strands) * r.range(0.14, 0.24);
      const phase = r() * TAU;
      const pts = stemPoints(x, tile, amp, cycles, true, phase);
      out.push(outline(pts, w, 'ink', false));
      const leaves = r.int(5, 8);
      for (let i = 0; i < leaves; i++) {
        const t = (i + 0.5) / leaves;
        const index = Math.round(t * (pts.length - 1));
        const [lx, ly] = pts[index];
        const sign = i % 2 === 0 ? 1 : -1;
        const len = tile * r.range(0.15, 0.22);
        out.push(outline(leafPoints(lx, ly, len, len * 0.38, sign > 0 ? r.range(-0.5, 0.1) : Math.PI + r.range(-0.1, 0.5)), w, 'ink'));
      }
    }
    return out;
  },

  horizontalVine(r, tile) {
    const rows = r.pick([3, 4]);
    const w = tile * r.range(0.012, 0.017);
    const out = [];
    for (let s = 0; s < rows; s++) {
      const y = ((s + 0.5) / rows) * tile;
      const amp = (tile / rows) * r.range(0.12, 0.2);
      const pts = stemPoints(y, tile, amp, r.pick([1, 2]), false, r() * TAU);
      out.push(outline(pts, w, 'ink', false));
      const leaves = r.int(4, 7);
      for (let i = 0; i < leaves; i++) {
        const index = Math.round(((i + 0.5) / leaves) * (pts.length - 1));
        const [lx, ly] = pts[index];
        const len = tile * r.range(0.13, 0.19);
        const up = i % 2 === 0;
        out.push(outline(leafPoints(lx, ly, len, len * 0.36, up ? -Math.PI / 2 + r.range(-0.3, 0.3) : Math.PI / 2 + r.range(-0.3, 0.3)), w, 'ink'));
      }
    }
    return out;
  },

  blossomScatter(r, tile) {
    const count = r.pick([4, 5, 6]);
    const w = tile * r.range(0.012, 0.017);
    const out = [];
    for (const [x, y] of jitteredGrid(r, tile, count, 0.26)) {
      const radius = tile * r.range(0.1, 0.15);
      const petals = r.pick([5, 6, 8]);
      out.push(...blossom(x, y, petals, radius, radius * 0.42, 'ink', w, r() * TAU));
      out.push({ t: 'circle', cx: x, cy: y, r: radius * 0.16, fill: 'accent' });
    }
    return out;
  },

  blossomAndLeaf(r, tile) {
    const w = tile * r.range(0.012, 0.017);
    const out = [];
    const points = jitteredGrid(r, tile, r.pick([5, 6]), 0.28);
    points.forEach(([x, y], i) => {
      if (i % 2 === 0) {
        const radius = tile * r.range(0.06, 0.09);
        out.push(...blossom(x, y, r.pick([5, 6]), radius, radius * 0.4, 'ink', w, r() * TAU));
        out.push({ t: 'circle', cx: x, cy: y, r: radius * 0.18, fill: 'accent' });
      } else {
        const len = tile * r.range(0.14, 0.2);
        out.push(outline(leafPoints(x - len / 2, y, len, len * 0.34, r() * TAU), w, 'ink'));
      }
    });
    return out;
  },

  budStem(r, tile) {
    const cols = r.pick([3, 4]);
    const w = tile * r.range(0.012, 0.017);
    const out = [];
    for (const [x, y] of halfDropGrid(tile, cols, r.pick([2, 3]))) {
      const height = tile * r.range(0.18, 0.26);
      out.push(outline([[x, y + height / 2], [x, y - height / 2]], w, 'ink', false));
      const budR = height * r.range(0.16, 0.24);
      out.push(outline(leafPoints(x, y - height / 2 - budR * 0.2, budR * 2, budR * 0.72, -Math.PI / 2), w, 'ink'));
      for (const sign of [-1, 1]) {
        const len = height * 0.3;
        out.push(outline(leafPoints(x, y + height * 0.1, len, len * 0.34, sign > 0 ? -0.5 : Math.PI + 0.5), w, 'ink'));
      }
    }
    return out;
  },

  fernFrond(r, tile) {
    const count = r.pick([2, 3]);
    const w = tile * r.range(0.011, 0.015);
    const out = [];
    for (let i = 0; i < count; i++) {
      const x = ((i + 0.5) / count) * tile;
      const pts = stemPoints(x, tile, tile * 0.06, 1, true, r() * TAU);
      out.push(outline(pts, w, 'ink', false));
      const leaflets = r.int(11, 15);
      for (let k = 1; k < leaflets; k++) {
        const index = Math.round((k / leaflets) * (pts.length - 1));
        const [lx, ly] = pts[index];
        const len = tile * r.range(0.075, 0.115) * (1 - Math.abs(k / leaflets - 0.5) * 0.55);
        for (const sign of [-1, 1]) {
          out.push(outline(leafPoints(lx, ly, len, len * 0.3, sign > 0 ? -0.9 : Math.PI + 0.9), w * 0.85, 'ink'));
        }
      }
    }
    return out;
  },

  seedHead(r, tile) {
    const count = r.pick([3, 4]);
    const w = tile * r.range(0.010, 0.014);
    const out = [];
    for (const [x, y] of jitteredGrid(r, tile, count, 0.22)) {
      const spokes = r.int(12, 18);
      const radius = tile * r.range(0.1, 0.145);
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * TAU;
        out.push(outline([[x, y], [x + Math.cos(a) * radius, y + Math.sin(a) * radius]], w, 'ink', false));
        out.push({ t: 'circle', cx: x + Math.cos(a) * radius, cy: y + Math.sin(a) * radius, r: w * 1.3, fill: 'accent' });
      }
      out.push({ t: 'circle', cx: x, cy: y, r: radius * 0.1, fill: 'ink' });
    }
    return out;
  },

  branchLattice(r, tile) {
    const w = tile * r.range(0.012, 0.017);
    const out = [];
    const lines = r.pick([2, 3]);
    for (let i = 0; i < lines; i++) {
      for (const vertical of [true, false]) {
        const base = ((i + 0.5) / lines) * tile;
        const pts = stemPoints(base, tile, tile * 0.05, 1, vertical, r() * TAU);
        out.push(outline(pts, w, 'ink', false));
        const leaves = r.int(3, 5);
        for (let k = 0; k < leaves; k++) {
          const index = Math.round(((k + 0.5) / leaves) * (pts.length - 1));
          const [lx, ly] = pts[index];
          const len = tile * r.range(0.07, 0.11);
          const a = (vertical ? 0 : -Math.PI / 2) + (k % 2 ? 0.7 : -0.7);
          out.push(outline(leafPoints(lx, ly, len, len * 0.34, a), w * 0.9, 'ink'));
        }
      }
    }
    return out;
  },

  berrySprig(r, tile) {
    const cols = r.pick([2, 3]);
    const w = tile * r.range(0.012, 0.017);
    const out = [];
    for (const [x, y] of halfDropGrid(tile, cols, cols)) {
      const height = tile * r.range(0.16, 0.22);
      out.push(outline([[x, y + height / 2], [x, y - height / 2]], w, 'ink', false));
      const berries = r.int(3, 5);
      for (let i = 0; i < berries; i++) {
        const t = i / Math.max(1, berries - 1);
        const by = y - height / 2 + t * height * 0.8;
        const sign = i % 2 === 0 ? 1 : -1;
        const bx = x + sign * height * 0.22;
        out.push(outline([[x, by], [bx, by - height * 0.08]], w * 0.8, 'ink', false));
        out.push({ t: 'circle', cx: bx, cy: by - height * 0.08, r: height * r.range(0.08, 0.12), fill: 'accent' });
      }
      const len = height * 0.4;
      out.push(outline(leafPoints(x, y + height * 0.38, len, len * 0.34, -0.4), w, 'ink'));
    }
    return out;
  },

  wheatStalk(r, tile) {
    const cols = r.pick([3, 4, 5]);
    const w = tile * r.range(0.010, 0.014);
    const out = [];
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) / cols) * tile;
      const lean = r.range(-0.1, 0.1);
      out.push(outline([[x - lean * tile, tile], [x + lean * tile, 0]], w, 'ink', false));
      const grains = r.int(6, 9);
      for (let i = 0; i < grains; i++) {
        const t = i / grains;
        const gy = t * tile * 0.75;
        const gx = x + lean * tile * (1 - 2 * (gy / tile));
        const len = tile * 0.085;
        for (const sign of [-1, 1]) {
          out.push(outline(leafPoints(gx, gy, len, len * 0.42, sign > 0 ? -1.1 : Math.PI + 1.1), w, 'ink'));
        }
      }
    }
    return out;
  },

  ivyTrail(r, tile) {
    const w = tile * r.range(0.012, 0.017);
    const out = [];
    const strands = r.pick([2, 3]);
    for (let s = 0; s < strands; s++) {
      const y = ((s + 0.5) / strands) * tile;
      const pts = stemPoints(y, tile, tile * 0.08, 2, false, r() * TAU);
      out.push(outline(pts, w, 'ink', false));
      const leaves = r.int(5, 8);
      for (let i = 0; i < leaves; i++) {
        const index = Math.round(((i + 0.5) / leaves) * (pts.length - 1));
        const [lx, ly] = pts[index];
        const size = tile * r.range(0.05, 0.08);
        // A three-lobed leaf: one long centre lobe with two short sides.
        const a = i % 2 === 0 ? -Math.PI / 2 : Math.PI / 2;
        out.push(outline(leafPoints(lx, ly, size * 1.5, size * 0.5, a), w, 'ink'));
        out.push(outline(leafPoints(lx, ly, size * 0.95, size * 0.4, a - 0.85), w, 'ink'));
        out.push(outline(leafPoints(lx, ly, size * 0.95, size * 0.4, a + 0.85), w, 'ink'));
      }
    }
    return out;
  },

  tulipRow(r, tile) {
    const cols = r.pick([3, 4]);
    const rows = r.pick([2, 3]);
    const w = tile * r.range(0.012, 0.017);
    const out = [];
    for (const [x, y] of halfDropGrid(tile, cols, rows)) {
      const height = (tile / rows) * r.range(0.5, 0.65);
      const top = y - height / 2;
      out.push(outline([[x, y + height / 2], [x, top + height * 0.3]], w, 'ink', false));
      const cup = height * 0.3;
      out.push(outline([
        [x - cup * 0.5, top + height * 0.3],
        [x - cup * 0.55, top + height * 0.05],
        [x, top],
        [x + cup * 0.55, top + height * 0.05],
        [x + cup * 0.5, top + height * 0.3]
      ], w, 'ink', true));
      out.push(outline([[x, top + height * 0.3], [x, top + height * 0.04]], w * 0.8, 'ink', false));
      for (const sign of [-1, 1]) {
        const len = height * 0.42;
        out.push(outline(leafPoints(x, y + height * 0.3, len, len * 0.26, sign > 0 ? -0.75 : Math.PI + 0.75), w, 'ink'));
      }
    }
    return out;
  },

  scatteredSeeds(r, tile) {
    const w = tile * r.range(0.011, 0.014);
    const out = [];
    for (const [x, y] of jitteredGrid(r, tile, r.pick([8, 9, 11]), 0.32)) {
      const kind = r.int(0, 2);
      const size = tile * r.range(0.055, 0.09);
      if (kind === 0) {
        out.push({ t: 'ellipse', cx: x, cy: y, rx: size, ry: size * 0.55, rot: r() * TAU, fill: 'ink' });
      } else if (kind === 1) {
        out.push(outline(leafPoints(x - size, y, size * 2, size * 0.5, r() * TAU), w, 'ink'));
      } else {
        out.push({ t: 'ring', cx: x, cy: y, r: size * 0.7, w, stroke: 'accent' });
      }
    }
    return out;
  }
};

/* ------------------------------------------------------------------ *
 * Metadata
 * ------------------------------------------------------------------ */

const NAMES = {
  leafSprig: ['Sprig', 'Stem Pair', 'Shoot'],
  leafScatter: ['Fallen Leaves', 'Drift', 'Scatter'],
  leafFilled: ['Solid Leaf', 'Pressed Leaf', 'Inked Leaf'],
  trailingVine: ['Trailing Vine', 'Climber', 'Runner'],
  horizontalVine: ['Garland', 'Swag', 'Creeper'],
  blossomScatter: ['Blossom', 'Bloom', 'Petal Field'],
  blossomAndLeaf: ['Bloom & Leaf', 'Posy', 'Meadow'],
  budStem: ['Bud', 'Closed Bloom', 'Spike'],
  fernFrond: ['Fern', 'Frond', 'Bracken'],
  seedHead: ['Seed Head', 'Clock', 'Starburst Seed'],
  branchLattice: ['Branch Lattice', 'Thicket', 'Crossing Stems'],
  berrySprig: ['Berry Sprig', 'Currant', 'Rowan'],
  wheatStalk: ['Wheat', 'Grasses', 'Barley'],
  ivyTrail: ['Ivy', 'Trefoil Trail', 'Creeping Leaf'],
  tulipRow: ['Tulip', 'Cup Flower', 'Spring Row'],
  scatteredSeeds: ['Seeds', 'Husk & Pip', 'Foraged']
};

const SUFFIX = ['Fine', 'Open', 'Dense', 'Light', 'Tall'];

export const COLLECTION = 'botanical-linework';
export const PREFIX = 'bot';
export const TARGET = 30;
export const TILES = [280, 320, 360];
export const COVERAGE = { minInk: 0.02 };
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
    leafSprig: ['leaves', 'stems'],
    leafScatter: ['leaves', 'scattered'],
    leafFilled: ['leaves', 'solid'],
    trailingVine: ['vines', 'leaves'],
    horizontalVine: ['vines', 'leaves'],
    blossomScatter: ['blossoms', 'scattered'],
    blossomAndLeaf: ['blossoms', 'leaves'],
    budStem: ['buds', 'stems'],
    fernFrond: ['leaves', 'fern'],
    seedHead: ['seeds', 'radial'],
    branchLattice: ['stems', 'lattice'],
    berrySprig: ['berries', 'stems'],
    wheatStalk: ['grasses', 'stems'],
    ivyTrail: ['vines', 'leaves'],
    tulipRow: ['blossoms', 'stems'],
    scatteredSeeds: ['seeds', 'scattered']
  };
  return map[key] || ['botanical'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, COVERAGE, metaFor };
