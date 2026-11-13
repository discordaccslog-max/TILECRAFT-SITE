/*
 * Textures & Grain
 *
 * Paper grain, linen, stipple, noise, and brushed finishes.
 *
 * These are the one collection generated as pixels rather than as shapes:
 * grain has no outline to describe. Each recipe returns a square buffer of
 * values from 0 to 1, where 0 is bare background and 1 is full ink, and
 * every one of them wraps — the lattice noise is built on a wrapped
 * lattice, the wave families use whole numbers of cycles across the tile,
 * and scattered marks are repeated across the edges.
 *
 * All of it is ordinary signal work: lattice noise, sine families, and
 * jittered scatter. Nothing is sampled, scanned, or traced from anywhere.
 */

/* ------------------------------------------------------------------ *
 * Tileable noise
 * ------------------------------------------------------------------ */

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/** A lattice of random values that wraps at `period` in both directions. */
function lattice(random, period) {
  const values = new Float32Array(period * period);
  for (let i = 0; i < values.length; i++) values[i] = random();
  return values;
}

/**
 * A lattice with a different period on each axis. Stretching noise along
 * one axis is what gives a brushed or dragged finish its direction, and
 * doing it with two integer periods keeps the result tileable — scaling
 * the sample coordinate instead would not.
 */
function latticeXY(random, px, py) {
  const values = new Float32Array(px * py);
  for (let i = 0; i < values.length; i++) values[i] = random();
  return values;
}

function valueNoiseXY(values, px, py, x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const at = (ix, iy) => values[(((iy % py) + py) % py) * px + (((ix % px) + px) % px)];
  const a = at(xi, yi);
  const b = at(xi + 1, yi);
  const c = at(xi, yi + 1);
  const d = at(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Value noise sampled at (x, y), wrapping every `period` lattice cells. */
function valueNoise(values, period, x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = fade(xf);
  const v = fade(yf);

  const at = (ix, iy) => values[(((iy % period) + period) % period) * period + (((ix % period) + period) % period)];

  const a = at(xi, yi);
  const b = at(xi + 1, yi);
  const c = at(xi, yi + 1);
  const d = at(xi + 1, yi + 1);

  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/**
 * Fractal noise: several octaves of wrapped value noise added together.
 * The base period doubles each octave so every octave still wraps.
 */
function fbm(random, size, basePeriod, octaves, persistence = 0.5) {
  const layers = [];
  let period = basePeriod;
  let amplitude = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    layers.push({ values: lattice(random, period), period, amplitude });
    total += amplitude;
    period *= 2;
    amplitude *= persistence;
  }

  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (const layer of layers) {
        const scale = layer.period / size;
        sum += valueNoise(layer.values, layer.period, x * scale, y * scale) * layer.amplitude;
      }
      out[y * size + x] = sum / total;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function mapRange(buffer, lo, hi) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of buffer) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  const out = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    out[i] = lo + ((buffer[i] - min) / span) * (hi - lo);
  }
  return out;
}

function contrast(buffer, amount) {
  const out = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    out[i] = clamp01((buffer[i] - 0.5) * amount + 0.5);
  }
  return out;
}

/** Stamp a soft round mark, wrapping at the edges. */
function stamp(buffer, size, cx, cy, radius, strength, softness = 0.6) {
  const r = Math.ceil(radius);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dy);
      if (d > radius) continue;
      const falloff = softness >= 1 ? 1 : clamp01(1 - Math.pow(d / radius, 1 / Math.max(0.05, 1 - softness)));
      const x = (((cx + dx) % size) + size) % size;
      const y = (((cy + dy) % size) + size) % size;
      const i = y * size + x;
      buffer[i] = clamp01(buffer[i] + strength * falloff);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Recipes
 * ------------------------------------------------------------------ */

const RECIPES = {
  paperGrain(r, size) {
    const base = fbm(r, size, r.pick([32, 48, 64]), 4, 0.55);
    return contrast(mapRange(base, 0.06, 0.52), r.range(1.1, 1.5));
  },

  coarseGrain(r, size) {
    const base = fbm(r, size, r.pick([12, 16, 24]), 3, 0.6);
    return contrast(mapRange(base, 0.04, 0.72), r.range(1.3, 1.8));
  },

  fineNoise(r, size) {
    const out = new Float32Array(size * size);
    const amount = r.range(0.3, 0.55);
    for (let i = 0; i < out.length; i++) out[i] = r() * amount;
    return out;
  },

  grittyNoise(r, size) {
    const grain = fbm(r, size, 64, 2, 0.5);
    const out = new Float32Array(size * size);
    const amount = r.range(0.4, 0.7);
    for (let i = 0; i < out.length; i++) {
      out[i] = clamp01(grain[i] * 0.5 + r() * amount * (0.4 + grain[i]));
    }
    return out;
  },

  linen(r, size) {
    const warp = r.pick([48, 64, 96]);
    const weft = warp;
    const grain = fbm(r, size, 32, 3, 0.5);
    const out = new Float32Array(size * size);
    const depth = r.range(0.2, 0.34);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = Math.sin((x / size) * Math.PI * 2 * warp) * 0.5 + 0.5;
        const v = Math.sin((y / size) * Math.PI * 2 * weft) * 0.5 + 0.5;
        // A plain weave: warp shows on one diagonal, weft on the other.
        const weave = ((x + y) % 2 === 0 ? u : v) * depth;
        out[y * size + x] = clamp01(weave + grain[y * size + x] * 0.3 + 0.04);
      }
    }
    return out;
  },

  canvasWeave(r, size) {
    const threads = r.pick([24, 32, 40]);
    const grain = fbm(r, size, 48, 3, 0.5);
    const out = new Float32Array(size * size);
    const period = size / threads;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cx = Math.floor(x / period);
        const cy = Math.floor(y / period);
        const over = (cx + cy) % 2 === 0;
        const along = over ? (x % period) / period : (y % period) / period;
        const round = Math.sin(along * Math.PI);
        out[y * size + x] = clamp01(round * r.range(0.3, 0.42) + grain[y * size + x] * 0.26);
      }
    }
    return out;
  },

  stipple(r, size) {
    const out = new Float32Array(size * size);
    const count = Math.round(size * size * r.range(0.006, 0.013));
    for (let i = 0; i < count; i++) {
      stamp(out, size, Math.floor(r() * size), Math.floor(r() * size), r.range(1.1, 2.8), r.range(0.5, 1), 0.45);
    }
    return out;
  },

  speckle(r, size) {
    const out = new Float32Array(size * size);
    const count = Math.round(size * size * r.range(0.0022, 0.006));
    for (let i = 0; i < count; i++) {
      // A mix of sizes, mostly small, is what separates grit from polka dots.
      const big = r.chance(0.12);
      stamp(out, size, Math.floor(r() * size), Math.floor(r() * size),
        big ? r.range(3, 5.5) : r.range(1.2, 2.6), r.range(0.5, 1), 0.5);
    }
    const haze = fbm(r, size, 24, 3, 0.5);
    for (let i = 0; i < out.length; i++) out[i] = clamp01(out[i] + haze[i] * 0.12);
    return out;
  },

  brushed(r, size) {
    // Noise with a long period across the grain and a short one along it.
    const px = r.pick([6, 8, 12]);
    const py = r.pick([64, 96, 128]);
    const values = latticeXY(r, px, py);
    const fine = latticeXY(r, px * 2, py * 2);
    const grain = fbm(r, size, 32, 2, 0.5);
    const out = new Float32Array(size * size);
    const strength = r.range(0.4, 0.62);
    const vertical = r.chance(0.5);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const a = vertical ? x : y;
        const b = vertical ? y : x;
        const n =
          valueNoiseXY(values, px, py, (a / size) * px, (b / size) * py) * 0.7 +
          valueNoiseXY(fine, px * 2, py * 2, (a / size) * px * 2, (b / size) * py * 2) * 0.3;
        out[y * size + x] = clamp01(n * strength + grain[y * size + x] * 0.16);
      }
    }
    return out;
  },

  dragged(r, size) {
    const lines = r.pick([40, 60, 90]);
    const grain = fbm(r, size, 48, 3, 0.5);
    const jitter = fbm(r, size, 8, 2, 0.5);
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const offset = jitter[y * size + x] * 6;
        const wave = Math.sin(((x + offset) / size) * Math.PI * 2 * lines) * 0.5 + 0.5;
        out[y * size + x] = clamp01(Math.pow(wave, 2) * r.range(0.42, 0.6) + grain[y * size + x] * 0.2);
      }
    }
    return out;
  },

  plaster(r, size) {
    const base = fbm(r, size, r.pick([8, 12]), 5, 0.52);
    const out = new Float32Array(size * size);
    for (let i = 0; i < base.length; i++) {
      // Ridged noise: folding the signal makes creases rather than blobs.
      const ridge = 1 - Math.abs(base[i] - 0.5) * 2;
      out[i] = clamp01(Math.pow(ridge, 2.4) * 0.62 + 0.03);
    }
    return contrast(out, r.range(1, 1.3));
  },

  mottled(r, size) {
    const base = fbm(r, size, r.pick([6, 8, 10]), 4, 0.6);
    return mapRange(base, 0.03, r.range(0.45, 0.68));
  },

  crosshatchTexture(r, size) {
    const lines = r.pick([30, 44, 60]);
    const grain = fbm(r, size, 32, 2, 0.5);
    const out = new Float32Array(size * size);
    const strength = r.range(0.26, 0.4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const a = Math.sin(((x + y) / size) * Math.PI * lines) * 0.5 + 0.5;
        const b = Math.sin(((x - y) / size) * Math.PI * lines) * 0.5 + 0.5;
        out[y * size + x] = clamp01((Math.pow(a, 3) + Math.pow(b, 3)) * strength + grain[y * size + x] * 0.14);
      }
    }
    return out;
  },

  sandpaper(r, size) {
    const out = new Float32Array(size * size);
    const grain = fbm(r, size, 96, 2, 0.5);
    for (let i = 0; i < out.length; i++) {
      const spike = r();
      out[i] = clamp01((spike > r.range(0.72, 0.86) ? spike : spike * 0.22) * 0.8 + grain[i] * 0.18);
    }
    return out;
  },

  fibrous(r, size) {
    const out = new Float32Array(size * size);
    const strands = Math.round(size * r.range(3, 6));
    for (let i = 0; i < strands; i++) {
      let x = r() * size;
      let y = r() * size;
      let a = r() * Math.PI * 2;
      const steps = Math.ceil(r.range(size * 0.015, size * 0.06));
      const strength = r.range(0.08, 0.26);
      const width = r.range(0.5, 0.95);
      for (let s2 = 0; s2 < steps; s2++) {
        a += r.range(-0.25, 0.25);
        x += Math.cos(a);
        y += Math.sin(a);
        stamp(out, size, Math.round(x), Math.round(y), width, strength, 0.25);
      }
    }
    const haze = fbm(r, size, 40, 3, 0.5);
    for (let i = 0; i < out.length; i++) out[i] = clamp01(out[i] * 0.9 + haze[i] * 0.14);
    return out;
  }
};

/* ------------------------------------------------------------------ *
 * Metadata
 * ------------------------------------------------------------------ */

const NAMES = {
  paperGrain: ['Paper Grain', 'Laid Paper', 'Cartridge'],
  coarseGrain: ['Coarse Grain', 'Rough Stock', 'Pulp'],
  fineNoise: ['Fine Noise', 'Static', 'Dust'],
  grittyNoise: ['Gritty Noise', 'Tooth', 'Scuff'],
  linen: ['Linen', 'Plain Weave', 'Flax'],
  canvasWeave: ['Canvas', 'Duck Weave', 'Sailcloth'],
  stipple: ['Stipple', 'Pointillist', 'Freckle'],
  speckle: ['Speckle', 'Grit', 'Pepper'],
  brushed: ['Brushed', 'Satin Finish', 'Sweep'],
  dragged: ['Dragged', 'Combed', 'Rake'],
  plaster: ['Plaster', 'Lime Wash', 'Render'],
  mottled: ['Mottled', 'Wash', 'Cloud'],
  crosshatchTexture: ['Crosshatch', 'Weft Lines', 'Mesh'],
  sandpaper: ['Sandpaper', 'Abrasive', 'Emery'],
  fibrous: ['Fibrous', 'Rag', 'Strand']
};

export const COLLECTION = 'textures-and-grain';
export const PREFIX = 'tex';
export const TARGET = 30;
export const KIND = 'raster';
export const RASTER_SIZE = 512;
export const TILES = [RASTER_SIZE];
export { RECIPES };

export function metaFor(key, seen) {
  const names = NAMES[key];
  return {
    name: names[seen % names.length] + (seen >= names.length ? ' ' + (Math.floor(seen / names.length) + 1) : ''),
    tags: tagsFor(key)
  };
}

function tagsFor(key) {
  const map = {
    paperGrain: ['paper', 'grain', 'subtle'],
    coarseGrain: ['paper', 'grain', 'strong'],
    fineNoise: ['noise', 'subtle'],
    grittyNoise: ['noise', 'grain', 'strong'],
    linen: ['weave', 'fabric'],
    canvasWeave: ['weave', 'fabric'],
    stipple: ['stipple', 'dots'],
    speckle: ['stipple', 'dots', 'strong'],
    brushed: ['brushed', 'directional'],
    dragged: ['brushed', 'directional', 'lines'],
    plaster: ['surface', 'organic'],
    mottled: ['surface', 'organic', 'subtle'],
    crosshatchTexture: ['lines', 'mesh'],
    sandpaper: ['noise', 'grain', 'strong'],
    fibrous: ['organic', 'strand']
  };
  return map[key] || ['texture'];
}

export default { COLLECTION, PREFIX, TARGET, KIND, RASTER_SIZE, TILES, RECIPES, metaFor };
