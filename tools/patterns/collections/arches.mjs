/*
 * Arches & Columns
 *
 * Arcades, colonnades, nested arches and keystones. Architectural
 * geometry: a round arch is a half circle on two uprights, and a row of
 * them repeats when the bay width divides the tile exactly.
 *
 * Drawn from first principles. Nothing here reproduces or imitates any
 * existing designer's pattern, any company's mark, or any particular
 * building.
 */

import { wrap, TAU } from '../lib.mjs';

const rect = (x, y, w, h, fill) => ({ t: 'rect', x, y, w, h, fill });
const arc = (cx, cy, r, w, a0, a1, stroke) => ({ t: 'arc', cx, cy, r, w, a0, a1, stroke });
const dot = (cx, cy, r, fill) => ({ t: 'circle', cx, cy, r, fill });

/** A filled round arch: a half disc on a pair of legs. */
function solidArch(cx, baseY, width, height, fill) {
  const radius = width / 2;
  const pts = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (i / steps) * Math.PI;
    pts.push([cx + Math.cos(a) * radius, baseY - height + Math.sin(a) * radius]);
  }
  pts.push([cx + radius, baseY], [cx - radius, baseY]);
  return { t: 'poly', pts, fill };
}

const RECIPES = {
  arcade(r, tile) {
    // A row of open arches on columns, the plain arcade.
    const bays = r.pick([2, 3, 4, 5]);
    const bay = tile / bays;
    const rows = r.pick([1, 2, 3]);
    const rowStep = tile / rows;
    const weight = bay * r.range(0.05, 0.11);
    const springLine = rowStep * r.range(0.42, 0.56);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const base = j * rowStep + rowStep;
      for (let i = 0; i <= bays; i++) {
        const cx = i * bay;
        // The column.
        out.push(rect(cx - weight / 2, base - springLine, weight, springLine, 'ink'));
      }
      for (let i = 0; i < bays; i++) {
        const cx = i * bay + bay / 2;
        out.push(arc(cx, base - springLine, bay / 2, weight, Math.PI, TAU, 'accent'));
      }
    }
    return out;
  },

  solidArches(r, tile) {
    // Filled arches standing in rows, as mass rather than line.
    const bays = r.pick([2, 3, 4, 5, 6]);
    const bay = tile / bays;
    const rows = r.pick([1, 2, 3]);
    const rowStep = tile / rows;
    const height = rowStep * r.range(0.6, 0.92);
    const gap = bay * r.range(0.04, 0.18);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const base = (j + 1) * rowStep;
      for (let i = 0; i < bays; i++) {
        out.push(solidArch(i * bay + bay / 2, base, bay - gap, height, j % 2 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  nestedArches(r, tile) {
    // Arches within arches, each ring a different ink.
    const bays = r.pick([2, 3, 4]);
    const bay = tile / bays;
    const rings = r.pick([3, 4, 5]);
    const weight = bay * r.range(0.025, 0.055);
    const rows = r.pick([1, 2]);
    const rowStep = tile / rows;
    const out = [];

    for (let j = 0; j < rows; j++) {
      const base = (j + 1) * rowStep - rowStep * 0.12;
      for (let i = 0; i < bays; i++) {
        const cx = i * bay + bay / 2;
        for (let k = 1; k <= rings; k++) {
          const radius = (bay / 2) * (k / rings) * 0.94;
          out.push(arc(cx, base, radius, weight, Math.PI, TAU, k % 2 ? 'ink' : 'accent'));
          out.push(rect(cx - radius - weight / 2, base, weight, rowStep * 0.12, k % 2 ? 'ink' : 'accent'));
          out.push(rect(cx + radius - weight / 2, base, weight, rowStep * 0.12, k % 2 ? 'ink' : 'accent'));
        }
      }
    }
    return out;
  },

  colonnade(r, tile) {
    // Columns with capitals and bases, no arches: a plain order.
    const bays = r.pick([4, 6, 8, 10]);
    const bay = tile / bays;
    const shaft = bay * r.range(0.16, 0.34);
    const capital = bay * r.range(0.4, 0.62);
    const capHeight = tile * r.range(0.04, 0.08);
    const fluted = r.chance(0.5);
    const out = [];

    for (let i = 0; i < bays; i++) {
      const cx = i * bay + bay / 2;
      out.push(rect(cx - shaft / 2, -1, shaft, tile + 2, 'ink'));
      if (fluted) {
        for (const d of [-0.22, 0.22]) {
          out.push(rect(cx + shaft * d - shaft * 0.04, -1, shaft * 0.08, tile + 2, 'accent2'));
        }
      }
      // Capital and base, at an exact division so they repeat vertically.
      const tiers = r.pick([1, 2]);
      for (let t = 0; t < tiers; t++) {
        const y = (t / tiers) * tile;
        out.push(rect(cx - capital / 2, y, capital, capHeight, 'accent'));
        out.push(rect(cx - capital / 2, y + tile / tiers - capHeight, capital, capHeight, 'accent'));
      }
    }
    return out;
  },

  keystones(r, tile) {
    // Arches with a wedge at the crown, drawn as a band of voussoirs.
    const bays = r.pick([2, 3, 4]);
    const bay = tile / bays;
    const rows = r.pick([1, 2]);
    const rowStep = tile / rows;
    const stones = r.pick([5, 7, 9]);
    const weight = bay * r.range(0.07, 0.13);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const base = (j + 1) * rowStep - rowStep * 0.18;
      for (let i = 0; i < bays; i++) {
        const cx = i * bay + bay / 2;
        const radius = bay * 0.42;
        for (let k = 0; k < stones; k++) {
          const a0 = Math.PI + (k / stones) * Math.PI;
          const a1 = Math.PI + ((k + 0.86) / stones) * Math.PI;
          const middle = k === Math.floor(stones / 2);
          out.push(arc(cx, base, radius, weight, a0, a1, middle ? 'accent' : 'ink'));
        }
        out.push(rect(cx - bay * 0.04, base - radius - weight, bay * 0.08, weight * 2, 'accent'));
      }
    }
    return out;
  },

  halfRounds(r, tile) {
    // Rows of half discs, alternately standing and hanging.
    const cols = r.pick([3, 4, 5, 6]);
    const rows = r.pick([3, 4, 5, 6]);
    const cw = tile / cols;
    const ch = tile / rows;
    const radius = Math.min(cw, ch) * r.range(0.32, 0.48);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const up = j % 2 === 0;
      const offset = j % 2 ? cw / 2 : 0;
      for (let i = 0; i <= cols; i++) {
        const cx = i * cw + offset;
        const cy = (j + (up ? 1 : 0)) * ch;
        const pts = [];
        const steps = 20;
        for (let k = 0; k <= steps; k++) {
          const a = (up ? Math.PI : 0) + (k / steps) * Math.PI;
          pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
        }
        out.push({ t: 'poly', pts, fill: (i + j) % 2 ? 'accent' : 'ink' });
      }
    }
    return out;
  },

  horseshoeRow(r, tile) {
    // Arches whose curve carries past the half circle before it straightens.
    const bays = r.pick([3, 4, 5, 6]);
    const bay = tile / bays;
    const rows = r.pick([2, 3]);
    const rowStep = tile / rows;
    const weight = bay * r.range(0.06, 0.12);
    const extra = r.range(0.15, 0.4);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const base = (j + 1) * rowStep - rowStep * 0.2;
      for (let i = 0; i < bays; i++) {
        const cx = i * bay + bay / 2;
        const radius = bay * 0.38;
        out.push(arc(cx, base, radius, weight, Math.PI - extra, TAU + extra, j % 2 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  windows(r, tile) {
    // Arched windows set into a wall, with a sill under each.
    const cols = r.pick([2, 3, 4]);
    const rows = r.pick([2, 3]);
    const cw = tile / cols;
    const ch = tile / rows;
    const width = cw * r.range(0.4, 0.62);
    const height = ch * r.range(0.4, 0.62);
    const out = [];

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const cx = (i + 0.5) * cw;
        const base = (j + 0.5) * ch + height / 2;
        out.push(solidArch(cx, base, width, height, 'ink'));
        out.push(rect(cx - width * 0.62, base, width * 1.24, ch * 0.05, 'accent'));
        if (r.chance(0.5)) out.push(dot(cx, base - height * 0.78, width * 0.12, 'accent2'));
      }
    }
    return out;
  },

  pillarsAndDots(r, tile) {
    // Slim uprights with a dot between each pair, a quiet architectural rhythm.
    const bays = r.pick([6, 8, 10, 12]);
    const bay = tile / bays;
    const weight = bay * r.range(0.1, 0.24);
    const dots = r.pick([2, 3, 4]);
    const out = [];

    for (let i = 0; i < bays; i++) {
      out.push(rect(i * bay, -1, weight, tile + 2, i % 2 ? 'accent' : 'ink'));
      for (let k = 0; k < dots; k++) {
        out.push(dot(i * bay + bay / 2, ((k + 0.5) / dots) * tile, bay * r.range(0.08, 0.16), 'accent2'));
      }
    }
    return out;
  },

  archLattice(r, tile) {
    /*
     * Arches facing both ways on alternate rows, which interlock into a
     * lattice. The row count is even so the alternation closes.
     */
    const bays = r.pick([3, 4, 5]);
    const bay = tile / bays;
    const rows = r.pick([2, 4]);
    const rowStep = tile / rows;
    const weight = bay * r.range(0.05, 0.1);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const up = j % 2 === 0;
      const offset = j % 2 ? bay / 2 : 0;
      const base = j * rowStep + (up ? rowStep : 0);
      for (let i = 0; i <= bays; i++) {
        const cx = i * bay + offset;
        out.push(arc(cx, base, bay / 2, weight, up ? Math.PI : 0, up ? TAU : Math.PI, up ? 'ink' : 'accent'));
      }
    }
    return out;
  },

  steppedPiers(r, tile) {
    // Piers that step inward as they rise, with a lintel across the top.
    const bays = r.pick([3, 4, 5]);
    const bay = tile / bays;
    const steps = r.pick([3, 4, 5]);
    const rows = r.pick([1, 2]);
    const rowStep = tile / rows;
    const out = [];

    for (let j = 0; j < rows; j++) {
      const base = (j + 1) * rowStep;
      for (let i = 0; i < bays; i++) {
        const cx = i * bay + bay / 2;
        for (let s2 = 0; s2 < steps; s2++) {
          const width = bay * (0.52 - 0.08 * s2);
          const h = (rowStep * 0.8) / steps;
          out.push(rect(cx - width / 2, base - (s2 + 1) * h, width, h * 0.92, j % 2 ? 'accent' : 'ink'));
        }
      }
      out.push(rect(-1, base - rowStep * 0.86, tile + 2, rowStep * 0.06, 'accent2'));
    }
    return out;
  }
};

/* ------------------------------------------------------------------ *
 * Metadata
 * ------------------------------------------------------------------ */

const NAMES = {
  arcade: ['Arcade', 'Cloister', 'Open Bay'],
  solidArches: ['Solid Arch', 'Blind Arcade', 'Massing'],
  nestedArches: ['Nested Arch', 'Order of Arches', 'Recessed Bay'],
  colonnade: ['Colonnade', 'Peristyle', 'Order'],
  keystones: ['Keystone', 'Voussoir', 'Crown Stone'],
  halfRounds: ['Half Round', 'Lunette', 'Dome Row'],
  horseshoeRow: ['Horseshoe Arch', 'Deep Arch', 'Carried Curve'],
  windows: ['Arched Window', 'Lancet', 'Casement Arch'],
  pillarsAndDots: ['Pillar and Dot', 'Baluster', 'Upright Rhythm'],
  archLattice: ['Arch Lattice', 'Interlace', 'Facing Arches'],
  steppedPiers: ['Stepped Pier', 'Buttress', 'Tiered Column']
};

const SUFFIX = ['Two', 'Tall', 'Wide', 'Close', 'Bold'];

export const COLLECTION = 'arches-and-columns';
export const PREFIX = 'arc';
export const TARGET = 22;
export const TILES = [280, 320, 360];
export const COVERAGE = { minInk: 0.055 };
export { RECIPES };

export function metaFor(key, seen) {
  const names = NAMES[key];
  if (!names) throw new Error('arches-and-columns: no names for recipe ' + key);
  const base = names[seen % names.length];
  return {
    name: seen < names.length ? base : base + ' ' + SUFFIX[seen % SUFFIX.length],
    tags: tagsFor(key)
  };
}

function tagsFor(key) {
  const map = {
    arcade: ['arches', 'lines', 'open'],
    solidArches: ['arches', 'solid', 'bold'],
    nestedArches: ['arches', 'nested', 'lines'],
    colonnade: ['columns', 'uprights', 'solid'],
    keystones: ['arches', 'stones', 'detail'],
    halfRounds: ['arches', 'solid', 'rows'],
    horseshoeRow: ['arches', 'lines', 'rows'],
    windows: ['arches', 'windows', 'solid'],
    pillarsAndDots: ['columns', 'dots', 'rhythm'],
    archLattice: ['arches', 'lattice', 'lines'],
    steppedPiers: ['columns', 'stepped', 'solid']
  };
  return map[key] || ['architecture'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, COVERAGE, metaFor };
