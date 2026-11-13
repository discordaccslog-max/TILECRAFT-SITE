/*
 * Shared rendering for Studio modules.
 *
 * Turns a pattern — vector spec or texture tile — into something that can
 * be shown, tiled, and exported, in any set of colors.
 *
 * Vector patterns go through js/patterns/engine.mjs, the same code the
 * build used to write the shipped SVG files, so a recolored export is
 * produced exactly the way the original was.
 *
 * Textures ship as grayscale PNG tiles. Recoloring maps their luminance
 * between the background and the ink of a colorway, which keeps the grain
 * intact instead of tinting a flat image.
 */

import { renderSvg, colorsOf, hexToRgb } from '../../../js/patterns/engine.mjs';

/* ------------------------------------------------------------------ *
 * Loading a collection
 * ------------------------------------------------------------------ */

const cache = new Map();

/** Load a collection's specs once, and keep them for the session. */
export async function loadCollection(slug) {
  if (cache.has(slug)) return cache.get(slug);

  const promise = (async () => {
    const base = '/patterns/' + slug + '/';
    const [specs, catalog] = await Promise.all([
      fetch(base + 'specs.json').then((r) => {
        if (!r.ok) throw new Error('Could not load this collection (' + r.status + ').');
        return r.json();
      }),
      fetch(base + 'catalog.json').then((r) => (r.ok ? r.json() : null))
    ]);
    return { slug, base, specs, catalog };
  })();

  cache.set(slug, promise);
  return promise;
}

/* ------------------------------------------------------------------ *
 * Colors
 * ------------------------------------------------------------------ */

export { colorsOf };

/** The color slots a pattern actually uses, in a stable order. */
export function slotsOf(spec) {
  const slots = ['bg'];
  const seen = new Set(slots);
  for (const p of spec.draw || []) {
    const slot = p.fill != null ? p.fill : p.stroke;
    if (typeof slot === 'string' && !slot.startsWith('#') && !seen.has(slot)) {
      seen.add(slot);
      slots.push(slot);
    }
  }
  if (spec.type === 'raster') return ['bg', 'ink'];
  return slots;
}

/* ------------------------------------------------------------------ *
 * Drawing a tile
 * ------------------------------------------------------------------ */

const imageCache = new Map();

function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    // Textures and SVG tiles are same-origin; this keeps the canvas clean
    // so it can be read back for export.
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That tile could not be loaded.'));
    image.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

/** An SVG tile as a data URI, in the given colors. */
export function svgTile(spec, colors, options = {}) {
  return renderSvg(spec, colors, {
    standalone: !!options.standalone,
    background: options.transparent ? false : undefined
  });
}

export function svgDataUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Draw one tile of a pattern into a canvas at the given pixel size.
 * Works for both vector specs and texture tiles.
 *
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderTile(pattern, colors, size, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });

  if (pattern.spec.type === 'raster') {
    await drawTexture(ctx, pattern, colors, size, options);
    return canvas;
  }

  const svg = svgTile(pattern.spec, colors, options);
  const image = await loadImage(svgDataUri(svg));
  ctx.drawImage(image, 0, 0, size, size);
  return canvas;
}

/** Paint a grayscale texture between two colors. */
async function drawTexture(ctx, pattern, colors, size, options = {}) {
  const image = await loadImage(pattern.base + pattern.spec.raster);

  const work = document.createElement('canvas');
  work.width = size;
  work.height = size;
  const workCtx = work.getContext('2d', { willReadFrequently: true });
  workCtx.imageSmoothingEnabled = true;
  workCtx.imageSmoothingQuality = 'high';
  workCtx.drawImage(image, 0, 0, size, size);

  const data = workCtx.getImageData(0, 0, size, size);
  const bg = hexToRgb(colors.bg || '#ffffff');
  const ink = hexToRgb(colors.ink || '#000000');
  const pixels = data.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const t = pixels[i] / 255;
    if (options.transparent) {
      // The grain becomes the alpha channel, so the texture can be laid
      // over other artwork as an overlay rather than as a flat image.
      pixels[i] = ink[0];
      pixels[i + 1] = ink[1];
      pixels[i + 2] = ink[2];
      pixels[i + 3] = Math.round(t * 255);
    } else {
      pixels[i] = bg[0] + (ink[0] - bg[0]) * t;
      pixels[i + 1] = bg[1] + (ink[1] - bg[1]) * t;
      pixels[i + 2] = bg[2] + (ink[2] - bg[2]) * t;
      pixels[i + 3] = 255;
    }
  }

  ctx.putImageData(data, 0, 0);
}

/**
 * A tile as a data URI, for use as a CSS background. Textures are drawn
 * through a canvas first so they arrive already recolored.
 */
export async function tileDataUri(pattern, colors, size = 256) {
  if (pattern.spec.type !== 'raster') {
    return svgDataUri(svgTile(pattern.spec, colors));
  }
  const canvas = await renderTile(pattern, colors, size);
  return canvas.toDataURL('image/png');
}

/**
 * Draw a pattern repeated across a canvas of any size.
 *
 * @param {object} pattern
 * @param {object} colors
 * @param {number} width
 * @param {number} height
 * @param {number} tilePixels the size one repeat occupies
 * @param {object} [options] transparent: leave the background clear
 */
export async function renderSheet(pattern, colors, width, height, tilePixels, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!options.transparent) {
    ctx.fillStyle = colors.bg || '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  const tile = await renderTile(pattern, colors, Math.max(2, Math.round(tilePixels)), {
    transparent: !!options.transparent
  });

  stamp(ctx, tile, width, height, tilePixels);
  return canvas;
}

function stamp(ctx, tile, width, height, tilePixels) {
  const step = Math.max(1, Math.round(tilePixels));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      ctx.drawImage(tile, x, y, step, step);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Pattern objects
 * ------------------------------------------------------------------ */

/** Wrap a spec with the base path its files live under. */
export function asPattern(spec, base) {
  return {
    id: spec.id,
    name: spec.name,
    tags: spec.tags || [],
    spec,
    base,
    isVector: spec.type !== 'raster',
    thumb: spec.type === 'raster' ? base + (spec.thumb || spec.raster) : null
  };
}

export default {
  loadCollection,
  asPattern,
  renderTile,
  renderSheet,
  tileDataUri,
  svgTile,
  svgDataUri,
  colorsOf,
  slotsOf
};
