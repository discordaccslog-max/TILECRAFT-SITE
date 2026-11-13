/*
 * Tilecraft Digital — pattern generation helpers
 *
 * Seeded randomness, the edge-wrapping that makes a tile seamless by
 * construction, and the colorway palettes.
 *
 * Build-time only.
 */

/*
 * Seeded randomness, edge wrapping, and the grid layouts live in
 * js/patterns/compose.mjs, because Pattern Generator Studio needs the same
 * code in the browser. They are re-exported here so the collection
 * generators can keep importing them from one place.
 */
export { rng, hash, wrap, jitteredGrid, halfDropGrid, TAU } from '../../js/patterns/compose.mjs';

/* ------------------------------------------------------------------ *
 * Colorways
 *
 * Every palette is checked for contrast between its background and its
 * main ink, so no colorway can come out muddy or unreadable.
 * ------------------------------------------------------------------ */

export const PALETTES = {
  // The house inks, matching the site.
  riso: { name: 'Riso', bg: '#f7f2e8', ink: '#14172a', accent: '#ef3c80', accent2: '#00b2ad' },
  risoNight: { name: 'Night Press', bg: '#141124', ink: '#f4efe3', accent: '#ff5c9b', accent2: '#2fe3d6' },

  // Warm and quiet.
  clay: { name: 'Clay', bg: '#f3e7dc', ink: '#4a3328', accent: '#c96f4a', accent2: '#8aa07c' },
  ochre: { name: 'Ochre', bg: '#faf3e0', ink: '#3d3426', accent: '#d99b32', accent2: '#7c8c5a' },
  terracotta: { name: 'Terracotta', bg: '#fbeee6', ink: '#5a2f24', accent: '#d2694a', accent2: '#2f6b63' },

  // Cool and quiet.
  slate: { name: 'Slate', bg: '#eef1f4', ink: '#232b36', accent: '#4a7ba7', accent2: '#8f9bab' },
  sage: { name: 'Sage', bg: '#eff3ec', ink: '#2b3a2f', accent: '#6f9173', accent2: '#b9a06b' },
  harbour: { name: 'Harbor', bg: '#e9eef2', ink: '#16303d', accent: '#2f7d8c', accent2: '#c2714f' },

  // Strong.
  monochrome: { name: 'Monochrome', bg: '#ffffff', ink: '#111111', accent: '#555555', accent2: '#999999' },
  inkBlue: { name: 'Ink Blue', bg: '#f4f6fb', ink: '#101b3d', accent: '#2e4a9e', accent2: '#c2504a' },
  midnight: { name: 'Midnight', bg: '#15192b', ink: '#e8e4f0', accent: '#f2a65a', accent2: '#5ac8c0' },

  // Soft.
  blush: { name: 'Blush', bg: '#fdf0ef', ink: '#4a2b33', accent: '#d98a93', accent2: '#8a9bb5' },
  mint: { name: 'Mint', bg: '#eef7f2', ink: '#1f3a33', accent: '#52a98a', accent2: '#e0a24b' },
  plum: { name: 'Plum', bg: '#f4eef6', ink: '#331f3d', accent: '#8a5c9e', accent2: '#c9a24b' }
};

const FAMILIES = {
  'geometric-essentials': ['riso', 'monochrome', 'inkBlue', 'slate', 'ochre', 'risoNight', 'harbour', 'midnight'],
  'textures-and-grain': ['clay', 'slate', 'monochrome', 'ochre', 'sage', 'midnight', 'blush', 'harbour'],
  'botanical-linework': ['sage', 'clay', 'mint', 'blush', 'ochre', 'slate', 'plum', 'risoNight'],
  'mid-century-shapes': ['ochre', 'terracotta', 'riso', 'midnight', 'clay', 'harbour', 'plum', 'inkBlue'],
  'tile-and-terrazzo': ['terracotta', 'harbour', 'riso', 'monochrome', 'slate', 'clay', 'midnight', 'mint']
};

/**
 * Four colorways for one pattern, chosen from its collection's family so
 * the collection hangs together while individual patterns still differ.
 */
export function colorwaysFor(collection, random, count = 4) {
  const keys = FAMILIES[collection] || Object.keys(PALETTES);
  const chosen = random.shuffle(keys).slice(0, count);
  return chosen.map((key) => {
    const p = PALETTES[key];
    return {
      name: p.name,
      colors: { bg: p.bg, ink: p.ink, accent: p.accent, accent2: p.accent2 }
    };
  });
}

/* ------------------------------------------------------------------ *
 * Naming
 * ------------------------------------------------------------------ */

/** Build a readable, non-repeating name from two word lists. */
export function namer(firstWords, secondWords) {
  const used = new Set();
  return (random) => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const name = random.pick(firstWords) + ' ' + random.pick(secondWords);
      if (!used.has(name)) {
        used.add(name);
        return name;
      }
    }
    let n = 2;
    let name;
    do {
      name = random.pick(firstWords) + ' ' + random.pick(secondWords) + ' ' + n++;
    } while (used.has(name));
    used.add(name);
    return name;
  };
}

export default { colorwaysFor, namer, PALETTES };
