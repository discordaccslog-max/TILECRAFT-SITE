/*
 * Crystal & Facet
 *
 * Faceted planes, gems, prisms and shards. Facets are drawn as triangles
 * sharing their vertices with their neighbours, so the planes meet cleanly
 * instead of leaving hairlines between them, and every vertex grid wraps
 * at the tile edge.
 *
 * Drawn from first principles. Nothing here reproduces or imitates any
 * existing designer's pattern or any company's mark.
 */

import { wrap, TAU } from '../lib.mjs';

const poly = (pts, fill) => ({ t: 'poly', pts, fill });
const dot = (cx, cy, r, fill) => ({ t: 'circle', cx, cy, r, fill });

/**
 * A grid of vertices that wraps: the last row and column are the first
 * ones again, so a triangle spanning the edge meets its own continuation.
 */
function vertexGrid(r, tile, cols, rows, jitter) {
  const grid = [];
  for (let j = 0; j <= rows; j++) {
    const row = [];
    for (let i = 0; i <= cols; i++) {
      const wrapped = i === cols || j === rows;
      if (wrapped) {
        const src = grid[j % rows] ? grid[j % rows][i % cols] : null;
        row.push(src ? [src[0] + (i === cols ? tile : 0), src[1] + (j === rows ? tile : 0)] : [i * (tile / cols), j * (tile / rows)]);
      } else {
        row.push([
          (i + r.range(-jitter, jitter)) * (tile / cols),
          (j + r.range(-jitter, jitter)) * (tile / rows)
        ]);
      }
    }
    grid.push(row);
  }
  // The wrapped column and row need the real positions of row 0 / column 0.
  for (let j = 0; j <= rows; j++) {
    grid[j][cols] = [grid[j % rows][0][0] + tile, grid[j % rows][0][1]];
  }
  for (let i = 0; i <= cols; i++) {
    grid[rows][i] = [grid[0][i % cols][0] + (i === cols ? tile : 0), grid[0][i % cols][1] + tile];
  }
  return grid;
}

const RECIPES = {
  facetField(r, tile) {
    // A plane broken into triangles, each one a slightly different ink.
    const cols = r.pick([3, 4, 5, 6]);
    const rows = cols;
    const jitter = r.range(0.08, 0.26);
    const grid = vertexGrid(r, tile, cols, rows, jitter);
    const slots = ['ink', 'accent', 'accent2', 'bg'];
    const out = [];

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = grid[j][i];
        const b = grid[j][i + 1];
        const c = grid[j + 1][i + 1];
        const d = grid[j + 1][i];
        out.push(poly([a, b, c], slots[(i + j) % slots.length]));
        out.push(poly([a, c, d], slots[(i + j + 2) % slots.length]));
      }
    }
    return out;
  },

  gemRows(r, tile) {
    /*
     * A cut gem per cell: a top table, crown facets around it and a point
     * below, built as triangles from one set of vertices.
     */
    const cols = r.pick([2, 3, 4]);
    const rows = r.pick([2, 3, 4]);
    const cw = tile / cols;
    const ch = tile / rows;
    const facets = r.pick([5, 6, 8]);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? cw / 2 : 0;
      for (let i = 0; i <= cols; i++) {
        const cx = i * cw + offset;
        const cy = (j + 0.5) * ch;
        const outer = Math.min(cw, ch) * r.range(0.3, 0.44);
        const table = outer * r.range(0.35, 0.55);
        const tip = cy + outer * r.range(1, 1.5);

        // The crown: a ring of facets between the table and the girdle.
        for (let k = 0; k < facets; k++) {
          const a0 = (k / facets) * TAU - Math.PI / 2;
          const a1 = ((k + 1) / facets) * TAU - Math.PI / 2;
          const o0 = [cx + Math.cos(a0) * outer, cy + Math.sin(a0) * outer];
          const o1 = [cx + Math.cos(a1) * outer, cy + Math.sin(a1) * outer];
          const t0 = [cx + Math.cos(a0) * table, cy + Math.sin(a0) * table];
          const t1 = [cx + Math.cos(a1) * table, cy + Math.sin(a1) * table];
          out.push(poly([o0, o1, t1, t0], k % 2 ? 'ink' : 'accent'));
          // The pavilion, below the girdle.
          if (Math.sin(a0) > -0.2) out.push(poly([o0, o1, [cx, tip]], k % 2 ? 'accent2' : 'ink'));
        }
      }
    }
    return out;
  },

  prisms(r, tile) {
    // Upright bars shaded as three planes, which reads as a row of prisms.
    const bays = r.pick([4, 6, 8, 10]);
    const bay = tile / bays;
    const lean = r.range(0.12, 0.3);
    const out = [];

    for (let i = 0; i < bays; i++) {
      const x = i * bay;
      const left = bay * (0.5 - lean);
      out.push(poly([[x, -1], [x + left, -1], [x + left, tile + 1], [x, tile + 1]], 'ink'));
      out.push(poly([[x + left, -1], [x + bay * 0.5, -1], [x + bay * 0.5, tile + 1], [x + left, tile + 1]], 'accent'));
      out.push(poly([[x + bay * 0.5, -1], [x + bay, -1], [x + bay, tile + 1], [x + bay * 0.5, tile + 1]], 'accent2'));
    }
    return out;
  },

  shards(r, tile) {
    // Long thin triangles scattered and leaning, like splinters of glass.
    // A few small shards leave most of the tile bare, which reads as an
    // empty page rather than as broken glass, so the field is denser and
    // the pieces are long enough to overlap.
    const cells = r.pick([4, 5, 6]);
    const step = tile / cells;
    const slots = ['ink', 'accent', 'accent2'];
    const out = [];

    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const cx = (i + 0.5 + r.range(-0.3, 0.3)) * step;
        const cy = (j + 0.5 + r.range(-0.3, 0.3)) * step;
        const len = step * r.range(0.7, 1.4);
        const width = len * r.range(0.16, 0.36);
        const a = r() * TAU;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        out.push(poly(
          [
            [cx + dx * len, cy + dy * len],
            [cx - dy * width, cy + dx * width],
            [cx + dy * width, cy - dx * width]
          ],
          r.pick(slots)
        ));
      }
    }
    return out;
  },

  diamondFacets(r, tile) {
    // A diamond grid, each diamond split into four shaded quarters.
    const n = r.pick([3, 4, 5, 6]);
    const step = tile / n;
    const out = [];

    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const cx = i * step;
        const cy = j * step;
        const top = [cx, cy - step / 2];
        const right = [cx + step / 2, cy];
        const bottom = [cx, cy + step / 2];
        const left = [cx - step / 2, cy];
        const mid = [cx, cy];
        const base = (i + j) % 2;
        out.push(poly([top, right, mid], base ? 'ink' : 'accent'));
        out.push(poly([right, bottom, mid], base ? 'accent' : 'accent2'));
        out.push(poly([bottom, left, mid], base ? 'accent2' : 'ink'));
        out.push(poly([left, top, mid], base ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  crystalCluster(r, tile) {
    // Clusters of upright crystals of different heights, standing in rows.
    const cols = r.pick([3, 4, 5]);
    const rows = r.pick([2, 3]);
    const cw = tile / cols;
    const ch = tile / rows;
    const per = r.pick([2, 3, 4]);
    const out = [];

    for (let j = 0; j < rows; j++) {
      const base = (j + 1) * ch;
      for (let i = 0; i < cols; i++) {
        for (let k = 0; k < per; k++) {
          const cx = (i + (k + 0.5) / per) * cw;
          const w = (cw / per) * r.range(0.35, 0.7);
          const h = ch * r.range(0.4, 0.9);
          const tipOffset = w * r.range(-0.3, 0.3);
          out.push(poly(
            [
              [cx - w / 2, base],
              [cx + w / 2, base],
              [cx + w / 2, base - h * 0.7],
              [cx + tipOffset, base - h],
              [cx - w / 2, base - h * 0.7]
            ],
            k % 2 ? 'accent' : 'ink'
          ));
        }
      }
    }
    return out;
  },

  lowPoly(r, tile) {
    // A coarse facet field in only two inks, so the planes read flat.
    // Two columns across a tile is one large plane, not a facet field.
    const cols = r.pick([3, 4, 5]);
    const grid = vertexGrid(r, tile, cols, cols, r.range(0.15, 0.3));
    const out = [];

    for (let j = 0; j < cols; j++) {
      for (let i = 0; i < cols; i++) {
        const a = grid[j][i];
        const b = grid[j][i + 1];
        const c = grid[j + 1][i + 1];
        const d = grid[j + 1][i];
        out.push(poly([a, b, d], (i + j) % 2 ? 'ink' : 'accent'));
        out.push(poly([b, c, d], (i + j) % 2 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  facetedDiamonds(r, tile) {
    // Outlined diamonds with a bright facet in one corner, as cut stones.
    const cols = r.pick([3, 4, 5]);
    const rows = r.pick([3, 4, 5]);
    const cw = tile / cols;
    const ch = tile / rows;
    const out = [];

    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? cw / 2 : 0;
      for (let i = 0; i <= cols; i++) {
        const cx = i * cw + offset;
        const cy = (j + 0.5) * ch;
        const w = cw * r.range(0.3, 0.44);
        const h = ch * r.range(0.3, 0.46);
        const top = [cx, cy - h];
        const right = [cx + w, cy];
        const bottom = [cx, cy + h];
        const left = [cx - w, cy];
        out.push(poly([top, right, bottom, left], (i + j) % 2 ? 'ink' : 'accent'));
        out.push(poly([top, right, [cx, cy]], 'accent2'));
      }
    }
    return out;
  },

  quartzBands(r, tile) {
    // Bands of alternating facet angles, which reads as banded stone.
    const bands = r.pick([4, 6, 8]);
    const bandStep = tile / bands;
    const per = r.pick([4, 6, 8]);
    const step = tile / per;
    const out = [];

    for (let b = 0; b < bands; b++) {
      const y = b * bandStep;
      const lean = b % 2 ? 1 : -1;
      for (let i = 0; i < per; i++) {
        const x = i * step;
        out.push(poly(
          [
            [x, y],
            [x + step, y],
            [x + step + lean * step * 0.4, y + bandStep],
            [x + lean * step * 0.4, y + bandStep]
          ],
          (i + b) % 2 ? 'ink' : 'accent'
        ));
      }
    }
    return out;
  },

  iceSplinters(r, tile) {
    // Fine pale splinters over a darker ground, very thin and angular.
    const cells = r.pick([4, 5, 6, 7]);
    const step = tile / cells;
    const out = [];

    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const cx = (i + 0.5 + r.range(-0.35, 0.35)) * step;
        const cy = (j + 0.5 + r.range(-0.35, 0.35)) * step;
        const len = step * r.range(0.8, 1.6);
        const a = r() * TAU;
        // Below about a twentieth of a cell the needles disappear at any
        // size somebody would actually print at.
        const width = step * r.range(0.05, 0.13);
        out.push(poly(
          [
            [cx + Math.cos(a) * len, cy + Math.sin(a) * len],
            [cx - Math.cos(a) * len, cy - Math.sin(a) * len],
            [cx - Math.sin(a) * width, cy + Math.cos(a) * width]
          ],
          (i + j) % 3 === 0 ? 'accent' : 'ink'
        ));
      }
    }
    return out;
  },

  geode(r, tile) {
    /*
     * Concentric rings of facets around a few centres, as a cut geode.
     * Centres sit on an exact division of the tile so the rings wrap.
     */
    const n = r.pick([1, 2]);
    const step = tile / n;
    const rings = r.pick([3, 4, 5]);
    const facets = r.pick([8, 10, 12]);
    const out = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = (i + 0.5) * step;
        const cy = (j + 0.5) * step;
        for (let k = rings; k >= 1; k--) {
          const outer = (step / 2) * (k / rings) * 0.95;
          const inner = (step / 2) * ((k - 1) / rings) * 0.95;
          for (let f = 0; f < facets; f++) {
            const a0 = (f / facets) * TAU;
            const a1 = ((f + 1) / facets) * TAU;
            out.push(poly(
              [
                [cx + Math.cos(a0) * outer, cy + Math.sin(a0) * outer],
                [cx + Math.cos(a1) * outer, cy + Math.sin(a1) * outer],
                [cx + Math.cos(a1) * inner, cy + Math.sin(a1) * inner],
                [cx + Math.cos(a0) * inner, cy + Math.sin(a0) * inner]
              ],
              (k + f) % 2 ? 'ink' : 'accent'
            ));
          }
        }
        out.push(dot(cx, cy, step * 0.05, 'accent2'));
      }
    }
    return out;
  }
};

/* ------------------------------------------------------------------ *
 * Metadata
 * ------------------------------------------------------------------ */

const NAMES = {
  facetField: ['Facet Field', 'Broken Plane', 'Shattered Ground'],
  gemRows: ['Cut Gem', 'Brilliant', 'Solitaire'],
  prisms: ['Prism', 'Three Plane', 'Column Light'],
  shards: ['Shard', 'Splinter', 'Glass Fall'],
  diamondFacets: ['Faceted Diamond', 'Quartered Stone', 'Cut Lattice'],
  crystalCluster: ['Crystal Cluster', 'Growth', 'Standing Stone'],
  lowPoly: ['Low Poly', 'Flat Facet', 'Two Plane'],
  facetedDiamonds: ['Bright Cut', 'Catch Light', 'Set Stone'],
  quartzBands: ['Quartz Band', 'Banded Stone', 'Strata Facet'],
  iceSplinters: ['Ice Splinter', 'Frost Needle', 'Rime'],
  geode: ['Geode', 'Cut Section', 'Agate Ring']
};

const SUFFIX = ['Two', 'Fine', 'Bold', 'Close', 'Wide'];

export const COLLECTION = 'crystal-and-facet';
export const PREFIX = 'cry';
export const TARGET = 22;
export const TILES = [280, 320, 360];
export const COVERAGE = { minInk: 0.06 };
export { RECIPES };

export function metaFor(key, seen) {
  const names = NAMES[key];
  if (!names) throw new Error('crystal-and-facet: no names for recipe ' + key);
  const base = names[seen % names.length];
  return {
    name: seen < names.length ? base : base + ' ' + SUFFIX[seen % SUFFIX.length],
    tags: tagsFor(key)
  };
}

function tagsFor(key) {
  const map = {
    facetField: ['facets', 'triangles', 'field'],
    gemRows: ['gems', 'facets', 'rows'],
    prisms: ['prisms', 'bands', 'uprights'],
    shards: ['shards', 'scattered', 'angular'],
    diamondFacets: ['diamonds', 'facets', 'lattice'],
    crystalCluster: ['crystals', 'standing', 'rows'],
    lowPoly: ['facets', 'triangles', 'flat'],
    facetedDiamonds: ['diamonds', 'gems', 'rows'],
    quartzBands: ['bands', 'facets', 'stone'],
    iceSplinters: ['splinters', 'fine', 'scattered'],
    geode: ['rings', 'radial', 'stone']
  };
  return map[key] || ['crystal'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, COVERAGE, metaFor };
