/*
 * Stripes & Rules
 *
 * Bands, rules, pinstripes, ticking and dashes. The simplest family in the
 * shop and the one that has to be most exact: a stripe that does not land
 * on the tile edge shows a seam immediately, so every band count here
 * divides the tile and every alternation has a period that divides the
 * count.
 *
 * Ordinary striping, drawn from first principles. Nothing here reproduces
 * or imitates any existing designer's pattern or any company's mark.
 */

import { wrap } from '../lib.mjs';

const band = (pos, thickness, slot, vertical, tile) =>
  vertical
    ? { t: 'rect', x: pos, y: -1, w: thickness, h: tile + 2, fill: slot }
    : { t: 'rect', x: -1, y: pos, w: tile + 2, h: thickness, fill: slot };

const dash = (x, y, w, h, slot) => ({ t: 'rect', x, y, w, h, fill: slot });

const RECIPES = {
  evenStripes(r, tile) {
    // The plain case: equal bands, two or three colours in rotation.
    const count = r.pick([4, 6, 8, 12, 16]);
    const step = tile / count;
    const vertical = r.chance(0.5);
    const slots = r.chance(0.35) ? ['ink', 'accent', 'accent2'] : ['ink', 'bg'];
    // The colour cycle has to divide the band count, or the last band meets
    // the first in the wrong colour.
    const cycle = count % slots.length === 0 ? slots.length : 2;
    const out = [];

    for (let i = 0; i < count; i++) {
      out.push(band(i * step, step, slots[i % cycle], vertical, tile));
    }
    return out;
  },

  pinstripe(r, tile) {
    // Fine rules on an open ground, the shirting idiom.
    const count = r.pick([8, 12, 16, 24]);
    const step = tile / count;
    const weight = step * r.range(0.04, 0.14);
    const vertical = r.chance(0.6);
    const paired = r.chance(0.45);
    const out = [];

    for (let i = 0; i < count; i++) {
      out.push(band(i * step, weight, 'ink', vertical, tile));
      if (paired) out.push(band(i * step + weight * 3, weight, 'accent', vertical, tile));
    }
    return out;
  },

  unevenBands(r, tile) {
    /*
     * Bands of three different widths in a fixed sequence. The sequence is
     * laid end to end a whole number of times across the tile, which is
     * what lets an uneven rhythm still repeat exactly.
     */
    const repeats = r.pick([2, 3, 4]);
    const unit = tile / repeats;
    const widths = [r.range(0.32, 0.5), r.range(0.14, 0.26), r.range(0.08, 0.16)];
    const total = widths.reduce((a, b) => a + b, 0);
    const slots = ['ink', 'accent', 'accent2'];
    const vertical = r.chance(0.5);
    const out = [];

    for (let k = 0; k < repeats; k++) {
      let at = k * unit;
      widths.forEach((w, i) => {
        const thickness = (w / total) * unit;
        out.push(band(at, thickness, slots[i], vertical, tile));
        at += thickness;
      });
    }
    return out;
  },

  ticking(r, tile) {
    // A heavy rule with a hairline either side, the mattress-ticking rhythm.
    const count = r.pick([4, 6, 8]);
    const step = tile / count;
    const heavy = step * r.range(0.14, 0.26);
    const hair = step * r.range(0.02, 0.05);
    const gap = step * r.range(0.06, 0.12);
    const vertical = r.chance(0.5);
    const out = [];

    for (let i = 0; i < count; i++) {
      const at = i * step;
      out.push(band(at, heavy, 'ink', vertical, tile));
      out.push(band(at + heavy + gap, hair, 'accent', vertical, tile));
      out.push(band(at - gap - hair, hair, 'accent', vertical, tile));
    }
    return out;
  },

  dashedRules(r, tile) {
    // Broken rules: each band is a run of dashes, offset row to row.
    const rows = r.pick([6, 8, 10, 12]);
    const rowStep = tile / rows;
    const perRow = r.pick([4, 6, 8]);
    const cell = tile / perRow;
    const weight = rowStep * r.range(0.14, 0.32);
    const fill = r.range(0.5, 0.78);
    const vertical = r.chance(0.35);
    const out = [];

    for (let row = 0; row < rows; row++) {
      const offset = row % 2 ? cell / 2 : 0;
      const slot = row % 2 ? 'accent' : 'ink';
      for (let i = 0; i <= perRow; i++) {
        const along = i * cell + offset;
        const across = row * rowStep;
        out.push(
          vertical
            ? dash(across, along, weight, cell * fill, slot)
            : dash(along, across, cell * fill, weight, slot)
        );
      }
    }
    return out;
  },

  crossRules(r, tile) {
    // Rules both ways at different weights, which reads as a ledger.
    const across = r.pick([4, 6, 8, 12]);
    const down = r.pick([4, 6, 8, 12]);
    const stepX = tile / across;
    const stepY = tile / down;
    const heavy = Math.min(stepX, stepY) * r.range(0.08, 0.16);
    const light = heavy * r.range(0.25, 0.5);
    const out = [];

    for (let i = 0; i < across; i++) {
      out.push(band(i * stepX, i % 2 ? light : heavy, 'ink', true, tile));
    }
    for (let j = 0; j < down; j++) {
      out.push(band(j * stepY, j % 2 ? light : heavy, 'accent', false, tile));
    }
    return out;
  },

  barcode(r, tile) {
    /*
     * Rules at varying widths in a pattern that is random-looking but
     * exactly repeating: widths are drawn once into a sequence of fixed
     * length, then that sequence tiles across.
     */
    const slotsCount = r.pick([12, 16, 24, 32]);
    const step = tile / slotsCount;
    const vertical = r.chance(0.6);
    const out = [];

    for (let i = 0; i < slotsCount; i++) {
      const width = step * r.range(0.2, 0.95);
      const slot = r.chance(0.22) ? 'accent' : 'ink';
      out.push(band(i * step, width, slot, vertical, tile));
    }
    return out;
  },

  gradientBands(r, tile) {
    // Bands that thicken across the tile and thin back, so the run closes.
    const count = r.pick([8, 12, 16]);
    const step = tile / count;
    const vertical = r.chance(0.5);
    const low = r.range(0.08, 0.2);
    const high = r.range(0.5, 0.9);
    const out = [];

    for (let i = 0; i < count; i++) {
      // A triangle wave over the band index: out to the middle and back.
      const t = i <= count / 2 ? i / (count / 2) : (count - i) / (count / 2);
      const thickness = step * (low + (high - low) * t);
      out.push(band(i * step, thickness, i % 2 ? 'accent' : 'ink', vertical, tile));
    }
    return out;
  },

  shadowStripe(r, tile) {
    // A band with a narrower one tucked against it, which reads as depth.
    const count = r.pick([4, 6, 8]);
    const step = tile / count;
    const main = step * r.range(0.3, 0.5);
    const shadowWidth = main * r.range(0.25, 0.5);
    const vertical = r.chance(0.5);
    const out = [];

    for (let i = 0; i < count; i++) {
      const at = i * step;
      out.push(band(at, main, 'ink', vertical, tile));
      out.push(band(at + main, shadowWidth, 'accent2', vertical, tile));
    }
    return out;
  },

  wovenRules(r, tile) {
    /*
     * Rules both ways that pass over and under one another. The crossings
     * alternate, so the count has to be even for the weave to close.
     */
    const count = r.pick([4, 6, 8]);
    const step = tile / count;
    const weight = step * r.range(0.3, 0.5);
    const out = [];

    // Verticals first, then the horizontals that pass over them, then the
    // short pieces of vertical that pass back over at alternate crossings.
    for (let i = 0; i < count; i++) out.push(band(i * step, weight, 'ink', true, tile));
    for (let j = 0; j < count; j++) out.push(band(j * step, weight, 'accent', false, tile));

    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        if ((i + j) % 2 !== 0) continue;
        out.push(dash(i * step, j * step, weight, weight, 'ink'));
      }
    }
    return out;
  },

  chalkStripe(r, tile) {
    // A soft wide band with a fine broken rule down the middle of it.
    const count = r.pick([3, 4, 6]);
    const step = tile / count;
    const wide = step * r.range(0.45, 0.72);
    const hair = step * r.range(0.025, 0.055);
    const dashes = r.pick([6, 8, 12]);
    const cell = tile / dashes;
    const vertical = r.chance(0.5);
    const out = [];

    for (let i = 0; i < count; i++) {
      const at = i * step;
      out.push(band(at, wide, 'ink', vertical, tile));
      for (let k = 0; k < dashes; k++) {
        const along = k * cell;
        out.push(
          vertical
            ? dash(at + wide / 2 - hair / 2, along, hair, cell * 0.55, 'accent')
            : dash(along, at + wide / 2 - hair / 2, cell * 0.55, hair, 'accent')
        );
      }
    }
    return out;
  }
};

/* ------------------------------------------------------------------ *
 * Metadata
 * ------------------------------------------------------------------ */

const NAMES = {
  evenStripes: ['Even Stripe', 'Awning', 'Deckchair'],
  pinstripe: ['Pinstripe', 'Shirting', 'Hairline'],
  unevenBands: ['Uneven Band', 'Cadence', 'Offbeat'],
  ticking: ['Ticking', 'Mattress', 'Bolster'],
  dashedRules: ['Dashed Rule', 'Morse', 'Stitch Row'],
  crossRules: ['Cross Rule', 'Ledger', 'Graph Band'],
  barcode: ['Barcode', 'Reed', 'Palisade'],
  gradientBands: ['Graduated', 'Swell', 'Taper'],
  shadowStripe: ['Shadow Stripe', 'Relief', 'Ledge'],
  wovenRules: ['Woven Rule', 'Plaid Weave', 'Over Under'],
  chalkStripe: ['Chalk Stripe', 'Centre Rule', 'Spine']
};

const SUFFIX = ['Two', 'Wide', 'Fine', 'Close', 'Bold'];

export const COLLECTION = 'stripes-and-rules';
export const PREFIX = 'stp';
export const TARGET = 22;
export const TILES = [240, 280, 320];
export const COVERAGE = { minInk: 0.02 };
export { RECIPES };

export function metaFor(key, seen) {
  const names = NAMES[key];
  if (!names) throw new Error('stripes-and-rules: no names for recipe ' + key);
  const base = names[seen % names.length];
  return {
    name: seen < names.length ? base : base + ' ' + SUFFIX[seen % SUFFIX.length],
    tags: tagsFor(key)
  };
}

function tagsFor(key) {
  const map = {
    evenStripes: ['stripes', 'even', 'bold'],
    pinstripe: ['stripes', 'fine', 'lines'],
    unevenBands: ['stripes', 'uneven', 'bands'],
    ticking: ['stripes', 'ticking', 'fine'],
    dashedRules: ['dashes', 'broken', 'rows'],
    crossRules: ['grid', 'rules', 'lines'],
    barcode: ['stripes', 'uneven', 'fine'],
    gradientBands: ['stripes', 'graduated', 'bands'],
    shadowStripe: ['stripes', 'shadow', 'bands'],
    wovenRules: ['weave', 'grid', 'bold'],
    chalkStripe: ['stripes', 'chalk', 'wide']
  };
  return map[key] || ['stripes'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, COVERAGE, metaFor };
