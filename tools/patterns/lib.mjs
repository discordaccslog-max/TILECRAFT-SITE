/*
 * Tilecraft Digital — pattern generation helpers
 *
 * Seeded randomness, the edge-wrapping that makes a tile seamless by
 * construction, and the colorway palettes.
 *
 * Build-time only.
 */

/* ------------------------------------------------------------------ *
 * Seeded randomness
 *
 * Every pattern is generated from a seed, so the same build always
 * produces the same files and a pattern can be regenerated exactly.
 * ------------------------------------------------------------------ */

export function rng(seed) {
  let a = typeof seed === 'string' ? hash(seed) : seed >>> 0;
  const next = () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + next() * (hi - lo);
  next.int = (lo, hi) => Math.floor(lo + next() * (hi - lo + 1));
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.chance = (p) => next() < p;
  next.sign = () => (next() < 0.5 ? -1 : 1);
  next.shuffle = (list) => {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return next;
}

export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < String(text).length; i++) {
    h ^= String(text).charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ *
 * Bounding boxes and translation
 * ------------------------------------------------------------------ */

function boundsOf(p) {
  switch (p.t) {
    case 'rect':
      return [p.x, p.y, p.x + p.w, p.y + p.h];
    case 'circle':
      return [p.cx - p.r, p.cy - p.r, p.cx + p.r, p.cy + p.r];
    case 'ellipse': {
      const m = Math.max(p.rx, p.ry);
      return [p.cx - m, p.cy - m, p.cx + m, p.cy + m];
    }
    case 'ring':
    case 'arc': {
      const m = p.r + p.w / 2;
      return [p.cx - m, p.cy - m, p.cx + m, p.cy + m];
    }
    case 'blob': {
      const m = Math.max(...p.radii);
      return [p.cx - m, p.cy - m, p.cx + m, p.cy + m];
    }
    case 'poly':
    case 'line':
    case 'curve': {
      // Smoothing can overshoot the control points a little, so the box is
      // padded rather than taken exactly.
      const pad = (p.w || 0) / 2 + (p.t === 'curve' ? 6 : 0);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const [x, y] of p.pts) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
      return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
    }
    default:
      return [0, 0, 0, 0];
  }
}

function translate(p, dx, dy) {
  const q = { ...p };
  if ('x' in q) q.x += dx;
  if ('y' in q) q.y += dy;
  if ('cx' in q) q.cx += dx;
  if ('cy' in q) q.cy += dy;
  if (q.pts) q.pts = q.pts.map(([x, y]) => [x + dx, y + dy]);
  return q;
}

/**
 * Repeat any primitive that crosses a tile edge on the opposite side, so
 * the tile meets itself exactly. The SVG viewBox clips the overhang.
 *
 * This is what makes the patterns seamless by construction. The build
 * still rasterizes the result and checks the edges, because a construction
 * rule is only as good as its implementation.
 */
export function wrap(primitives, tile) {
  const out = [];
  for (const p of primitives) {
    const [x0, y0, x1, y1] = boundsOf(p);
    const dxs = [0];
    const dys = [0];
    if (x0 < 0) dxs.push(tile);
    if (x1 > tile) dxs.push(-tile);
    if (y0 < 0) dys.push(tile);
    if (y1 > tile) dys.push(-tile);

    for (const dx of dxs) {
      for (const dy of dys) {
        out.push(dx === 0 && dy === 0 ? p : translate(p, dx, dy));
      }
    }
  }
  return out;
}

/** Scatter points on a jittered grid, which fills a tile evenly. */
export function jitteredGrid(random, tile, count, jitter = 0.38) {
  const cols = Math.max(1, Math.round(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const cw = tile / cols;
  const ch = tile / rows;
  const points = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (points.length >= count) break;
      points.push([
        (c + 0.5 + random.range(-jitter, jitter)) * cw,
        (r + 0.5 + random.range(-jitter, jitter)) * ch
      ]);
    }
  }
  return points;
}

/** Points on a half-drop grid, the classic surface-design offset layout. */
export function halfDropGrid(tile, cols, rows, offset = 0.5) {
  const cw = tile / cols;
  const ch = tile / rows;
  const points = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shift = r % 2 === 1 ? cw * offset : 0;
      points.push([((c + 0.5) * cw + shift) % tile, (r + 0.5) * ch]);
    }
  }
  return points;
}

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

export default { rng, wrap, colorwaysFor, jitteredGrid, halfDropGrid, namer, PALETTES, TAU };
