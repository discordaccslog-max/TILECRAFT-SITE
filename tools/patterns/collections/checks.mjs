/*
 * Checks & Weaves
 *
 * Checks built the way cloth is: two sets of bands crossing, with the
 * crossings darker where both colours lie over each other. Gingham,
 * windowpane, graph and basket structures are all generic weaving
 * constructions, drawn here from first principles.
 *
 * Nothing in this collection reproduces or imitates any company's
 * signature check or plaid, or any existing designer's pattern. The
 * constructions are the ordinary ones any weaver would recognise, and the
 * colourways come from the house palette rather than from anybody's
 * trademark.
 */

import { wrap } from '../lib.mjs';

const rect = (x, y, w, h, fill) => ({ t: 'rect', x, y, w, h, fill });
const bandV = (x, w, fill, tile) => rect(x, -1, w, tile + 2, fill);
const bandH = (y, h, fill, tile) => rect(-1, y, tile + 2, h, fill);

const RECIPES = {
  gingham(r, tile) {
    /*
     * The classic: one colour in both directions over a pale ground, so
     * the crossings come out twice as strong. Drawn as bands rather than
     * as squares, which is what makes the crossings fall out naturally.
     */
    const count = r.pick([4, 6, 8, 10]);
    const step = tile / count;
    const width = step * r.range(0.45, 0.55);
    const out = [];

    for (let i = 0; i < count; i++) out.push(bandV(i * step, width, 'accent', tile));
    for (let j = 0; j < count; j++) out.push(bandH(j * step, width, 'accent', tile));

    // The crossings, where both bands lie over each other.
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        out.push(rect(i * step, j * step, width, width, 'ink'));
      }
    }
    return out;
  },

  windowpane(r, tile) {
    // Wide open squares drawn by fine rules, both ways.
    const count = r.pick([2, 3, 4]);
    const step = tile / count;
    const weight = step * r.range(0.025, 0.06);
    const paired = r.chance(0.5);
    const out = [];

    for (let i = 0; i < count; i++) {
      out.push(bandV(i * step, weight, 'ink', tile));
      out.push(bandH(i * step, weight, 'ink', tile));
      if (paired) {
        out.push(bandV(i * step + weight * 3, weight * 0.7, 'accent', tile));
        out.push(bandH(i * step + weight * 3, weight * 0.7, 'accent', tile));
      }
    }
    return out;
  },

  graphCheck(r, tile) {
    // A fine graph with a heavier rule every few squares.
    const fine = r.pick([12, 16, 20, 24]);
    const step = tile / fine;
    const every = r.pick([2, 4]);
    const hair = step * r.range(0.06, 0.14);
    const heavy = hair * r.range(2.2, 3.6);
    const out = [];

    for (let i = 0; i < fine; i++) {
      const major = i % every === 0;
      out.push(bandV(i * step, major ? heavy : hair, major ? 'ink' : 'accent2', tile));
      out.push(bandH(i * step, major ? heavy : hair, major ? 'ink' : 'accent2', tile));
    }
    return out;
  },

  basketCheck(r, tile) {
    /*
     * Pairs of threads passing over and under in blocks, which is the
     * basket weave. The block count is even so the over-under alternation
     * closes across the tile.
     */
    const blocks = r.pick([4, 6, 8]);
    const step = tile / blocks;
    const gap = step * r.range(0.04, 0.14);
    const out = [];

    for (let i = 0; i < blocks; i++) {
      for (let j = 0; j < blocks; j++) {
        const over = (i + j) % 2 === 0;
        out.push(rect(i * step + gap / 2, j * step + gap / 2, step - gap, step - gap, over ? 'ink' : 'accent'));
        // A pair of grooves across the block, the way two threads read.
        const grooves = 2;
        for (let k = 1; k < grooves + 1; k++) {
          const at = (step - gap) * (k / (grooves + 1));
          out.push(
            over
              ? rect(i * step + gap / 2, j * step + gap / 2 + at, step - gap, gap * 0.35, 'bg')
              : rect(i * step + gap / 2 + at, j * step + gap / 2, gap * 0.35, step - gap, 'bg')
          );
        }
      }
    }
    return out;
  },

  tattersall(r, tile) {
    // Two colours of fine rule on an open ground, at different spacings.
    const a = r.pick([4, 6, 8]);
    const b = a * r.pick([1, 2]);
    const stepA = tile / a;
    const stepB = tile / b;
    const weight = Math.min(stepA, stepB) * r.range(0.04, 0.1);
    const out = [];

    for (let i = 0; i < a; i++) {
      out.push(bandV(i * stepA, weight, 'ink', tile));
      out.push(bandH(i * stepA, weight, 'ink', tile));
    }
    for (let i = 0; i < b; i++) {
      out.push(bandV(i * stepB + stepB / 2, weight * 0.8, 'accent', tile));
      out.push(bandH(i * stepB + stepB / 2, weight * 0.8, 'accent', tile));
    }
    return out;
  },

  shepherdCheck(r, tile) {
    /*
     * Solid blocks in a two-colour chequer, with the blocks themselves
     * made of fine diagonal threads so the check reads as woven cloth
     * rather than as a chessboard.
     */
    const count = r.pick([4, 6, 8]);
    const step = tile / count;
    const threads = r.pick([3, 4, 5]);
    const out = [];

    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        const dark = (i + j) % 2 === 0;
        out.push(rect(i * step, j * step, step, step, dark ? 'ink' : 'accent'));
        // Diagonal threads inside the block, leaning with the twill.
        for (let k = 0; k < threads; k++) {
          const t = (k + 0.5) / threads;
          out.push({
            t: 'line',
            pts: [
              [i * step, j * step + t * step],
              [i * step + step, j * step + (t - 1) * step]
            ],
            w: step * 0.06,
            stroke: dark ? 'accent' : 'ink',
            cap: 'butt'
          });
        }
      }
    }
    return out;
  },

  madrasBands(r, tile) {
    /*
     * Uneven coloured bands crossing, the madras idea: a fixed sequence of
     * widths and colours repeated a whole number of times each way.
     */
    const repeats = r.pick([2, 3]);
    const unit = tile / repeats;
    const parts = r.pick([3, 4]);

    /*
     * Each part of the sequence is either a coloured band or a gap. Giving
     * every part a band fills the ground completely, and two full grounds
     * crossing come out as mud rather than as cloth, so roughly a third of
     * the sequence is left open.
     */
    const slots = ['ink', 'accent', 'accent2'];

    /*
     * Warp and weft get their own sequence, as they do on a loom, and each
     * sequence keeps at least one open part. Both of those matter: two
     * identical full-coverage grounds crossing come out as mud, and in a
     * palette whose three inks are close in tone there is nothing left to
     * tell the bands apart.
     */
    const sequence = () => {
      const parts2 = [];
      for (let i = 0; i < parts; i++) {
        parts2.push({ width: r.range(0.5, 1), slot: r.chance(0.55) ? slots[i % slots.length] : null });
      }
      if (parts2.every((part) => part.slot)) parts2[r.int(0, parts - 1)].slot = null;
      if (parts2.every((part) => !part.slot)) parts2[r.int(0, parts - 1)].slot = 'ink';
      return parts2;
    };

    const out = [];
    const run = (vertical, parts2) => {
      const total = parts2.reduce((a, b) => a + b.width, 0);
      for (let k = 0; k < repeats; k++) {
        let at = k * unit;
        for (const part of parts2) {
          const thickness = (part.width / total) * unit;
          if (part.slot) {
            const inset = thickness * 0.16;
            out.push(
              vertical
                ? bandV(at + inset, thickness - inset * 2, part.slot, tile)
                : bandH(at + inset, thickness - inset * 2, part.slot, tile)
            );
          }
          at += thickness;
        }
      }
    };

    run(true, sequence());
    run(false, sequence());
    return out;
  },

  houndsCheck(r, tile) {
    /*
     * A broken check: each cell of a two-colour chequer has a tooth
     * stepping into its neighbour, which is the structure a pointed twill
     * produces. Built from the grid outward rather than copied from any
     * particular cloth.
     */
    const count = r.pick([4, 6, 8]);
    const step = tile / count;
    const tooth = step * r.range(0.3, 0.5);
    const out = [];

    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        const dark = (i + j) % 2 === 0;
        const slot = dark ? 'ink' : 'accent';
        out.push(rect(i * step, j * step, step, step, slot));
        // The tooth steps out of one corner into the cell beyond.
        out.push(rect(i * step + step, j * step, tooth, tooth, slot));
        out.push(rect(i * step - tooth, j * step + step - tooth, tooth, tooth, slot));
      }
    }
    return out;
  },

  pinCheck(r, tile) {
    // A small solid square at every crossing of an open grid.
    const count = r.pick([6, 8, 10, 12]);
    const step = tile / count;
    const size = step * r.range(0.18, 0.4);
    const rules = r.chance(0.55);
    const weight = step * r.range(0.03, 0.07);
    const out = [];

    if (rules) {
      for (let i = 0; i < count; i++) {
        out.push(bandV(i * step, weight, 'accent2', tile));
        out.push(bandH(i * step, weight, 'accent2', tile));
      }
    }
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        out.push(rect(i * step - size / 2, j * step - size / 2, size, size, (i + j) % 2 ? 'accent' : 'ink'));
      }
    }
    return out;
  },

  doubleCheck(r, tile) {
    // A coarse check with a finer one laid over it at half the spacing.
    const coarse = r.pick([2, 3, 4]);
    const stepC = tile / coarse;
    const fine = coarse * 4;
    const stepF = tile / fine;
    const out = [];

    for (let i = 0; i < coarse; i++) {
      out.push(bandV(i * stepC, stepC * 0.5, 'accent2', tile));
      out.push(bandH(i * stepC, stepC * 0.5, 'accent2', tile));
    }
    for (let i = 0; i < fine; i++) {
      out.push(bandV(i * stepF, stepF * r.range(0.1, 0.2), 'ink', tile));
      out.push(bandH(i * stepF, stepF * r.range(0.1, 0.2), 'ink', tile));
    }
    return out;
  },

  twillCheck(r, tile) {
    // Blocks of parallel threads, each block turned ninety degrees from
    // the last, which reads as a woven check at a distance.
    const count = r.pick([4, 6, 8]);
    const step = tile / count;
    const threads = r.pick([3, 4, 6]);
    const weight = (step / threads) * r.range(0.4, 0.7);
    const out = [];

    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        const vertical = (i + j) % 2 === 0;
        const slot = vertical ? 'ink' : 'accent';
        for (let k = 0; k < threads; k++) {
          const at = (k + 0.5) * (step / threads);
          out.push(
            vertical
              ? rect(i * step + at - weight / 2, j * step, weight, step, slot)
              : rect(i * step, j * step + at - weight / 2, step, weight, slot)
          );
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
  gingham: ['Gingham', 'Picnic', 'Kitchen Check'],
  windowpane: ['Windowpane', 'Casement', 'Open Check'],
  graphCheck: ['Graph Check', 'Quadrille', 'Engineer'],
  basketCheck: ['Basket Weave', 'Hopsack', 'Panama'],
  tattersall: ['Tattersall', 'Stable Check', 'Two Rule'],
  shepherdCheck: ['Shepherd Check', 'Border Check', 'Drover'],
  madrasBands: ['Madras', 'Uneven Check', 'Market Cloth'],
  houndsCheck: ['Broken Check', 'Tooth Check', 'Pointed Twill'],
  pinCheck: ['Pin Check', 'Dot Check', 'Nailhead'],
  doubleCheck: ['Double Check', 'Overcheck', 'Layered Grid'],
  twillCheck: ['Twill Check', 'Turned Block', 'Quarter Turn']
};

const SUFFIX = ['Two', 'Fine', 'Bold', 'Wide', 'Close'];

export const COLLECTION = 'checks-and-weaves';
export const PREFIX = 'chk';
export const TARGET = 22;
export const TILES = [240, 280, 320];
export const COVERAGE = { minInk: 0.07 };
export { RECIPES };

export function metaFor(key, seen) {
  const names = NAMES[key];
  if (!names) throw new Error('checks-and-weaves: no names for recipe ' + key);
  const base = names[seen % names.length];
  return {
    name: seen < names.length ? base : base + ' ' + SUFFIX[seen % SUFFIX.length],
    tags: tagsFor(key)
  };
}

function tagsFor(key) {
  const map = {
    gingham: ['check', 'gingham', 'classic'],
    windowpane: ['check', 'open', 'lines'],
    graphCheck: ['grid', 'fine', 'lines'],
    basketCheck: ['weave', 'basket', 'blocks'],
    tattersall: ['check', 'fine', 'lines'],
    shepherdCheck: ['check', 'woven', 'blocks'],
    madrasBands: ['check', 'uneven', 'bands'],
    houndsCheck: ['check', 'broken', 'bold'],
    pinCheck: ['check', 'dots', 'fine'],
    doubleCheck: ['check', 'layered', 'grid'],
    twillCheck: ['weave', 'blocks', 'turned']
  };
  return map[key] || ['check'];
}

export default { COLLECTION, PREFIX, TARGET, TILES, RECIPES, COVERAGE, metaFor };
