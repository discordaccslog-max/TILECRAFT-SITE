/*
 * Waves & Water
 *
 * Wave rows, ripples, currents and droplets. Every wave family here uses a
 * whole number of cycles across the tile, which is what lets a curve
 * repeat exactly; anything drawn point by point is closed by hand at the
 * tile edge rather than left to chance.
 *
 * Ordinary wave geometry, drawn from first principles. Nothing here
 * reproduces or imitates any existing designer's pattern or any company's
 * mark.
 */

import { wrap, TAU } from '../lib.mjs';

const dot = (cx, cy, r, fill) => ({ t: 'circle', cx, cy, r, fill });
const ring = (cx, cy, r, w, stroke) => ({ t: 'ring', cx, cy, r, w, stroke });
const arc = (cx, cy, r, w, a0, a1, stroke) => ({ t: 'arc', cx, cy, r, w, a0, a1, stroke });

/** A sine run across the tile, as a polyline that closes on the edge. */
function waveLine(tile, y, cycles, amplitude, steps, phase = 0) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * tile;
    pts.push([x, y + Math.sin((i / steps) * TAU * cycles + phase) * amplitude]);
  }
  return pts;
}

const RECIPES = {
  waveRows(r, tile) {
    // Rows of sine waves, each row shifted along from the one above.
    const rows = r.pick([4, 6, 8, 10]);
    const rowStep = tile / rows;
    const cycles = r.pick([1, 2, 3]);
    const amplitude = rowStep * r.range(0.22, 0.46);
    const weight = rowStep * r.range(0.08, 0.2);
    const shift = r.pick([0, 0.25, 0.5]);
    const out = [];

    for (let row = 0; row < rows; row++) {
      out.push({
        t: 'line',
        pts: waveLine(tile, row * rowStep + rowStep / 2, cycles, amplitude, 64, row * shift * TAU),
        w: weight,
        stroke: row % 2 ? 'accent' : 'ink',
        cap: 'butt'
      });
    }
    return out;
  },

  doubleCurrent(r, tile) {
    // Pairs of waves running close together, like a current line.
    const rows = r.pick([3, 4, 5, 6]);
    const rowStep = tile / rows;
    const cycles = r.pick([1, 2]);
    const amplitude = rowStep * r.range(0.2, 0.36);
    const weight = rowStep * r.range(0.04, 0.09);
    const gap = rowStep * r.range(0.12, 0.24);
    const out = [];

    for (let row = 0; row < rows; row++) {
      const base = row * rowStep + rowStep / 2;
      for (const [offset, slot] of [[0, 'ink'], [gap, 'accent']]) {
        out.push({
          t: 'line',
          pts: waveLine(tile, base + offset, cycles, amplitude, 64),
          w: weight,
          stroke: slot,
          cap: 'round'
        });
      }
    }
    return out;
  },

  scallopWaves(r, tile) {
    /*
     * Overlapping arcs in offset rows, the oldest way of drawing water.
     * Each arc is a half circle and the rows are dropped half a step, so
     * the scales interlock.
     */
    const columns = r.pick([3, 4, 5, 6]);
    const step = tile / columns;
    const rows = r.pick([3, 4, 5, 6]);
    const rowStep = tile / rows;
    const ribs = r.pick([2, 3, 4]);
    const weight = step * r.range(0.025, 0.055);
    const out = [];

    for (let row = 0; row < rows; row++) {
      const offset = row % 2 ? step / 2 : 0;
      for (let c = -1; c <= columns; c++) {
        const cx = c * step + offset;
        const cy = row * rowStep;
        for (let k = 1; k <= ribs; k++) {
          out.push(arc(cx, cy, (step / 2) * (k / ribs), weight, 0, Math.PI, k % 2 ? 'ink' : 'accent'));
        }
      }
    }
    return out;
  },

  ripples(r, tile) {
    // Concentric rings from a few centres, as a stone dropped in water.
    const centres = r.pick([1, 2, 4]);
    const rings = r.pick([4, 6, 8, 10]);
    const weight = (tile / rings) * r.range(0.06, 0.16);
    const out = [];

    // Centres on an exact division of the tile, so every ring wraps.
    const grid = centres === 1 ? [[tile / 2, tile / 2]] :
      centres === 2 ? [[tile / 4, tile / 4], [(tile * 3) / 4, (tile * 3) / 4]] :
        [[tile / 4, tile / 4], [(tile * 3) / 4, tile / 4], [tile / 4, (tile * 3) / 4], [(tile * 3) / 4, (tile * 3) / 4]];

    for (const [cx, cy] of grid) {
      for (let k = 1; k <= rings; k++) {
        out.push(ring(cx, cy, (tile / 2) * (k / rings) * 0.95, weight, k % 2 ? 'ink' : 'accent'));
      }
    }
    return out;
  },

  swell(r, tile) {
    /*
     * A wave whose height grows and falls across the tile. The envelope is
     * itself a whole number of cycles, so the run closes on the edge.
     */
    const rows = r.pick([4, 6, 8]);
    const rowStep = tile / rows;
    const cycles = r.pick([2, 3, 4]);
    const envelope = r.pick([1, 2]);
    const peak = rowStep * r.range(0.3, 0.5);
    const weight = rowStep * r.range(0.06, 0.14);
    const steps = 96;
    const out = [];

    for (let row = 0; row < rows; row++) {
      const base = row * rowStep + rowStep / 2;
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const height = peak * (0.35 + 0.65 * (0.5 - Math.cos(t * TAU * envelope) / 2));
        pts.push([t * tile, base + Math.sin(t * TAU * cycles) * height]);
      }
      out.push({ t: 'line', pts, w: weight, stroke: row % 2 ? 'accent' : 'ink', cap: 'round' });
    }
    return out;
  },

  droplets(r, tile) {
    // Rings and dots scattered on a jittered grid, as rain on a surface.
    const cells = r.pick([3, 4, 5, 6]);
    const step = tile / cells;
    const out = [];

    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const cx = (i + 0.5 + r.range(-0.22, 0.22)) * step;
        const cy = (j + 0.5 + r.range(-0.22, 0.22)) * step;
        const radius = step * r.range(0.14, 0.34);
        const rings = r.int(1, 3);
        for (let k = 1; k <= rings; k++) {
          out.push(ring(cx, cy, radius * (k / rings), step * r.range(0.015, 0.035), k % 2 ? 'ink' : 'accent'));
        }
        if (r.chance(0.6)) out.push(dot(cx, cy, step * r.range(0.03, 0.07), 'accent2'));
      }
    }
    return out;
  },

  tideLines(r, tile) {
    // Long shallow waves stacked close, which reads as a tide chart.
    const rows = r.pick([10, 14, 18, 24]);
    const rowStep = tile / rows;
    const cycles = r.pick([1, 2]);
    const amplitude = rowStep * r.range(0.6, 1.6);
    const weight = rowStep * r.range(0.1, 0.25);
    const drift = r.range(0, 0.35);
    const out = [];

    for (let row = 0; row < rows; row++) {
      out.push({
        t: 'line',
        pts: waveLine(tile, row * rowStep + rowStep / 2, cycles, amplitude, 72, row * drift),
        w: weight,
        stroke: row % 3 === 0 ? 'accent' : 'ink',
        cap: 'butt'
      });
    }
    return out;
  },

  crestRows(r, tile) {
    /*
     * Solid wave crests, each row a filled band with a wave along its top
     * edge, so the water reads as mass rather than as line.
     */
    const rows = r.pick([3, 4, 5, 6]);
    const rowStep = tile / rows;
    const cycles = r.pick([1, 2, 3]);
    const amplitude = rowStep * r.range(0.14, 0.3);
    const steps = 64;
    const out = [];

    for (let row = 0; row < rows; row++) {
      const base = row * rowStep + rowStep / 2;
      const top = waveLine(tile, base, cycles, amplitude, steps, row * Math.PI);
      // Closed back along the bottom of the tile's band.
      const pts = [...top, [tile, base + rowStep], [0, base + rowStep]];
      out.push({ t: 'poly', pts, fill: row % 2 ? 'accent' : 'ink' });
    }
    return out;
  },

  whirl(r, tile) {
    /*
     * Arcs turned through a quarter at each cell, which reads as water
     * curling. A quarter turn per cell has a period of four, so the cell
     * count is a multiple of four and the field closes.
     */
    const n = r.pick([4, 8]);
    const step = tile / n;
    const weight = step * r.range(0.07, 0.16);
    const arcs = r.pick([1, 2]);
    const out = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const turn = ((i + j * 2) % 4) * (Math.PI / 2);
        for (let k = 1; k <= arcs; k++) {
          const radius = (step / 2) * (k / arcs) * 0.9;
          out.push(arc(i * step + step / 2, j * step + step / 2, radius, weight, turn, turn + Math.PI / 2, k % 2 ? 'ink' : 'accent'));
        }
      }
    }
    return out;
  },

  shoal(r, tile) {
    // Small curved dashes all leaning the same way, as a shoal or a current.
    const cols = r.pick([5, 7, 9]);
    const rows = r.pick([5, 7, 9]);
    const cw = tile / cols;
    const ch = tile / rows;
    const weight = Math.min(cw, ch) * r.range(0.08, 0.16);
    const span = r.range(0.5, 1.1);
    const out = [];

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const cx = (i + 0.5 + (j % 2 ? 0.5 : 0)) * cw;
        const cy = (j + 0.5) * ch;
        const radius = Math.min(cw, ch) * r.range(0.3, 0.45);
        const a0 = Math.PI * r.range(0.9, 1.1);
        out.push(arc(cx, cy, radius, weight, a0, a0 + Math.PI * span, (i + j) % 2 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  bubbleField(r, tile) {
    // Circles at a spread of sizes, open and filled, rising through the tile.
    const cells = r.pick([4, 5, 6, 7]);
    const step = tile / cells;
    const out = [];

    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const cx = (i + 0.5 + r.range(-0.26, 0.26)) * step;
        const cy = (j + 0.5 + r.range(-0.26, 0.26)) * step;
        const radius = step * r.range(0.1, 0.4);
        if (r.chance(0.45)) {
          out.push(dot(cx, cy, radius, (i + j) % 2 ? 'accent' : 'ink'));
        } else {
          out.push(ring(cx, cy, radius, step * r.range(0.02, 0.05), 'ink'));
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
  waveRows: ['Wave Row', 'Swell Line', 'Undulation'],
  doubleCurrent: ['Double Current', 'Twin Wave', 'Channel'],
  scallopWaves: ['Scallop Wave', 'Overlapping Water', 'Fish Scale'],
  ripples: ['Ripple', 'Stone Drop', 'Concentric Water'],
  swell: ['Swell', 'Rolling Sea', 'Breath'],
  droplets: ['Droplet', 'Rainfall', 'Spatter Ring'],
  tideLines: ['Tide Line', 'Shoreline', 'Chart Line'],
  crestRows: ['Crest', 'Solid Wave', 'Breaker'],
  whirl: ['Whirl', 'Eddy', 'Curl'],
  shoal: ['Shoal', 'Current Dash', 'Drift'],
  bubbleField: ['Bubble', 'Froth', 'Seafoam']
};

const SUFFIX = ['Two', 'Deep', 'Shallow', 'Wide', 'Close'];

export const COLLECTION = 'waves-and-water';
export const PREFIX = 'wav';
export const TARGET = 22;
export const TILES = [280, 320, 360];
export const COVERAGE = { minInk: 0.02 };
export { RECIPES };

export function metaFor(key, seen) {
  const names = NAMES[key];
  if (!names) throw new Error('waves-and-water: no names for recipe ' + key);
  const base = names[seen % names.length];
  return {
    name: seen < names.length ? base : base + ' ' + SUFFIX[seen % SUFFIX.length],
    tags: tagsFor(key)
  };
}

function tagsFor(key) {
  const map = {
    waveRows: ['waves', 'lines', 'rows'],
    doubleCurrent: ['waves', 'lines', 'fine'],
    scallopWaves: ['scallop', 'arcs', 'overlapping'],
    ripples: ['rings', 'concentric', 'radial'],
    swell: ['waves', 'lines', 'graduated'],
    droplets: ['rings', 'scattered', 'dots'],
    tideLines: ['waves', 'fine', 'dense'],
    crestRows: ['waves', 'solid', 'bold'],
    whirl: ['arcs', 'turned', 'curls'],
    shoal: ['arcs', 'scattered', 'dashes'],
    bubbleField: ['circles', 'scattered', 'mixed']
  };
  return map[key] || ['water'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, COVERAGE, metaFor };
