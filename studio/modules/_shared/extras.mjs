/*
 * The extras bought at checkout.
 *
 * Each one here produces a real file. They live together because three of
 * the Collections' extras are documents about a pattern rather than the
 * pattern itself, and the Collection workspace, Production Studio and the
 * tools all want the same ones.
 *
 * Nothing in here decides whether an extra is owned; callers ask
 * context.options.has() and only then reach for these.
 */

import { PdfDocument } from '../../../js/pdf.js';
import { licenseNote, safeName } from './export.mjs';
import { renderTile } from './render.mjs';

const INK = {
  dark: [0.08, 0.09, 0.16],
  muted: [0.37, 0.39, 0.46],
  rule: [0.82, 0.8, 0.76],
  pink: [0.94, 0.24, 0.5]
};

const PAGE = { width: 595, height: 842 };
const MARGIN = 48;
const CONTENT = PAGE.width - MARGIN * 2;

function header(doc, title, subtitle) {
  doc.text('TILECRAFT DIGITAL', MARGIN, 56, {
    font: 'regular',
    size: 8,
    color: INK.muted,
    letterSpacing: 1.6
  });
  doc.text(title, MARGIN, 88, { font: 'bold', size: 20, color: INK.dark });
  if (subtitle) doc.text(subtitle, MARGIN, 108, { font: 'regular', size: 10, color: INK.muted });
  doc.line(MARGIN, 122, MARGIN + CONTENT, 122, INK.rule, 1);
}

function footer(doc, context) {
  const license = (context.license && context.license.code) || 'not recorded';
  doc.line(MARGIN, PAGE.height - 72, MARGIN + CONTENT, PAGE.height - 72, INK.rule, 1);
  doc.text('License ' + license, MARGIN, PAGE.height - 56, {
    font: 'mono',
    size: 8,
    color: INK.muted
  });
  doc.text('Generated in your browser', MARGIN + CONTENT, PAGE.height - 56, {
    font: 'regular',
    size: 8,
    color: INK.muted,
    align: 'right'
  });
}

/** A row of label and value, returning the next y. */
function row(doc, label, value, y) {
  doc.text(label.toUpperCase(), MARGIN, y, {
    font: 'regular',
    size: 7.5,
    color: INK.muted,
    letterSpacing: 0.8
  });
  doc.text(value, MARGIN + 150, y, { font: 'regular', size: 11, color: INK.dark });
  return y + 22;
}

/* ------------------------------------------------------------------ *
 * Print spec sheet
 * ------------------------------------------------------------------ */

/**
 * One page telling a printer what this repeat is: the tile size, what it
 * measures at each of the usual resolutions, and how many repeats land
 * across a width of cloth.
 */
export function specSheet(pattern, context, options = {}) {
  const doc = new PdfDocument({
    width: PAGE.width,
    height: PAGE.height,
    info: { Title: pattern.name + ' — print specification', Author: 'Tilecraft Digital' }
  });

  header(doc, pattern.name, 'Print specification for one repeat');

  const tile = pattern.spec.tile || pattern.spec.rasterSize || 512;
  const vector = pattern.spec.type !== 'raster';

  let y = 150;
  y = row(doc, 'Pattern', pattern.name, y);
  y = row(doc, 'Collection', options.collection || pattern.spec.collection || '—', y);
  y = row(doc, 'Artwork', vector ? 'Vector — scales to any size' : 'Raster tile, ' + tile + ' x ' + tile + ' px', y);
  y = row(doc, 'Tile', tile + ' x ' + tile + ' units square', y);

  y += 14;
  doc.text('AT EACH RESOLUTION', MARGIN, y, {
    font: 'bold',
    size: 8,
    color: INK.muted,
    letterSpacing: 1.2
  });
  y += 18;

  // A table of what one repeat measures when exported at each DPI.
  const cols = [MARGIN, MARGIN + 110, MARGIN + 250, MARGIN + 380];
  doc.text('Export size', cols[0], y, { font: 'bold', size: 9, color: INK.dark });
  doc.text('At 150 DPI', cols[1], y, { font: 'bold', size: 9, color: INK.dark });
  doc.text('At 300 DPI', cols[2], y, { font: 'bold', size: 9, color: INK.dark });
  doc.text('At 600 DPI', cols[3], y, { font: 'bold', size: 9, color: INK.dark });
  y += 6;
  doc.line(MARGIN, y, MARGIN + CONTENT, y, INK.rule, 0.6);
  y += 14;

  for (const px of [1024, 2048, 4096, 8192]) {
    doc.text(px + ' px', cols[0], y, { font: 'mono', size: 9, color: INK.dark });
    [150, 300, 600].forEach((dpi, i) => {
      doc.text((px / dpi).toFixed(1) + ' in', cols[i + 1], y, { font: 'mono', size: 9, color: INK.muted });
    });
    y += 16;
  }

  y += 14;
  doc.text('ACROSS A WIDTH OF CLOTH', MARGIN, y, {
    font: 'bold',
    size: 8,
    color: INK.muted,
    letterSpacing: 1.2
  });
  y += 18;

  // How many repeats fall across the common bolt widths, given a repeat
  // printed at a few sensible physical sizes.
  for (const repeatInches of [4, 6, 12]) {
    const parts = [44, 54, 58].map(
      (bolt) => bolt + 'in: ' + (bolt / repeatInches).toFixed(1) + ' repeats'
    );
    doc.text(
      'A ' + repeatInches + ' inch repeat — ' + parts.join(' · '),
      MARGIN,
      y,
      { font: 'regular', size: 9.5, color: INK.dark }
    );
    y += 16;
  }

  y += 16;
  doc.text(
    'Colour on a screen is not colour from a press. Test print before a long run.',
    MARGIN,
    y,
    { font: 'regular', size: 9, color: INK.muted }
  );

  footer(doc, context);
  return doc;
}

/* ------------------------------------------------------------------ *
 * Seam report
 * ------------------------------------------------------------------ */

/**
 * Measure how well a rendered tile meets itself.
 *
 * The same comparison the build runs: opposite edges against the ordinary
 * differences found inside the tile.
 */
export function measureSeams(data, width, height) {
  const at = (x, y) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const diff = (a, b) => (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;

  const column = (x0, x1) => {
    let t = 0;
    for (let y = 0; y < height; y++) t += diff(at(x0, y), at(x1, y));
    return t / height;
  };
  const rowAt = (y0, y1) => {
    let t = 0;
    for (let x = 0; x < width; x++) t += diff(at(x, y0), at(x, y1));
    return t / width;
  };

  const insideV = [];
  for (let x = 1; x < width; x++) insideV.push(column(x - 1, x));
  const insideH = [];
  for (let y = 1; y < height; y++) insideH.push(rowAt(y - 1, y));

  const mean = (l) => l.reduce((a, b) => a + b, 0) / l.length;
  const max = (l) => l.reduce((a, b) => Math.max(a, b), 0);

  const edgeV = column(width - 1, 0);
  const edgeH = rowAt(height - 1, 0);
  const limitV = Math.max(max(insideV), mean(insideV) * 2) + 2;
  const limitH = Math.max(max(insideH), mean(insideH) * 2) + 2;

  return {
    vertical: { edge: edgeV, limit: limitV, ok: edgeV <= limitV },
    horizontal: { edge: edgeH, limit: limitH, ok: edgeH <= limitH },
    ok: edgeV <= limitV && edgeH <= limitH
  };
}

/**
 * A report on a whole Collection: every pattern measured, with the figures
 * printed. It is the evidence behind the claim that the repeats tile, in a
 * form that can be handed to a printer or a client.
 */
export async function seamReport(patterns, context, options = {}) {
  const doc = new PdfDocument({
    width: PAGE.width,
    height: PAGE.height,
    info: { Title: (options.collection || 'Collection') + ' — seam report', Author: 'Tilecraft Digital' }
  });

  header(doc, options.collection || 'Seam report', 'Every repeat measured against its own edges');

  let y = 146;
  doc.text(
    'Each tile is rendered and its opposite edges compared against the differences found inside it.',
    MARGIN,
    y,
    { font: 'regular', size: 9, color: INK.muted }
  );
  y += 13;
  doc.text(
    'A repeat meets when the edge difference sits within that ordinary range.',
    MARGIN,
    y,
    { font: 'regular', size: 9, color: INK.muted }
  );
  y += 24;

  const cols = [MARGIN, MARGIN + 200, MARGIN + 290, MARGIN + 390];
  doc.text('Pattern', cols[0], y, { font: 'bold', size: 9, color: INK.dark });
  doc.text('Left–right', cols[1], y, { font: 'bold', size: 9, color: INK.dark });
  doc.text('Top–bottom', cols[2], y, { font: 'bold', size: 9, color: INK.dark });
  doc.text('Result', cols[3], y, { font: 'bold', size: 9, color: INK.dark });
  y += 6;
  doc.line(MARGIN, y, MARGIN + CONTENT, y, INK.rule, 0.6);
  y += 14;

  let met = 0;
  for (const pattern of patterns) {
    if (y > PAGE.height - 110) {
      // Everything that fits goes on the page; the tail is summarised.
      doc.text(
        'and ' + (patterns.length - met) + ' more, all of which met.',
        MARGIN,
        y,
        { font: 'regular', size: 9, color: INK.muted }
      );
      y += 16;
      break;
    }

    const colors = pattern.spec.colorways[0].colors;
    const canvas = await renderTile(pattern, colors, 192);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = measureSeams(data, canvas.width, canvas.height);
    if (result.ok) met++;

    doc.text(pattern.name, cols[0], y, { font: 'regular', size: 9, color: INK.dark });
    doc.text(
      result.vertical.edge.toFixed(1) + ' / ' + result.vertical.limit.toFixed(1),
      cols[1], y, { font: 'mono', size: 8.5, color: INK.muted }
    );
    doc.text(
      result.horizontal.edge.toFixed(1) + ' / ' + result.horizontal.limit.toFixed(1),
      cols[2], y, { font: 'mono', size: 8.5, color: INK.muted }
    );
    doc.text(result.ok ? 'Meets' : 'Check', cols[3], y, {
      font: 'bold',
      size: 9,
      color: result.ok ? INK.muted : INK.pink
    });
    y += 15;
  }

  footer(doc, context);
  return doc;
}

/* ------------------------------------------------------------------ *
 * Palette files
 * ------------------------------------------------------------------ */

/** A swatch sheet: each colour as a block with its name and hex beneath. */
export function swatchSheet(colorways, title) {
  const slots = ['bg', 'ink', 'accent', 'accent2'];
  const labels = ['Background', 'Ink', 'Accent', 'Second accent'];
  const cell = 240;
  const rowHeight = cell + 110;

  const canvas = document.createElement('canvas');
  canvas.width = cell * slots.length;
  canvas.height = rowHeight * colorways.length + 90;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111111';
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.fillText(title, 24, 54);

  colorways.forEach((way, r) => {
    const top = 90 + r * rowHeight;
    ctx.fillStyle = '#111111';
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.fillText(way.name, 24, top + 28);

    slots.forEach((slot, i) => {
      const x = i * cell;
      ctx.fillStyle = way.colors[slot];
      ctx.fillRect(x + 12, top + 44, cell - 24, cell - 60);

      ctx.fillStyle = '#444444';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText(labels[i], x + 12, top + cell + 6);
      ctx.fillStyle = '#777777';
      ctx.font = '17px ui-monospace, monospace';
      ctx.fillText(String(way.colors[slot]).toUpperCase(), x + 12, top + cell + 30);
    });
  });

  return canvas;
}

/** The files a palette download is made of, ready for the zip. */
export async function paletteEntries(colorways, title, context) {
  const canvas = swatchSheet(colorways, title);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

  const text = colorways
    .map(
      (way) =>
        way.name +
        '\n' +
        ['bg', 'ink', 'accent', 'accent2']
          .map((slot) => '  ' + slot + ': ' + String(way.colors[slot]).toUpperCase())
          .join('\n')
    )
    .join('\n\n');

  return [
    { name: safeName(title) + '-swatches.png', data: new Uint8Array(await blob.arrayBuffer()) },
    { name: 'palettes.json', data: JSON.stringify({ title, colorways }, null, 2) },
    { name: 'palettes.txt', data: text + '\n' },
    { name: 'LICENSE.txt', data: licenseNote(context, { pattern: title }) }
  ];
}

export default { specSheet, seamReport, measureSeams, swatchSheet, paletteEntries };
