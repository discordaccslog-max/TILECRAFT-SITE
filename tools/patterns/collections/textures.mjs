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

/**
 * Scattered points that wrap, with the distance to the nearest one.
 *
 * This is what gives cell-shaped textures — crackle, aggregate, hammered
 * metal — their structure. The points are placed on a jittered grid so
 * they are evenly spread rather than clumped, and each cell's neighbours
 * are checked across the tile edge so the cells meet when it repeats.
 */
function cellField(random, size, cells) {
  const step = size / cells;
  const points = [];
  for (let gy = 0; gy < cells; gy++) {
    for (let gx = 0; gx < cells; gx++) {
      points.push([(gx + random()) * step, (gy + random()) * step]);
    }
  }

  const out = new Float32Array(size * size);
  const second = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Only the points in the neighbouring grid cells can be nearest.
      const gx = Math.floor(x / step);
      const gy = Math.floor(y / step);
      let best = Infinity;
      let next = Infinity;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = ((gx + dx) % cells + cells) % cells;
          const cy = ((gy + dy) % cells + cells) % cells;
          const [px, py] = points[cy * cells + cx];

          // Shift the point to the copy of the tile this cell belongs to.
          const ox = px + (gx + dx - cx) * step * 1;
          const oy = py + (gy + dy - cy) * step * 1;
          const d = Math.hypot(x - ox, y - oy);

          if (d < best) {
            next = best;
            best = d;
          } else if (d < next) {
            next = d;
          }
        }
      }

      const i = y * size + x;
      out[i] = best / step;
      second[i] = next / step;
    }
  }

  return { nearest: out, second };
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
    /*
     * The fibre in the sheet, which is fine and close. This recipe and the
     * two below it are all soft noise, and the thing that separates them
     * is the scale they work at: fibre here, pulp flecks in coarseGrain,
     * and a slow cloud in mottled. Letting their ranges overlap produced
     * three textures that were one texture, so each keeps to its own band.
     */
    const base = fbm(r, size, r.pick([80, 112, 144]), r.pick([3, 4]), r.range(0.4, 0.55));
    return contrast(mapRange(base, r.range(0.04, 0.14), r.range(0.52, 0.78)), r.range(1.1, 1.9));
  },

  coarseGrain(r, size) {
    // Pulp: flecks you can pick out individually, with the sheet showing
    // through between them.
    const base = fbm(r, size, r.pick([28, 36, 48]), 3, 0.62);
    const flecks = fbm(r, size, 128, 2, 0.5);
    const out = new Float32Array(size * size);
    const bite = r.range(0.2, 0.45);
    for (let i = 0; i < out.length; i++) {
      out[i] = clamp01(base[i] * (1 - bite) + Math.pow(flecks[i], 2.2) * bite * 2);
    }
    return contrast(mapRange(out, 0.04, 0.78), r.range(1.3, 1.9));
  },

  fineNoise(r, size) {
    /*
     * Even noise, but not always at the pixel. Sampling it on a lattice
     * and stepping up the block size turns dust into static into snow,
     * which are three textures rather than one at three strengths.
     */
    const out = new Float32Array(size * size);
    const amount = r.range(0.22, 0.7);
    const block = r.pick([1, 1, 2, 3, 4]);
    const bias = r.range(0.7, 1.8);

    if (block === 1) {
      for (let i = 0; i < out.length; i++) out[i] = Math.pow(r(), bias) * amount;
      return out;
    }

    // Blocks have to divide the tile, or the noise will not wrap.
    const cells = Math.ceil(size / block);
    const values = new Float32Array(cells * cells);
    for (let i = 0; i < values.length; i++) values[i] = Math.pow(r(), bias) * amount;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        out[y * size + x] = values[(y % (cells * block) / block | 0) % cells * cells + ((x / block | 0) % cells)];
      }
    }
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
    // The thread count spans open flax to a tight sheeting weave, and the
    // weft can be coarser than the warp, which is what makes one linen
    // look different from the next rather than merely finer.
    const warp = r.pick([24, 36, 48, 64, 96, 128]);
    const weft = r.chance(0.35) ? r.pick([24, 36, 48, 64, 96, 128]) : warp;
    const grain = fbm(r, size, 32, 3, 0.5);
    const out = new Float32Array(size * size);
    const depth = r.range(0.26, 0.56);
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
    // Loose sailcloth through to a fine duck, which is a real range of
    // cloth rather than three near-identical weaves.
    const threads = r.pick([10, 14, 20, 28, 40, 56]);
    const grain = fbm(r, size, 48, 3, 0.5);
    const out = new Float32Array(size * size);
    const period = size / threads;
    const depth = r.range(0.22, 0.5);
    // A flat tape weave and a rounded cord weave read quite differently,
    // and a basket doubles the thread before it crosses.
    const flatness = r.range(0.45, 2.2);
    const basket = r.chance(0.35);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cx = Math.floor(x / period);
        const cy = Math.floor(y / period);
        const over = basket ? (((cx >> 1) + (cy >> 1)) % 2 === 0) : ((cx + cy) % 2 === 0);
        const along = over ? (x % period) / period : (y % period) / period;
        const round = Math.pow(Math.sin(along * Math.PI), flatness);
        out[y * size + x] = clamp01(round * depth + grain[y * size + x] * 0.26);
      }
    }
    return out;
  },

  stipple(r, size) {
    const out = new Float32Array(size * size);
    const count = Math.round(size * size * r.range(0.0015, 0.03));
    const low = r.range(0.8, 2.2);
    const high = low + r.range(0.4, 3.4);
    for (let i = 0; i < count; i++) {
      stamp(out, size, Math.floor(r() * size), Math.floor(r() * size), r.range(low, high), r.range(0.4, 1), 0.45);
    }
    return out;
  },

  speckle(r, size) {
    const out = new Float32Array(size * size);
    const count = Math.round(size * size * r.range(0.0008, 0.014));
    const bigShare = r.range(0.02, 0.3);
    for (let i = 0; i < count; i++) {
      // A mix of sizes, mostly small, is what separates grit from polka dots.
      const big = r.chance(bigShare);
      stamp(out, size, Math.floor(r() * size), Math.floor(r() * size),
        big ? r.range(2.6, 7) : r.range(0.9, 2.6), r.range(0.5, 1), 0.5);
    }
    const haze = fbm(r, size, 24, 3, 0.5);
    for (let i = 0; i < out.length; i++) out[i] = clamp01(out[i] + haze[i] * 0.12);
    return out;
  },

  brushed(r, size) {
    // Noise with a long period across the grain and a short one along it.
    const px = r.pick([3, 4, 6, 8, 12, 20]);
    const py = r.pick([32, 48, 64, 96, 128, 192]);
    const values = latticeXY(r, px, py);
    const fine = latticeXY(r, px * 2, py * 2);
    const grain = fbm(r, size, 32, 2, 0.5);
    const out = new Float32Array(size * size);
    const strength = r.range(0.28, 0.78);
    // How much of the fine pass shows decides between satin and a sweep.
    const fineShare = r.range(0.12, 0.5);
    const vertical = r.chance(0.5);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const a = vertical ? x : y;
        const b = vertical ? y : x;
        const n =
          valueNoiseXY(values, px, py, (a / size) * px, (b / size) * py) * (1 - fineShare) +
          valueNoiseXY(fine, px * 2, py * 2, (a / size) * px * 2, (b / size) * py * 2) * fineShare;
        out[y * size + x] = clamp01(n * strength + grain[y * size + x] * 0.16);
      }
    }
    return out;
  },

  dragged(r, size) {
    // A wide comb dragged slowly and a fine one dragged tight are
    // different finishes, and either can run across or down.
    const lines = r.pick([16, 24, 40, 60, 90, 140]);
    const grain = fbm(r, size, 48, 3, 0.5);
    const jitter = fbm(r, size, r.pick([6, 8, 14]), 2, 0.5);
    const wander = r.range(2, 14);
    const sharpness = r.range(1.2, 3.4);
    const depth = r.range(0.34, 0.66);
    const across = r.chance(0.5);
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const along = across ? x : y;
        const offset = jitter[y * size + x] * wander;
        const wave = Math.sin(((along + offset) / size) * Math.PI * 2 * lines) * 0.5 + 0.5;
        out[y * size + x] = clamp01(Math.pow(wave, sharpness) * depth + grain[y * size + x] * 0.2);
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
    // A slow cloud, with nothing fine in it at all — the wash under a
    // print rather than the paper it sits on.
    // Slow, but not so slow it becomes a gradient: a handful of cells
    // across the tile gives one soft ramp rather than a cloud.
    const base = fbm(r, size, r.pick([8, 10, 14]), 3, r.range(0.42, 0.58));
    return mapRange(base, 0.03, r.range(0.5, 0.78));
  },

  crosshatchTexture(r, size) {
    const lines = r.pick([14, 22, 30, 44, 60, 84]);
    const grain = fbm(r, size, 32, 2, 0.5);
    const out = new Float32Array(size * size);
    const strength = r.range(0.18, 0.5);
    const sharpness = r.range(1.8, 4.5);
    // One direction heavier than the other reads as a hatched sketch
    // rather than an even mesh.
    const bias = r.range(0.35, 1);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const a = Math.sin(((x + y) / size) * Math.PI * lines) * 0.5 + 0.5;
        const b = Math.sin(((x - y) / size) * Math.PI * lines) * 0.5 + 0.5;
        out[y * size + x] = clamp01(
          (Math.pow(a, sharpness) + Math.pow(b, sharpness) * bias) * strength + grain[y * size + x] * 0.14
        );
      }
    }
    return out;
  },

  sandpaper(r, size) {
    const out = new Float32Array(size * size);
    // Coarse paper has fewer, larger proud grains; fine paper has many
    // small ones, so the cutoff and the base roughness move together.
    const grain = fbm(r, size, r.pick([48, 64, 96, 160]), 2, 0.5);
    const cutoff = r.range(0.55, 0.93);
    const floorShare = r.range(0.08, 0.45);
    const depth = r.range(0.55, 0.95);
    for (let i = 0; i < out.length; i++) {
      const spike = r();
      out[i] = clamp01((spike > cutoff ? spike : spike * floorShare) * depth + grain[i] * 0.18);
    }
    return out;
  },

  fibrous(r, size) {
    const out = new Float32Array(size * size);
    // Short flecks of rag and long drifting strands are different papers.
    const lengthScale = r.range(0.006, 0.05);
    const weight = r.range(0.14, 0.42);
    const strands = Math.round(size * r.range(1.2, 14));
    for (let i = 0; i < strands; i++) {
      let x = r() * size;
      let y = r() * size;
      let a = r() * Math.PI * 2;
      const steps = Math.ceil(r.range(size * lengthScale, size * lengthScale * 3));
      const strength = r.range(0.06, weight);
      const width = r.range(0.4, 1.4);
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
  },

  /* ---------------------------------------------------------------- *
   * Surfaces built on cells rather than on noise or waves
   * ---------------------------------------------------------------- */

  crackle(r, size) {
    // The boundary between cells, which is where a glaze crazes.
    const { nearest, second } = cellField(r, size, r.pick([6, 9, 12, 16]));
    const width = r.range(0.04, 0.14);
    const softness = r.range(1.2, 3);
    const haze = fbm(r, size, 24, 3, 0.5);
    const out = new Float32Array(size * size);
    for (let i = 0; i < out.length; i++) {
      const edge = second[i] - nearest[i];
      out[i] = clamp01(Math.pow(clamp01(1 - edge / width), softness) * 0.85 + haze[i] * 0.1);
    }
    return out;
  },

  aggregate(r, size) {
    // Stone chips set in a matrix: the cells themselves, not their edges.
    const { nearest } = cellField(r, size, r.pick([8, 11, 14, 18]));
    const fill = r.range(0.45, 0.8);
    const grit = fbm(r, size, 96, 2, 0.5);
    const shape = r.range(0.4, 1.1);
    const out = new Float32Array(size * size);
    for (let i = 0; i < out.length; i++) {
      const chip = nearest[i] < fill ? 1 - nearest[i] / fill : 0;
      out[i] = clamp01(Math.pow(chip, shape) * 0.7 + grit[i] * 0.22);
    }
    return out;
  },

  hammered(r, size) {
    // Shallow dents, each falling away from its own centre.
    const { nearest } = cellField(r, size, r.pick([7, 10, 14]));
    const depth = r.range(0.4, 0.75);
    const out = new Float32Array(size * size);
    for (let i = 0; i < out.length; i++) {
      out[i] = clamp01(Math.pow(1 - Math.min(1, nearest[i]), 2) * depth + 0.06);
    }
    return contrast(out, r.range(1, 1.5));
  },

  /* ---------------------------------------------------------------- *
   * Cloth and knit
   * ---------------------------------------------------------------- */

  twill(r, size) {
    // A diagonal weave: the float steps across by one thread each row.
    const threads = r.pick([24, 32, 48, 64]);
    const period = size / threads;
    const float = r.pick([2, 3, 4]);
    const grain = fbm(r, size, 48, 2, 0.5);
    const depth = r.range(0.3, 0.55);
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cx = Math.floor(x / period);
        const cy = Math.floor(y / period);
        const over = (cx + cy) % (float + 1) < float;
        const along = over ? (y % period) / period : (x % period) / period;
        out[y * size + x] = clamp01(Math.sin(along * Math.PI) * depth + grain[y * size + x] * 0.22);
      }
    }
    return out;
  },

  knit(r, size) {
    // Stockinette: a field of Vs, each row offset by half a stitch.
    const stitches = r.pick([12, 16, 24, 32]);
    const step = size / stitches;
    const rows = Math.round(stitches * r.pick([0.8, 1, 1.25]));
    const rowStep = size / rows;
    // A heavy stroke at this size closes the gaps and the whole thing
    // reads as a hard diamond lattice instead of stitches.
    const weight = step * r.range(0.08, 0.16);
    const strength = r.range(0.1, 0.2);
    const out = new Float32Array(size * size);

    for (let row = 0; row < rows; row++) {
      const offset = row % 2 ? step / 2 : 0;
      for (let i = 0; i < stitches; i++) {
        const cx = i * step + offset + step / 2;
        const cy = row * rowStep + rowStep / 2;
        // Two strokes meeting at the bottom, drawn point by point so they
        // wrap at the edges without needing a path.
        for (let t = 0; t <= 1; t += 0.04) {
          const dx = (t - 0.5) * step * 0.8;
          const dy = (Math.abs(t - 0.5) * 2 - 0.5) * rowStep * 0.55;
          stamp(out, size, Math.round(cx + dx), Math.round(cy + dy), weight, strength, 0.5);
        }
      }
    }

    const haze = fbm(r, size, 32, 2, 0.5);
    for (let i = 0; i < out.length; i++) out[i] = clamp01(out[i] + haze[i] * 0.1);
    return out;
  },

  corduroy(r, size) {
    // Hard-edged ribs with a bare channel between them, which is what
    // separates a cord from the soft wave of a dragged finish.
    const ribs = r.pick([10, 16, 24, 36]);
    const period = size / ribs;
    const gap = r.range(0.12, 0.38);
    const grain = fbm(r, size, 64, 3, 0.5);
    const vertical = r.chance(0.5);
    const depth = r.range(0.45, 0.72);
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const along = ((vertical ? x : y) % period) / period;
        const inRib = along > gap / 2 && along < 1 - gap / 2;
        const across = inRib ? Math.sin(((along - gap / 2) / (1 - gap)) * Math.PI) : 0;
        out[y * size + x] = clamp01(across * depth + grain[y * size + x] * 0.2);
      }
    }
    return out;
  },

  /* ---------------------------------------------------------------- *
   * Marks and wear
   * ---------------------------------------------------------------- */

  scratched(r, size) {
    // Straight scratches sharing a rough direction, as a plate wears.
    const out = new Float32Array(size * size);
    const count = Math.round(r.range(150, 500));
    const spread = r.range(0.05, 0.9);
    const base = r() * Math.PI;

    for (let i = 0; i < count; i++) {
      const angle = base + r.range(-spread, spread);
      const length = size * r.range(0.04, 0.5);
      const strength = r.range(0.3, 0.9);
      const width = r.range(0.5, 1.3);
      let x = r() * size;
      let y = r() * size;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      for (let s2 = 0; s2 < length; s2++) {
        stamp(out, size, Math.round(x), Math.round(y), width, strength * 0.5, 0.3);
        x += dx;
        y += dy;
      }
    }
    return out;
  },

  halftone(r, size) {
    // A dot screen whose dots grow and shrink with a slow field under it.
    const cells = r.pick([16, 24, 32, 48]);
    const step = size / cells;
    const field = fbm(r, size, r.pick([4, 6, 8]), 3, 0.55);
    const staggered = r.chance(0.5);
    const gamma = r.range(0.6, 1.6);
    const weight = r.range(0.6, 0.95);
    const out = new Float32Array(size * size);

    for (let gy = 0; gy < cells; gy++) {
      for (let gx = 0; gx < cells; gx++) {
        // Alternate rows are offset rather than the grid being turned,
        // because a turned grid would not wrap.
        const offset = staggered && gy % 2 ? step / 2 : 0;
        const cx = gx * step + step / 2 + offset;
        const cy = gy * step + step / 2;
        const sample = field[(Math.round(cy) % size) * size + (Math.round(cx) % size)];
        const radius = step * 0.52 * Math.pow(sample, gamma);
        if (radius > 0.4) stamp(out, size, Math.round(cx), Math.round(cy), radius, weight, 0.75);
      }
    }
    return out;
  },

  blotted(r, size) {
    // Ink soaking into paper: pools with a darker rim where they dried.
    // The period has to be fine enough to give a field of small pools; at
    // a handful of cells across the tile it produced one shape per tile.
    const base = fbm(r, size, r.pick([18, 26, 36, 48]), 4, 0.55);
    const level = r.range(0.44, 0.58);
    const rim = r.range(0.03, 0.09);
    const out = new Float32Array(size * size);
    for (let i = 0; i < out.length; i++) {
      const d = base[i] - level;
      const inside = d > 0 ? 0.42 : 0;
      const edge = Math.abs(d) < rim ? (1 - Math.abs(d) / rim) * 0.5 : 0;
      out[i] = clamp01(inside + edge);
    }
    return out;
  },

  marbled(r, size) {
    // A wave family folded by noise, which is how a comb drags through
    // size. A whole number of cycles keeps the fold wrapping.
    //
    // Few veins and a strong fold gives two fat smears rather than marble,
    // so the vein count is kept high and the fold moderate.
    const warp = fbm(r, size, r.pick([5, 7, 10]), 3, 0.55);
    const veins = r.pick([14, 20, 28, 40]);
    // The fold has to be worth at least a few vein widths, or the waves
    // stay straight and the result is a stripe, not marbling.
    const strength = r.range(4, 9);
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const phase = (x / size) * Math.PI * 2 * veins + warp[i] * strength;
        out[i] = clamp01(Math.pow(Math.sin(phase) * 0.5 + 0.5, 1.6) * 0.72 + 0.03);
      }
    }
    return contrast(out, r.range(1, 1.6));
  },

  herringboneWeave(r, size) {
    // Threads running in blocks that reverse direction, which reads as a
    // chevron rather than the continuous diagonal of a twill.
    const blocks = r.pick([4, 6, 8]);
    const block = size / blocks;
    const threads = r.pick([3, 4, 6]);
    const period = block / threads;
    const depth = r.range(0.35, 0.6);
    const grain = fbm(r, size, 48, 2, 0.5);
    const out = new Float32Array(size * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const column = Math.floor(x / block);
        // Alternate blocks lean the other way, and the count is even so
        // the reversal closes across the tile.
        const lean = column % 2 === 0 ? 1 : -1;
        const along = (((x * lean + y) % period) + period) % period / period;
        out[y * size + x] = clamp01(Math.sin(along * Math.PI) * depth + grain[y * size + x] * 0.2);
      }
    }
    return out;
  },

  fishScale(r, size) {
    // Overlapping arcs, each row hung half a scale across the one above.
    const columns = r.pick([4, 5, 7, 9]);
    const step = size / columns;
    const rows = r.pick([4, 5, 7, 9]);
    const rowStep = size / rows;
    const weight = r.range(1.4, 3.6);
    const strength = r.range(0.5, 0.95);
    const out = new Float32Array(size * size);

    for (let row = 0; row < rows; row++) {
      const offset = row % 2 ? step / 2 : 0;
      for (let i = 0; i < columns; i++) {
        const cx = i * step + offset;
        const cy = row * rowStep;
        // The arc has to reach the row below, or the scales sit in bands
        // with bare tile between them.
        for (let a = 0; a <= Math.PI; a += 0.02) {
          stamp(
            out, size,
            Math.round(cx + Math.cos(a) * (step * 0.5)),
            Math.round(cy + Math.sin(a) * rowStep),
            weight, strength, 0.4
          );
        }
      }
    }
    return out;
  },

  pitted(r, size) {
    // Small sunken marks in an otherwise even surface — the opposite of a
    // raised grain, and it reads quite differently when printed.
    const base = fbm(r, size, 64, 2, 0.5);
    const out = new Float32Array(size * size);
    for (let i = 0; i < out.length; i++) out[i] = 0.42 + base[i] * 0.16;

    const count = Math.round(size * size * r.range(0.0004, 0.004));
    const depth = r.range(0.3, 0.45);
    for (let i = 0; i < count; i++) {
      const cx = Math.floor(r() * size);
      const cy = Math.floor(r() * size);
      const radius = r.range(1.5, 6);
      // A negative stamp, done here because stamp only adds.
      const rr = Math.ceil(radius);
      for (let dy = -rr; dy <= rr; dy++) {
        for (let dx = -rr; dx <= rr; dx++) {
          const d = Math.hypot(dx, dy);
          if (d > radius) continue;
          const x = (((cx + dx) % size) + size) % size;
          const y = (((cy + dy) % size) + size) % size;
          const j = y * size + x;
          out[j] = clamp01(out[j] - depth * (1 - d / radius));
        }
      }
    }
    return out;
  },

  striated(r, size) {
    // Hard-edged bands of uneven width, like a cut through layered stone.
    const bands = r.pick([8, 12, 18, 26]);
    const step = size / bands;
    const warp = fbm(r, size, r.pick([4, 6]), 3, 0.5);
    const wander = r.range(2, 18);
    const vertical = r.chance(0.4);
    const tones = [];
    for (let i = 0; i < bands; i++) tones.push(r.range(0.05, 0.75));
    const out = new Float32Array(size * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const along = (vertical ? x : y) + (warp[i] - 0.5) * wander;
        const band = ((Math.floor(along / step) % bands) + bands) % bands;
        out[i] = tones[band];
      }
    }
    return out;
  },

  bubbles(r, size) {
    // Rings rather than discs, at a spread of sizes.
    const out = new Float32Array(size * size);
    const count = Math.round(r.range(40, 260));
    const strength = r.range(0.4, 0.9);
    const thickness = r.range(0.5, 1.4);

    for (let i = 0; i < count; i++) {
      const cx = r() * size;
      const cy = r() * size;
      const radius = size * r.range(0.008, 0.07);
      const steps = Math.max(12, Math.round(radius * 7));
      for (let s2 = 0; s2 < steps; s2++) {
        const a = (s2 / steps) * Math.PI * 2;
        stamp(
          out, size,
          Math.round(cx + Math.cos(a) * radius),
          Math.round(cy + Math.sin(a) * radius),
          thickness, strength, 0.45
        );
      }
    }

    const haze = fbm(r, size, 32, 2, 0.5);
    for (let i = 0; i < out.length; i++) out[i] = clamp01(out[i] + haze[i] * 0.08);
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
  fibrous: ['Fibrous', 'Rag', 'Strand'],
  crackle: ['Crackle', 'Craze', 'Glaze'],
  aggregate: ['Aggregate', 'Chipstone', 'Ballast'],
  hammered: ['Hammered', 'Planished', 'Dimple'],
  twill: ['Twill', 'Denim', 'Gabardine'],
  knit: ['Knit', 'Stockinette', 'Jersey'],
  corduroy: ['Corduroy', 'Cord', 'Welt'],
  scratched: ['Scratched', 'Scored', 'Hairline'],
  halftone: ['Halftone', 'Screen', 'Dot Gain'],
  blotted: ['Blotted', 'Bleed', 'Pooling'],
  marbled: ['Marbled', 'Combed Size', 'Swirl'],
  herringboneWeave: ['Herringbone', 'Chevron Weave', 'Tweed'],
  fishScale: ['Fish Scale', 'Clamshell', 'Scallop'],
  pitted: ['Pitted', 'Pocked', 'Cast Surface'],
  striated: ['Striated', 'Strata', 'Seam'],
  bubbles: ['Bubbles', 'Rings', 'Effervescence']
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
    fibrous: ['organic', 'strand'],
    crackle: ['surface', 'cells', 'organic'],
    aggregate: ['surface', 'cells', 'stone'],
    hammered: ['surface', 'cells', 'metal'],
    twill: ['weave', 'fabric', 'diagonal'],
    knit: ['weave', 'fabric', 'knit'],
    corduroy: ['fabric', 'directional', 'lines'],
    scratched: ['wear', 'directional', 'lines'],
    halftone: ['dots', 'print', 'screen'],
    blotted: ['ink', 'organic', 'print'],
    marbled: ['organic', 'swirl', 'lines'],
    herringboneWeave: ['weave', 'fabric', 'chevron'],
    fishScale: ['scallop', 'curves', 'geometric'],
    pitted: ['surface', 'wear', 'cast'],
    striated: ['lines', 'stone', 'bands'],
    bubbles: ['rings', 'organic', 'light']
  };
  return map[key] || ['texture'];
}

export default { COLLECTION, PREFIX, TARGET, KIND, RASTER_SIZE, TILES, RECIPES, metaFor };
