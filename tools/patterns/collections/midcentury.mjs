/*
 * Mid-Century Shapes
 *
 * Starbursts, boomerangs, organic blobs, and arcs.
 *
 * The character of this collection comes from mixing scales deliberately:
 * a large form anchors the tile, smaller marks fill the gaps, and the
 * spacing is uneven enough that the repeat does not read as a grid.
 *
 * These are generic period forms — rays, arcs, lozenges, soft blobs —
 * constructed from parameters. Nothing is copied from any designer's work.
 */

import { TAU, jitteredGrid, halfDropGrid } from '../lib.mjs';

/* ------------------------------------------------------------------ *
 * Shape helpers
 * ------------------------------------------------------------------ */

/** A soft closed shape with gently varying radius. */
function blobShape(r, cx, cy, radius, wobble = 0.3, points = 8) {
  const radii = [];
  for (let i = 0; i < points; i++) radii.push(radius * (1 + r.range(-wobble, wobble)));
  return { t: 'blob', cx, cy, radii, rot: r() * TAU };
}

/** A kidney: a thick arc with round ends. */
function boomerang(cx, cy, radius, thickness, a0, sweep, slot) {
  return { t: 'arc', cx, cy, r: radius, a0, a1: a0 + sweep, w: thickness, stroke: slot, cap: 'round' };
}

/** Rays from a centre, alternating long and short. */
function starburst(cx, cy, rays, long, short, w, slot, rotation = 0) {
  const out = [];
  for (let i = 0; i < rays; i++) {
    const a = rotation + (i / rays) * TAU;
    const len = i % 2 === 0 ? long : short;
    out.push({
      t: 'line',
      pts: [[cx, cy], [cx + Math.cos(a) * len, cy + Math.sin(a) * len]],
      w,
      stroke: slot,
      cap: 'round'
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Recipes
 * ------------------------------------------------------------------ */

const RECIPES = {
  starburstField(r, tile) {
    const out = [];
    const points = halfDropGrid(tile, r.pick([2, 3]), r.pick([2, 3]));
    for (const [x, y] of points) {
      const radius = tile * r.range(0.09, 0.14);
      out.push(...starburst(x, y, r.pick([8, 12, 16]), radius, radius * r.range(0.45, 0.7), tile * r.range(0.008, 0.014), 'ink', r() * TAU));
      out.push({ t: 'circle', cx: x, cy: y, r: radius * 0.14, fill: 'accent' });
    }
    return out;
  },

  asteriskScatter(r, tile) {
    const out = [];
    for (const [x, y] of jitteredGrid(r, tile, r.pick([6, 8, 9]), 0.34)) {
      const radius = tile * r.range(0.05, 0.095);
      const arms = r.pick([3, 4, 6]);
      const w = tile * r.range(0.009, 0.016);
      for (let i = 0; i < arms; i++) {
        const a = (i / arms) * Math.PI;
        out.push({
          t: 'line',
          pts: [[x - Math.cos(a) * radius, y - Math.sin(a) * radius], [x + Math.cos(a) * radius, y + Math.sin(a) * radius]],
          w,
          stroke: r.chance(0.25) ? 'accent' : 'ink',
          cap: 'round'
        });
      }
    }
    return out;
  },

  boomerangs(r, tile) {
    const out = [];
    for (const [x, y] of jitteredGrid(r, tile, r.pick([4, 5, 6]), 0.3)) {
      const radius = tile * r.range(0.1, 0.16);
      const thickness = radius * r.range(0.3, 0.46);
      const a0 = r() * TAU;
      out.push(boomerang(x, y, radius, thickness, a0, r.range(1.1, 2.1), r.chance(0.35) ? 'accent' : 'ink'));
    }
    return out;
  },

  boomerangRows(r, tile) {
    const cols = r.pick([2, 3]);
    const rows = r.pick([3, 4]);
    const out = [];
    for (const [x, y] of halfDropGrid(tile, cols, rows)) {
      const radius = (tile / cols) * r.range(0.26, 0.36);
      out.push(boomerang(x, y, radius, radius * 0.38, Math.PI * 0.75, Math.PI * 1.5, 'ink'));
      out.push({ t: 'circle', cx: x, cy: y - radius, r: radius * 0.12, fill: 'accent' });
    }
    return out;
  },

  organicBlobs(r, tile) {
    const out = [];
    const big = jitteredGrid(r, tile, r.pick([3, 4]), 0.3);
    for (const [x, y] of big) {
      out.push({ ...blobShape(r, x, y, tile * r.range(0.11, 0.17), 0.26), fill: r.chance(0.4) ? 'accent' : 'ink' });
    }
    for (const [x, y] of jitteredGrid(r, tile, r.pick([6, 8]), 0.42)) {
      out.push({ t: 'circle', cx: x, cy: y, r: tile * r.range(0.012, 0.025), fill: 'ink' });
    }
    return out;
  },

  blobOutlines(r, tile) {
    const out = [];
    const w = tile * r.range(0.009, 0.015);
    for (const [x, y] of jitteredGrid(r, tile, r.pick([4, 5, 6]), 0.3)) {
      const radius = tile * r.range(0.09, 0.14);
      const radii = [];
      const points = 9;
      for (let i = 0; i < points; i++) radii.push(radius * (1 + r.range(-0.22, 0.22)));
      out.push({ t: 'blob', cx: x, cy: y, radii, rot: r() * TAU, fill: 'bg' });
      // The outline is a second blob with the same radii, drawn as a curve.
      const pts = radii.map((rad, i) => {
        const a = (i / points) * TAU;
        return [x + Math.cos(a) * rad, y + Math.sin(a) * rad];
      });
      out.push({ t: 'curve', pts, w, stroke: 'ink', closed: true, cap: 'round' });
    }
    return out;
  },

  arcFans(r, tile) {
    const out = [];
    const cols = r.pick([2, 3]);
    const rows = r.pick([2, 3]);
    for (const [x, y] of halfDropGrid(tile, cols, rows)) {
      const rings = r.pick([3, 4, 5]);
      const radius = (tile / cols) * r.range(0.3, 0.44);
      const w = radius * r.range(0.1, 0.16);
      const a0 = r.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      for (let k = 1; k <= rings; k++) {
        out.push({
          t: 'arc', cx: x, cy: y, r: (radius * k) / rings,
          a0, a1: a0 + Math.PI, w, stroke: k % 2 ? 'ink' : 'accent', cap: 'butt'
        });
      }
    }
    return out;
  },

  halfCircles(r, tile) {
    const cols = r.pick([3, 4]);
    const rows = r.pick([3, 4]);
    const cw = tile / cols;
    const ch = tile / rows;
    const out = [];
    for (let row = 0; row < rows; row++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw + cw / 2;
        const y = row * ch + ch / 2;
        const radius = Math.min(cw, ch) * 0.44;
        const turn = (c + row) % 4;
        const a0 = (turn * TAU) / 4;
        const pts = [];
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          const a = a0 + (i / steps) * Math.PI;
          pts.push([x + Math.cos(a) * radius, y + Math.sin(a) * radius]);
        }
        out.push({ t: 'poly', pts, fill: (c + row) % 2 ? 'accent' : 'ink' });
      }
    }
    return out;
  },

  atomicDots(r, tile) {
    const out = [];
    const w = tile * r.range(0.007, 0.012);
    for (const [x, y] of halfDropGrid(tile, r.pick([2, 3]), r.pick([2, 3]))) {
      const radius = tile * r.range(0.07, 0.11);
      out.push({ t: 'circle', cx: x, cy: y, r: radius * 0.3, fill: 'accent' });
      const orbits = r.pick([2, 3]);
      for (let i = 0; i < orbits; i++) {
        out.push({
          t: 'ellipse', cx: x, cy: y, rx: radius, ry: radius * 0.34,
          rot: (i / orbits) * Math.PI, fill: 'bg'
        });
      }
      for (let i = 0; i < orbits; i++) {
        const a = (i / orbits) * Math.PI;
        const pts = [];
        const steps = 36;
        for (let k = 0; k <= steps; k++) {
          const t = (k / steps) * TAU;
          const ex = Math.cos(t) * radius;
          const ey = Math.sin(t) * radius * 0.34;
          pts.push([x + ex * Math.cos(a) - ey * Math.sin(a), y + ex * Math.sin(a) + ey * Math.cos(a)]);
        }
        out.push({ t: 'line', pts, w, stroke: 'ink', closed: true, cap: 'round' });
      }
      out.push({ t: 'circle', cx: x, cy: y, r: radius * 0.18, fill: 'ink' });
    }
    return out;
  },

  lozenges(r, tile) {
    const cols = r.pick([3, 4]);
    const rows = r.pick([3, 4]);
    const out = [];
    for (const [x, y] of halfDropGrid(tile, cols, rows)) {
      const rx = (tile / cols) * r.range(0.16, 0.26);
      const ry = rx * r.range(0.38, 0.6);
      out.push({ t: 'ellipse', cx: x, cy: y, rx, ry, rot: r.pick([0, 0.4, -0.4, Math.PI / 2]), fill: r.chance(0.35) ? 'accent' : 'ink' });
    }
    return out;
  },

  wedgeFan(r, tile) {
    const out = [];
    const cols = r.pick([2, 3]);
    for (const [x, y] of halfDropGrid(tile, cols, cols)) {
      const radius = (tile / cols) * r.range(0.3, 0.42);
      const wedges = r.pick([5, 6, 8]);
      const rotation = r() * TAU;
      for (let i = 0; i < wedges; i++) {
        if (i % 2) continue;
        const a0 = rotation + (i / wedges) * TAU;
        const a1 = rotation + ((i + 1) / wedges) * TAU;
        const pts = [[x, y]];
        const steps = 10;
        for (let k = 0; k <= steps; k++) {
          const a = a0 + ((a1 - a0) * k) / steps;
          pts.push([x + Math.cos(a) * radius, y + Math.sin(a) * radius]);
        }
        out.push({ t: 'poly', pts, fill: 'ink' });
      }
      out.push({ t: 'circle', cx: x, cy: y, r: radius * 0.16, fill: 'accent' });
    }
    return out;
  },

  mixedScale(r, tile) {
    const out = [];
    // One anchor form, then smaller marks around it.
    const ax = tile * r.range(0.3, 0.7);
    const ay = tile * r.range(0.3, 0.7);
    out.push({ ...blobShape(r, ax, ay, tile * r.range(0.17, 0.24), 0.2), fill: 'ink' });

    for (const [x, y] of jitteredGrid(r, tile, r.pick([5, 6]), 0.4)) {
      const kind = r.int(0, 2);
      const size = tile * r.range(0.03, 0.06);
      if (kind === 0) out.push({ t: 'circle', cx: x, cy: y, r: size, fill: 'accent' });
      else if (kind === 1) out.push(boomerang(x, y, size * 1.6, size * 0.5, r() * TAU, 1.4, 'ink'));
      else out.push(...starburst(x, y, 6, size * 1.5, size * 0.8, tile * 0.007, 'ink', r() * TAU));
    }
    return out;
  },

  thinAccents(r, tile) {
    const out = [];
    const w = tile * r.range(0.005, 0.009);
    const lines = r.pick([5, 7, 9]);
    for (let i = 0; i < lines; i++) {
      const y = ((i + 0.5) / lines) * tile;
      const pts = [];
      const steps = 40;
      const amp = tile * r.range(0.02, 0.06);
      const cycles = r.pick([1, 2]);
      const phase = r() * TAU;
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        pts.push([t * tile, y + Math.sin(phase + t * TAU * cycles) * amp]);
      }
      out.push({ t: 'curve', pts, w, stroke: 'ink' });
    }
    for (const [x, y] of jitteredGrid(r, tile, r.pick([4, 6]), 0.4)) {
      out.push({ t: 'circle', cx: x, cy: y, r: tile * r.range(0.015, 0.03), fill: 'accent' });
    }
    return out;
  },

  kidneyGrid(r, tile) {
    const cols = r.pick([2, 3]);
    const out = [];
    for (const [x, y] of halfDropGrid(tile, cols, cols)) {
      const size = (tile / cols) * r.range(0.2, 0.3);
      const radii = [];
      // A kidney: a blob with one side pushed in.
      for (let i = 0; i < 10; i++) {
        const t = i / 10;
        const pinch = Math.cos(t * TAU) > 0.5 ? 0.55 : 1;
        radii.push(size * pinch * (1 + r.range(-0.08, 0.08)));
      }
      out.push({ t: 'blob', cx: x, cy: y, radii, rot: r() * TAU, fill: r.chance(0.35) ? 'accent' : 'ink' });
    }
    return out;
  },

  arcAndDot(r, tile) {
    const out = [];
    const cols = r.pick([3, 4]);
    const w = tile * r.range(0.012, 0.022);
    for (const [x, y] of halfDropGrid(tile, cols, cols)) {
      const radius = (tile / cols) * r.range(0.26, 0.36);
      const a0 = r.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]) + r.range(-0.3, 0.3);
      out.push({ t: 'arc', cx: x, cy: y, r: radius, a0, a1: a0 + r.range(1.4, 2.6), w, stroke: 'ink', cap: 'round' });
      out.push({ t: 'circle', cx: x, cy: y, r: radius * r.range(0.14, 0.22), fill: 'accent' });
    }
    return out;
  }
};

/* ------------------------------------------------------------------ *
 * Metadata
 * ------------------------------------------------------------------ */

const NAMES = {
  starburstField: ['Starburst', 'Sputnik', 'Radiant'],
  asteriskScatter: ['Asterisk', 'Spark', 'Snap'],
  boomerangs: ['Boomerang', 'Bow', 'Crescent'],
  boomerangRows: ['Boomerang Row', 'Swing', 'Arcade'],
  organicBlobs: ['Blob', 'Pebble', 'Amoeba'],
  blobOutlines: ['Open Blob', 'Outline Pebble', 'Contour'],
  arcFans: ['Arc Fan', 'Rainbow', 'Half Round'],
  halfCircles: ['Half Circle', 'Turning Moon', 'Dome'],
  atomicDots: ['Atomic', 'Orbit', 'Nucleus'],
  lozenges: ['Lozenge', 'Capsule', 'Pill'],
  wedgeFan: ['Wedge', 'Pinwheel Fan', 'Sunray'],
  mixedScale: ['Composition', 'Still Life', 'Arrangement'],
  thinAccents: ['Thin Line', 'Wave Line', 'Contour Line'],
  kidneyGrid: ['Kidney', 'Bean', 'Palette'],
  arcAndDot: ['Arc & Dot', 'Comma', 'Hook']
};

const SUFFIX = ['Two', 'Bold', 'Light', 'Loose', 'Close'];

export const COLLECTION = 'mid-century-shapes';
export const PREFIX = 'mid';
export const TARGET = 30;
export const TILES = [280, 320, 360];
export const COVERAGE = { minInk: 0.025 };
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
    starburstField: ['starbursts', 'radial'],
    asteriskScatter: ['starbursts', 'scattered'],
    boomerangs: ['boomerangs', 'arcs'],
    boomerangRows: ['boomerangs', 'arcs'],
    organicBlobs: ['blobs', 'solid'],
    blobOutlines: ['blobs', 'lines'],
    arcFans: ['arcs', 'radial'],
    halfCircles: ['arcs', 'solid'],
    atomicDots: ['atomic', 'lines'],
    lozenges: ['blobs', 'solid'],
    wedgeFan: ['radial', 'solid'],
    mixedScale: ['blobs', 'mixed'],
    thinAccents: ['lines', 'subtle'],
    kidneyGrid: ['blobs', 'solid'],
    arcAndDot: ['arcs', 'dots']
  };
  return map[key] || ['mid-century'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, COVERAGE, metaFor };
