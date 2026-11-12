/*
 * Tilecraft Digital — a small PDF writer
 *
 * Builds single-page PDF documents in the browser with no external library.
 * It covers what the License Certificate needs: filled rectangles, rules,
 * text in the standard PDF typefaces, word wrapping, alignment, and clickable
 * link areas.
 *
 * Only the fourteen typefaces every PDF reader already carries are used, so
 * nothing has to be embedded and the files stay small.
 *
 * Coordinates are given from the top-left corner, in points, because that is
 * easier to lay a page out in. They are converted to the PDF coordinate
 * system, which runs from the bottom-left, when the page is written.
 */

/* Glyph widths in 1/1000 em for the typefaces used here, ASCII 32 to 126.
 * These are the standard metrics for these faces. Characters outside the
 * range fall back to the average width, which only affects measurement. */
const WIDTHS_HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584
];

const WIDTHS_HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584
];

/** The fonts this writer exposes, with their PDF resource names. */
const FONTS = {
  regular: { resource: 'F1', baseFont: 'Helvetica', widths: WIDTHS_HELVETICA, fallback: 556 },
  bold: { resource: 'F2', baseFont: 'Helvetica-Bold', widths: WIDTHS_HELVETICA_BOLD, fallback: 611 },
  mono: { resource: 'F3', baseFont: 'Courier', widths: null, fallback: 600 },
  monoBold: { resource: 'F4', baseFont: 'Courier-Bold', widths: null, fallback: 600 }
};

/** Width of a string in points, for a font at a size. */
export function measureText(text, font = 'regular', size = 12, letterSpacing = 0) {
  const spec = FONTS[font] || FONTS.regular;
  let total = 0;
  const str = String(text);
  for (const ch of str) {
    const code = ch.codePointAt(0);
    let width = spec.fallback;
    if (spec.widths && code >= 32 && code <= 126) width = spec.widths[code - 32];
    else if (!spec.widths) width = spec.fallback;
    total += width;
  }
  return (total / 1000) * size + Math.max(0, str.length - 1) * letterSpacing;
}

/**
 * Break text into lines that fit a width. Existing newlines are kept. A
 * single word too long to fit on its own — a URL, most often, which has no
 * spaces to break at — is split across lines character by character rather
 * than being allowed to run past the edge of the page.
 */
export function wrapText(text, font, size, maxWidth, letterSpacing = 0) {
  const fits = (s) => measureText(s, font, size, letterSpacing) <= maxWidth;

  const splitLongWord = (word) => {
    const pieces = [];
    let piece = '';
    for (const ch of word) {
      if (piece && !fits(piece + ch)) {
        pieces.push(piece);
        piece = ch;
      } else {
        piece += ch;
      }
    }
    if (piece) pieces.push(piece);
    return pieces;
  };

  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    const words = paragraph.split(/\s+/).filter((w) => w.length);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? line + ' ' + word : word;
      if (fits(candidate)) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (fits(word)) {
        line = word;
      } else {
        const pieces = splitLongWord(word);
        for (let i = 0; i < pieces.length - 1; i++) lines.push(pieces[i]);
        line = pieces[pieces.length - 1] || '';
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/* WinAnsi replacements for the handful of typographic characters that are
 * likely to reach a PDF from web copy. Anything else outside Latin-1 becomes
 * a question mark rather than silently corrupting the file. */
const WINANSI_EXTRA = {
  '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94,
  '–': 0x96, '—': 0x97, '•': 0x95, '…': 0x85,
  '™': 0x99, '€': 0x80, ' ': 0x20
};

/** Escape a string into a PDF literal string using WinAnsiEncoding. */
function pdfString(text) {
  let out = '';
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    let byte;
    if (code === 0x28 || code === 0x29 || code === 0x5c) {
      out += '\\' + ch;
      continue;
    }
    if (code >= 32 && code <= 126) byte = code;
    else if (WINANSI_EXTRA[ch] != null) byte = WINANSI_EXTRA[ch];
    else if (code >= 0xa0 && code <= 0xff) byte = code;
    else byte = 0x3f; // "?"
    out += byte < 32 || byte > 126 ? '\\' + byte.toString(8).padStart(3, '0') : String.fromCharCode(byte);
  }
  return '(' + out + ')';
}

function num(n) {
  return (Math.round(n * 1000) / 1000).toString();
}

function colorOp(color, stroke) {
  const [r, g, b] = color;
  return [num(r), num(g), num(b), stroke ? 'RG' : 'rg'].join(' ');
}

/** A single-page PDF document. */
export class PdfDocument {
  /**
   * @param {object} [options]
   * @param {number} [options.width] page width in points, default US Letter
   * @param {number} [options.height] page height in points
   * @param {object} [options.info] Title, Author, Subject, Keywords
   */
  constructor(options = {}) {
    this.width = options.width || 612;
    this.height = options.height || 792;
    this.info = options.info || {};
    this.ops = [];
    this.links = [];
  }

  /** Convert a top-left y to the PDF bottom-left system. */
  flip(y) {
    return this.height - y;
  }

  /** Filled rectangle. x and y are the top-left corner. */
  rect(x, y, w, h, color = [0, 0, 0]) {
    this.ops.push(colorOp(color, false));
    this.ops.push([num(x), num(this.flip(y + h)), num(w), num(h), 're', 'f'].join(' '));
    return this;
  }

  /** Rectangle outline. */
  strokeRect(x, y, w, h, color = [0, 0, 0], lineWidth = 1) {
    this.ops.push(colorOp(color, true));
    this.ops.push(num(lineWidth) + ' w');
    this.ops.push([num(x), num(this.flip(y + h)), num(w), num(h), 're', 'S'].join(' '));
    return this;
  }

  /** Straight line. */
  line(x1, y1, x2, y2, color = [0, 0, 0], lineWidth = 1) {
    this.ops.push(colorOp(color, true));
    this.ops.push(num(lineWidth) + ' w');
    this.ops.push([num(x1), num(this.flip(y1)), 'm', num(x2), num(this.flip(y2)), 'l', 'S'].join(' '));
    return this;
  }

  /** Filled circle, drawn with four Bezier curves. */
  circle(cx, cy, r, color = [0, 0, 0]) {
    const k = 0.5523 * r;
    const y = this.flip(cy);
    this.ops.push(colorOp(color, false));
    this.ops.push(
      [
        num(cx - r), num(y), 'm',
        num(cx - r), num(y + k), num(cx - k), num(y + r), num(cx), num(y + r), 'c',
        num(cx + k), num(y + r), num(cx + r), num(y + k), num(cx + r), num(y), 'c',
        num(cx + r), num(y - k), num(cx + k), num(y - r), num(cx), num(y - r), 'c',
        num(cx - k), num(y - r), num(cx - r), num(y - k), num(cx - r), num(y), 'c',
        'f'
      ].join(' ')
    );
    return this;
  }

  /**
   * Draw a single line of text.
   *
   * @param {string} text
   * @param {number} x left edge, or the anchor when aligned
   * @param {number} y the text baseline, measured from the top of the page
   * @param {object} [options] font, size, color, align, letterSpacing
   * @returns {number} the width of the text drawn
   */
  text(text, x, y, options = {}) {
    const font = FONTS[options.font] ? options.font : 'regular';
    const size = options.size || 12;
    const color = options.color || [0, 0, 0];
    const letterSpacing = options.letterSpacing || 0;
    const width = measureText(text, font, size, letterSpacing);
    let left = x;
    if (options.align === 'center') left = x - width / 2;
    else if (options.align === 'right') left = x - width;

    this.ops.push('BT');
    this.ops.push('/' + FONTS[font].resource + ' ' + num(size) + ' Tf');
    if (letterSpacing) this.ops.push(num(letterSpacing) + ' Tc');
    this.ops.push(colorOp(color, false));
    this.ops.push(num(left) + ' ' + num(this.flip(y)) + ' Td');
    this.ops.push(pdfString(text) + ' Tj');
    if (letterSpacing) this.ops.push('0 Tc');
    this.ops.push('ET');
    return width;
  }

  /**
   * Draw wrapped text in a column.
   * @returns {number} the y of the baseline after the last line drawn
   */
  paragraph(text, x, y, maxWidth, options = {}) {
    const font = FONTS[options.font] ? options.font : 'regular';
    const size = options.size || 10;
    const lineHeight = options.lineHeight || size * 1.45;
    const lines = wrapText(text, font, size, maxWidth, options.letterSpacing || 0);
    let cursor = y;
    for (const line of lines) {
      if (line) this.text(line, x, cursor, { ...options, font, size });
      cursor += lineHeight;
    }
    return cursor - lineHeight;
  }

  /** Height a paragraph will occupy, without drawing it. */
  paragraphHeight(text, font, size, maxWidth, lineHeight) {
    const lh = lineHeight || size * 1.45;
    return wrapText(text, font, size, maxWidth).length * lh;
  }

  /** A clickable area that opens a URL. */
  link(x, y, w, h, url) {
    this.links.push({ x, y: this.flip(y + h), w, h, url: String(url) });
    return this;
  }

  /**
   * Draw a QR Code produced by js/qrcode.js, fitted into a square box.
   * Rows of dark modules are drawn as single rectangles.
   */
  qr(runs, moduleCount, x, y, size, options = {}) {
    const border = options.border == null ? 2 : options.border;
    const dim = moduleCount + border * 2;
    const scale = size / dim;
    if (options.light) this.rect(x, y, size, size, options.light);
    const dark = options.dark || [0, 0, 0];
    this.ops.push(colorOp(dark, false));
    for (const run of runs) {
      const rx = x + (run.x + border) * scale;
      const ry = y + (run.y + border) * scale;
      this.ops.push(
        [num(rx), num(this.flip(ry + scale)), num(run.width * scale), num(scale), 're', 'f'].join(' ')
      );
    }
    return this;
  }

  /** Serialize the document to PDF bytes. */
  toBytes() {
    const content = this.ops.join('\n');
    const contentBytes = latin1Bytes(content);

    const objects = [];
    // Object numbering: 1 catalog, 2 pages, 3 page, 4 content stream,
    // 5 onward the fonts, then one object per link annotation, then the
    // document information dictionary.
    const firstFont = 5;
    const firstLink = firstFont + Object.keys(FONTS).length;
    const infoIndex = firstLink + this.links.length;

    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    objects[3] =
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + num(this.width) + ' ' + num(this.height) + ']' +
      ' /Resources << /Font << ' +
      Object.values(FONTS).map((f, i) => '/' + f.resource + ' ' + (firstFont + i) + ' 0 R').join(' ') +
      ' >> >> /Contents 4 0 R' +
      (this.links.length
        ? ' /Annots [' + this.links.map((_, i) => firstLink + i + ' 0 R').join(' ') + ']'
        : '') +
      ' >>';
    objects[4] = '<< /Length ' + contentBytes.length + ' >>\nstream\n' + content + '\nendstream';

    Object.values(FONTS).forEach((f, i) => {
      objects[firstFont + i] =
        '<< /Type /Font /Subtype /Type1 /BaseFont /' + f.baseFont + ' /Encoding /WinAnsiEncoding >>';
    });

    this.links.forEach((link, i) => {
      objects[firstLink + i] =
        '<< /Type /Annot /Subtype /Link /Border [0 0 0] /Rect [' +
        [num(link.x), num(link.y), num(link.x + link.w), num(link.y + link.h)].join(' ') +
        '] /A << /S /URI /URI ' + pdfString(link.url) + ' >> >>';
    });

    const infoParts = [];
    for (const [key, value] of Object.entries(this.info)) {
      if (value) infoParts.push('/' + key + ' ' + pdfString(value));
    }
    if (infoParts.length) {
      infoParts.push('/Producer ' + pdfString('Tilecraft Digital'));
      objects[infoIndex] = '<< ' + infoParts.join(' ') + ' >>';
    }

    const highest = objects.reduce((max, obj, i) => (obj ? i : max), 0);

    let out = '%PDF-1.4\n%âãÏÓ\n';
    const offsets = [];
    for (let i = 1; i <= highest; i++) {
      if (!objects[i]) {
        offsets[i] = null;
        continue;
      }
      offsets[i] = latin1Bytes(out).length;
      out += i + ' 0 obj\n' + objects[i] + '\nendobj\n';
    }

    const xrefOffset = latin1Bytes(out).length;
    out += 'xref\n0 ' + (highest + 1) + '\n';
    out += '0000000000 65535 f \n';
    for (let i = 1; i <= highest; i++) {
      out += offsets[i] == null
        ? '0000000000 65535 f \n'
        : String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    out +=
      'trailer\n<< /Size ' + (highest + 1) + ' /Root 1 0 R' +
      (infoParts.length ? ' /Info ' + infoIndex + ' 0 R' : '') +
      ' >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';

    return latin1Bytes(out);
  }

  /** The document as a Blob, ready to download. */
  toBlob() {
    return new Blob([this.toBytes()], { type: 'application/pdf' });
  }
}

/** Encode a string where each character is one byte, as PDF syntax requires. */
function latin1Bytes(text) {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

export default PdfDocument;
