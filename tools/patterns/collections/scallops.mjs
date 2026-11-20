/*
 * Scallops & Shells
 *
 * Scalloped edges, fans, clamshells and ribbed shells. Curves drawn as
 * arcs and polygons from first principles, laid out so the rows interlock
 * and the repeat closes on the tile edge.
 *
 * Nothing here reproduces or imitates any existing designer's pattern or
 * any company's mark.
 */

import { wrap, TAU } from '../lib.mjs';

const arc = (cx, cy, r, w, a0, a1, stroke) => ({ t: 'arc', cx, cy, r, w, a0, a1, stroke });
const dot = (cx, cy, r, fill) => ({ t: 'circle', cx, cy, r, fill });

/** A filled half disc, flat side down unless turned. */
function halfDisc(cx, cy, radius, fill, up = true, squash = 1) {
  const pts = [];
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const a = (up ? Math.PI : 0) + (i / steps) * Math.PI;
    pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius * squash]);
  }
  return { t: 'poly', pts, fill };
}

/** A ribbed fan: a wedge with ribs radiating through it. */
function fanRibs(out, cx, cy, radius, ribs, weight, slot, a0 = Math.PI, a1 = TAU) {
  for (let k = 0; k <= ribs; k++) {
    const a = a0 + ((a1 - a0) * k) / ribs;
    out.push({
      t: 'line',
      pts: [[cx, cy], [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]],
      w: weight,
      stroke: slot,
      cap: 'butt'
    });
  }
}

const RECIPES = {
  scallopRows(r, tile) {
    // Solid scallops in rows, each row overlapping the one above.
    const cols = r.pick([3, 4, 5, 6]);
    const rows = r.pick([3, 4, 5, 6]);
    const cw = tile / cols;
    const ch = tile / rows;
    const radius = cw * r.range(0.5, 0.56);
    const squash = r.range(0.8, 1.4);
    const out = [];

    for (let j = rows - 1; j >= 0; j--) {
      const offset = j % 2 ? cw / 2 : 0;
      for (let i = -1; i <= cols; i++) {
        out.push(halfDisc(i * cw + offset, (j + 1) * ch, radius, j % 2 ? 'accent' : 'ink', false, squash));
      }
    }
    return out;
  },

  clamshell(r, tile) {
    // Nested arcs in interlocking rows: the clamshell idiom.
    const cols = r.pick([3, 4, 5, 6]);
    const rows = r.pick([3, 4, 5, 6]);
    const cw = tile / cols;
    const ch = tile / rows;
    const ribs = r.pick([3, 4, 5, 6]);
    const weight = cw * r.range(0.02, 0.05);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? cw / 2 : 0;
      for (let i = -1; i <= cols; i++) {
        const cx = i * cw + offset;
        const cy = j * ch;
        for (let k = 1; k <= ribs; k++) {
          out.push(arc(cx, cy, (cw / 2) * (k / ribs), weight, 0, Math.PI, k % 2 ? 'ink' : 'accent'));
        }
      }
    }
    return out;
  },

  ribbedShells(r, tile) {
    // A fan shell per cell, with ribs radiating from the hinge.
    const cols = r.pick([2, 3, 4, 5]);
    const rows = r.pick([2, 3, 4, 5]);
    const cw = tile / cols;
    const ch = tile / rows;
    const ribs = r.pick([5, 7, 9]);
    const weight = Math.min(cw, ch) * r.range(0.02, 0.045);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? cw / 2 : 0;
      for (let i = 0; i <= cols; i++) {
        const cx = i * cw + offset;
        const cy = (j + 0.78) * ch;
        const radius = Math.min(cw, ch) * r.range(0.34, 0.46);
        out.push(halfDisc(cx, cy, radius, (i + j) % 2 ? 'accent' : 'ink', true, r.range(0.8, 1.1)));
        fanRibs(out, cx, cy, radius * 0.92, ribs, weight, 'bg');
      }
    }
    return out;
  },

  scallopEdges(r, tile) {
    // Bands with a scalloped lower edge, stacked down the tile.
    const rows = r.pick([3, 4, 5, 6]);
    const rowStep = tile / rows;
    const per = r.pick([4, 6, 8]);
    const step = tile / per;
    const out = [];

    for (let j = 0; j < rows; j++) {
      const top = j * rowStep;
      const depth = rowStep * r.range(0.5, 0.78);
      const slot = j % 2 ? 'accent' : 'ink';
      out.push({ t: 'rect', x: -1, y: top, w: tile + 2, h: depth, fill: slot });
      for (let i = 0; i < per; i++) {
        out.push(halfDisc(i * step + step / 2, top + depth, step / 2, slot, false, r.range(0.5, 1)));
      }
    }
    return out;
  },

  fanRows(r, tile) {
    // Open fans standing in rows, drawn only as ribs.
    const cols = r.pick([3, 4, 5]);
    const rows = r.pick([3, 4, 5]);
    const cw = tile / cols;
    const ch = tile / rows;
    const ribs = r.pick([6, 8, 10]);
    const weight = Math.min(cw, ch) * r.range(0.02, 0.04);
    const spread = r.range(0.7, 1);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? cw / 2 : 0;
      for (let i = 0; i <= cols; i++) {
        const cx = i * cw + offset;
        const cy = (j + 0.85) * ch;
        const radius = Math.min(cw, ch) * 0.46;
        const half = (Math.PI * spread) / 2;
        fanRibs(out, cx, cy, radius, ribs, weight, (i + j) % 2 ? 'accent' : 'ink', -Math.PI / 2 - half, -Math.PI / 2 + half);
        out.push(arc(cx, cy, radius, weight, -Math.PI / 2 - half, -Math.PI / 2 + half, 'accent2'));
      }
    }
    return out;
  },

  cockles(r, tile) {
    // Small ribbed shells scattered on a jittered grid.
    const cells = r.pick([3, 4, 5]);
    const step = tile / cells;
    const out = [];

    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const cx = (i + 0.5 + r.range(-0.2, 0.2)) * step;
        const cy = (j + 0.5 + r.range(-0.2, 0.2)) * step;
        const radius = step * r.range(0.22, 0.38);
        const ribs = r.int(4, 7);
        const up = r.chance(0.5);
        out.push(halfDisc(cx, cy, radius, (i + j) % 2 ? 'accent' : 'ink', up, r.range(0.7, 1.1)));
        fanRibs(out, cx, cy, radius * 0.9, ribs, step * 0.02, 'bg', up ? Math.PI : 0, up ? TAU : Math.PI);
      }
    }
    return out;
  },

  waveScallop(r, tile) {
    /*
     * Scallops whose depth grows and shrinks across the row.
     *
     * The row count follows from the number across, so a scallop is about
     * as tall as it is wide. Picking the two independently gave small
     * scallops hanging under widely spaced rows, which reads as a fringe
     * rather than as scalloped cloth.
     */
    const per = r.pick([4, 6, 8, 12]);
    const step = tile / per;
    const rows = Math.max(2, Math.round(per / r.pick([1.5, 2, 3])));
    const rowStep = tile / rows;
    const cycles = r.pick([1, 2]);
    // The deepest scallop fills its row; the shallowest is about half.
    const deep = rowStep / (step / 2);
    const out = [];

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < per; i++) {
        // A whole number of cycles across the row, so the swell closes.
        const swell = 0.68 + 0.32 * (0.5 - Math.cos((i / per) * TAU * cycles) / 2);
        out.push(halfDisc(
          i * step + step / 2,
          (j + 1) * rowStep,
          step / 2,
          j % 2 ? 'accent' : 'ink',
          false,
          deep * swell
        ));
      }
    }
    return out;
  },

  shellBorder(r, tile) {
    // A band of alternating up and down scallops, like a shell border.
    const per = r.pick([6, 8, 10, 12]);
    const step = tile / per;
    const rows = r.pick([3, 4, 5]);
    const rowStep = tile / rows;
    const radius = step * r.range(0.46, 0.56);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const y = (j + 0.5) * rowStep;
      for (let i = 0; i < per; i++) {
        const up = i % 2 === 0;
        out.push(halfDisc(i * step + step / 2, y, radius, up ? 'ink' : 'accent', up, 1));
      }
    }
    return out;
  },

  pearlRows(r, tile) {
    // Scallops with a bead sitting in each notch.
    const per = r.pick([4, 6, 8]);
    const step = tile / per;
    const rows = r.pick([3, 4, 5]);
    const rowStep = tile / rows;
    const out = [];

    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? step / 2 : 0;
      const y = (j + 1) * rowStep;
      for (let i = -1; i <= per; i++) {
        out.push(halfDisc(i * step + offset, y, step / 2, j % 2 ? 'accent' : 'ink', false, r.range(0.7, 1)));
        out.push(dot(i * step + offset + step / 2, y - step * 0.08, step * r.range(0.07, 0.13), 'accent2'));
      }
    }
    return out;
  },

  nautilus(r, tile) {
    /*
     * A spiral of arcs, each a quarter turn and each a little larger than
     * the last. Centres sit on an exact division of the tile.
     */
    // Four spirals on a whole tile reads as an empty page with a few marks
    // on it, so there are more of them and each is drawn heavier.
    const n = r.pick([3, 4, 5]);
    const step = tile / n;
    const turns = r.pick([6, 7, 8, 9]);
    const weight = step * r.range(0.04, 0.085);
    const growth = r.range(1.18, 1.4);
    const out = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = (i + 0.5) * step;
        const cy = (j + 0.5) * step;
        let radius = step * 0.07;
        for (let k = 0; k < turns; k++) {
          const a0 = (k * Math.PI) / 2;
          out.push(arc(cx, cy, radius, weight, a0, a0 + Math.PI / 2, k % 2 ? 'ink' : 'accent'));
          radius *= growth;
          if (radius > step * 0.46) break;
        }
      }
    }
    return out;
  },

  scallopLattice(r, tile) {
    // Scallops facing all four ways around each crossing of a grid.
    const n = r.pick([2, 3, 4]);
    const step = tile / n;
    const radius = step * r.range(0.2, 0.3);
    const weight = step * r.range(0.02, 0.045);
    const ribs = r.pick([2, 3]);
    const out = [];

    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        for (let q = 0; q < 4; q++) {
          const a0 = (q * Math.PI) / 2;
          for (let k = 1; k <= ribs; k++) {
            out.push(arc(i * step, j * step, radius * (k / ribs), weight, a0, a0 + Math.PI / 2, q % 2 ? 'ink' : 'accent'));
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
  scallopRows: ['Scallop Row', 'Overlap', 'Shingle'],
  clamshell: ['Clamshell', 'Nested Arc', 'Fish Scale'],
  ribbedShells: ['Ribbed Shell', 'Scallop Shell', 'Fan Shell'],
  scallopEdges: ['Scalloped Edge', 'Valance', 'Awning Edge'],
  fanRows: ['Open Fan', 'Rib Fan', 'Spread'],
  cockles: ['Cockle', 'Shell Scatter', 'Beachcomb'],
  waveScallop: ['Swelling Scallop', 'Tide Scallop', 'Graduated Shell'],
  shellBorder: ['Shell Border', 'Up and Down', 'Facing Scallop'],
  pearlRows: ['Pearl Row', 'Beaded Scallop', 'Drop and Shell'],
  nautilus: ['Nautilus', 'Spiral Shell', 'Whorl'],
  scallopLattice: ['Scallop Lattice', 'Quartered Arc', 'Rosette Arc']
};

const SUFFIX = ['Two', 'Deep', 'Fine', 'Wide', 'Close'];

export const COLLECTION = 'scallops-and-shells';
export const PREFIX = 'scl';
export const TARGET = 22;
export const TILES = [280, 320, 360];
export const COVERAGE = { minInk: 0.05 };
export { RECIPES };

export function metaFor(key, seen) {
  const names = NAMES[key];
  if (!names) throw new Error('scallops-and-shells: no names for recipe ' + key);
  const base = names[seen % names.length];
  return {
    name: seen < names.length ? base : base + ' ' + SUFFIX[seen % SUFFIX.length],
    tags: tagsFor(key)
  };
}

function tagsFor(key) {
  const map = {
    scallopRows: ['scallop', 'solid', 'rows'],
    clamshell: ['scallop', 'arcs', 'lines'],
    ribbedShells: ['shells', 'ribbed', 'solid'],
    scallopEdges: ['scallop', 'bands', 'solid'],
    fanRows: ['fans', 'ribs', 'lines'],
    cockles: ['shells', 'scattered', 'solid'],
    waveScallop: ['scallop', 'graduated', 'solid'],
    shellBorder: ['scallop', 'facing', 'rows'],
    pearlRows: ['scallop', 'beads', 'rows'],
    nautilus: ['spiral', 'arcs', 'lines'],
    scallopLattice: ['arcs', 'lattice', 'radial']
  };
  return map[key] || ['scallop'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, COVERAGE, metaFor };
