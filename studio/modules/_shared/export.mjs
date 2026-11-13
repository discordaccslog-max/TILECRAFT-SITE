/*
 * Shared export for Studio modules.
 *
 * Everything a buyer downloads comes through here, so every download is a
 * zip carrying the artwork and a short license note. The note is generated
 * from the license on the device, so it names the product, the code, and
 * what the license allows.
 *
 * Exports are produced in the browser. Nothing is uploaded, and no export
 * passes through a server.
 */

import { makeZip, blobBytes } from './zip.mjs';
import { renderSheet, renderTile, svgTile } from './render.mjs';
import { SITE } from '../../../js/site-config.js';

/* ------------------------------------------------------------------ *
 * How large an export this device can actually manage
 * ------------------------------------------------------------------ */

let measured = null;

/**
 * Find the largest square canvas this browser will really produce.
 *
 * Browsers differ, and they do not announce the limit: asking for a canvas
 * beyond it does not throw, it silently returns blank pixels. So each
 * candidate size is drawn into and read back, and the largest one that
 * actually holds its pixels is the answer. The result is cached for the
 * session and shown to the buyer rather than guessed at.
 */
export async function maxExportSize() {
  if (measured) return measured;

  const candidates = [16384, 12000, 10000, 8192, 6000, 4096, 2048];
  let best = 1024;

  for (const size of candidates) {
    if (!canHoldPixels(size)) continue;
    best = size;
    break;
  }

  measured = best;
  return best;
}

function canHoldPixels(size) {
  let canvas = null;
  try {
    canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    if (canvas.width !== size || canvas.height !== size) return false;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // Paint known pixels in the far corner and read them back. A canvas
    // over the limit reports its size happily and then hands back nothing.
    ctx.fillStyle = '#7f3fbf';
    ctx.fillRect(size - 2, size - 2, 2, 2);
    const data = ctx.getImageData(size - 1, size - 1, 1, 1).data;
    return data[0] === 0x7f && data[1] === 0x3f && data[2] === 0xbf;
  } catch {
    return false;
  } finally {
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
}

/** A plain description of the limit, for showing in the interface. */
export function describeLimit(size) {
  // Pixels are what the browser limits; inches at 300 DPI are what someone
  // choosing a print size is actually thinking in, so both are given.
  const inches = (size / 300).toFixed(1);
  return (
    size.toLocaleString('en-US') + ' x ' + size.toLocaleString('en-US') +
    ' pixels (about ' + inches + ' inches square at 300 DPI)'
  );
}

/* ------------------------------------------------------------------ *
 * Resolution written into the file
 * ------------------------------------------------------------------ */

/**
 * Write a pHYs chunk into a PNG so the file declares its resolution.
 *
 * Without it a print tool opens a large export at 72 DPI and reports the
 * wrong physical size. The chunk is inserted before the first IDAT, which
 * is where the specification requires it.
 */
export function setPngDpi(bytes, dpi) {
  const perMetre = Math.round(dpi / 0.0254);
  const signature = 8;
  let offset = signature;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (offset < bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    if (type === 'IDAT' || type === 'pHYs') break;
    offset += 12 + length;
  }

  const chunk = new Uint8Array(21);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  chunkView.setUint32(8, perMetre);
  chunkView.setUint32(12, perMetre);
  chunk[16] = 1; // unit: metres
  chunkView.setUint32(17, crc32(chunk.subarray(4, 17)));

  const out = new Uint8Array(bytes.length + chunk.length);
  out.set(bytes.subarray(0, offset), 0);
  out.set(chunk, offset);
  out.set(bytes.subarray(offset), offset + chunk.length);
  return out;
}

let crcTable = null;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

/* ------------------------------------------------------------------ *
 * The license note
 * ------------------------------------------------------------------ */

export function licenseNote(context, extra = {}) {
  const license = context.license || {};
  const product = context.product || {};
  const lines = [
    'TILECRAFT DIGITAL — COMMERCIAL LICENSE',
    '',
    'Product:      ' + (product.name || 'Tilecraft Digital'),
    'License code: ' + (license.code || 'not recorded'),
  ];
  if (license.licensee) lines.push('Licensed to:  ' + license.licensee);
  if (license.orderRef) lines.push('Order:        ' + license.orderRef);
  if (extra.pattern) lines.push('Pattern:      ' + extra.pattern);
  if (extra.colorway) lines.push('Colorway:     ' + extra.colorway);
  if (extra.size) lines.push('Size:         ' + extra.size);
  lines.push('Exported:     ' + new Date().toISOString().slice(0, 10));

  lines.push(
    '',
    'WHAT THIS LICENSE ALLOWS',
    'Use these patterns, including recolored and generated versions, in your',
    'own designs and in physical and digital products you sell. No attribution',
    'required. No limit on the number of items you make or sell. Client work is',
    'included. Licensed to one individual or one business.',
    '',
    'WHAT IT DOES NOT ALLOW',
    'Do not resell, share, or distribute the pattern files themselves, original',
    'or modified, including as digital papers, pattern packs, templates, or',
    'design files. Do not use the patterns in logos or trademarks, in NFTs or',
    'other crypto-tokens, or to train AI models. Do not share your license code',
    'or its activation link.',
    '',
    'This license is perpetual for patterns already downloaded, and ends if the',
    'purchase is refunded.',
    '',
    'Full license: ' + SITE.origin + '/license/',
    ''
  );

  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * Exports
 * ------------------------------------------------------------------ */

/**
 * Fill in a batch naming scheme.
 *
 * The placeholders are the ones the Production Studio offers, and each is
 * made safe for a filename on its own, so a colorway called "Soft / Warm"
 * cannot introduce a path separator into the archive.
 *
 * @param {string} scheme  e.g. '{pattern}-{colorway}'
 * @param {object} parts   pattern, colorway, index, width, height
 */
export function fileNameFor(scheme, parts) {
  const filled = String(scheme)
    .replace(/\{pattern\}/g, safeName(parts.pattern))
    .replace(/\{colorway\}/g, safeName(parts.colorway))
    .replace(/\{index\}/g, String(parts.index).padStart(2, '0'))
    .replace(/\{size\}/g, parts.width + 'x' + parts.height);
  return safeName(filled);
}

export function safeName(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pattern';
}

async function canvasBytes(canvas, format, quality) {
  const type = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error('This export was too large for the browser to produce.');
  return blobBytes(blob);
}

/**
 * Export one pattern and hand back a zip.
 *
 * @param {object} options
 *   pattern, colors, colorwayName, context
 *   width, height        pixels
 *   tilePixels           how large one repeat is in the output
 *   format               'png' | 'jpeg' | 'svg'
 *   transparent          leave the background clear
 *   dpi                  written into PNG exports
 */
export async function exportPattern(options) {
  const {
    pattern, colors, colorwayName, context,
    width, height, tilePixels, format, transparent, dpi = 300, quality = 0.92
  } = options;

  const base = safeName(pattern.name) + '-' + safeName(colorwayName || 'custom');
  const entries = [];

  if (format === 'svg') {
    if (!pattern.isVector) throw new Error('Textures are raster tiles, so they have no SVG version.');
    const svg = svgTile(pattern.spec, colors, { standalone: true, transparent });
    entries.push({ name: base + '.svg', data: svg });
  } else {
    const canvas =
      width === tilePixels && height === tilePixels
        ? await renderTile(pattern, colors, width, { transparent })
        : await renderSheet(pattern, colors, width, height, tilePixels, { transparent });

    let bytes = await canvasBytes(canvas, format, quality);
    if (format === 'png') bytes = setPngDpi(bytes, dpi);
    entries.push({ name: base + '.' + (format === 'jpeg' ? 'jpg' : 'png'), data: bytes });
  }

  entries.push({
    name: 'LICENSE.txt',
    data: licenseNote(context, {
      pattern: pattern.name,
      colorway: colorwayName,
      size: format === 'svg' ? 'vector' : width + ' x ' + height + ' px at ' + dpi + ' DPI'
    })
  });

  return { blob: makeZip(entries), filename: 'tilecraft-' + base + '.zip' };
}

/** Export many colorways of one pattern into a single zip. */
export async function exportBatch(options) {
  const {
    pattern, colorways, context, width, height, tilePixels,
    format, transparent, dpi = 300, quality = 0.92, naming = '{pattern}-{colorway}',
    onProgress
  } = options;

  const entries = [];
  let index = 0;

  for (const colorway of colorways) {
    index++;
    if (onProgress) onProgress(index, colorways.length, colorway.name);
    // Yield between items so a long batch does not lock the interface.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const name = fileNameFor(naming, {
      pattern: pattern.name,
      colorway: colorway.name,
      index,
      width,
      height
    });

    if (format === 'svg') {
      if (!pattern.isVector) continue;
      entries.push({
        name: name + '.svg',
        data: svgTile(pattern.spec, colorway.colors, { standalone: true, transparent })
      });
      continue;
    }

    const canvas =
      width === tilePixels && height === tilePixels
        ? await renderTile(pattern, colorway.colors, width, { transparent })
        : await renderSheet(pattern, colorway.colors, width, height, tilePixels, { transparent });

    let bytes = await canvasBytes(canvas, format, quality);
    if (format === 'png') bytes = setPngDpi(bytes, dpi);
    entries.push({ name: name + '.' + (format === 'jpeg' ? 'jpg' : 'png'), data: bytes });
  }

  if (!entries.length) throw new Error('There was nothing to export.');

  entries.push({
    name: 'LICENSE.txt',
    data: licenseNote(context, {
      pattern: pattern.name,
      colorway: entries.length + ' colorways',
      size: format === 'svg' ? 'vector' : width + ' x ' + height + ' px at ' + dpi + ' DPI'
    })
  });

  return {
    blob: makeZip(entries),
    filename: 'tilecraft-' + safeName(pattern.name) + '-colorways.zip'
  };
}

export default {
  exportPattern, exportBatch, maxExportSize, describeLimit,
  licenseNote, setPngDpi, safeName, fileNameFor
};
