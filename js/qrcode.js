/*
 * Tilecraft Digital — QR Code encoder
 *
 * A self-contained QR Code encoder, written for this site so that the
 * License Certificate can be produced without loading anything from another
 * server. It implements byte-mode encoding for model-2 QR Codes, versions 1
 * to 40, at all four error correction levels, with the full mask-penalty
 * evaluation from the specification.
 *
 * Licensed under the MIT License.
 *
 * Copyright (c) 2026 Tilecraft Digital
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 * The numeric tables below are the capacity and error-correction tables
 * defined by the QR Code specification.
 */

/** Error correction levels, with their format-information bit patterns. */
export const ECC = {
  LOW: { name: 'LOW', ordinal: 0, formatBits: 1 },
  MEDIUM: { name: 'MEDIUM', ordinal: 1, formatBits: 0 },
  QUARTILE: { name: 'QUARTILE', ordinal: 2, formatBits: 3 },
  HIGH: { name: 'HIGH', ordinal: 3, formatBits: 2 }
};

const MIN_VERSION = 1;
const MAX_VERSION = 40;
const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

// Error correction codewords per block, indexed [ecl ordinal][version].
const ECC_CODEWORDS_PER_BLOCK = [
  // L
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  // M
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  // Q
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  // H
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
];

// Number of error correction blocks, indexed [ecl ordinal][version].
const NUM_ERROR_CORRECTION_BLOCKS = [
  // L
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  // M
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  // Q
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  // H
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
];

/* ------------------------------------------------------------------ *
 * Capacity
 * ------------------------------------------------------------------ */

/** Total modules in a version that can carry data or error correction. */
export function numRawDataModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

/** Data codewords available at a version and error correction level. */
export function numDataCodewords(version, ecl) {
  return (
    Math.floor(numRawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][version] * NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][version]
  );
}

/** Bits needed to hold a byte-mode character count at this version. */
function charCountBits(version) {
  return version <= 9 ? 8 : 16;
}

/* ------------------------------------------------------------------ *
 * Reed-Solomon over GF(256) with primitive polynomial x^8+x^4+x^3+x^2+1
 * ------------------------------------------------------------------ */

function gfMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

/** Divisor polynomial for a given number of error correction codewords. */
function reedSolomonDivisor(degree) {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

/** The remainder of data divided by the divisor: the EC codewords. */
function reedSolomonRemainder(data, divisor) {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= gfMultiply(divisor[i], factor);
    }
  }
  return result;
}

/* ------------------------------------------------------------------ *
 * Bit buffer
 * ------------------------------------------------------------------ */

class BitBuffer {
  constructor() {
    this.bits = [];
  }
  append(value, length) {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((value >>> i) & 1);
    }
  }
  get length() {
    return this.bits.length;
  }
}

/* ------------------------------------------------------------------ *
 * Encoding
 * ------------------------------------------------------------------ */

/** UTF-8 bytes for a string. */
export function toUtf8(text) {
  if (typeof TextEncoder === 'function') return Array.from(new TextEncoder().encode(text));
  const out = [];
  for (const ch of String(text)) {
    let cp = ch.codePointAt(0);
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return out;
}

function buildCodewords(bytes, version, ecl) {
  const capacityBits = numDataCodewords(version, ecl) * 8;
  const bb = new BitBuffer();
  bb.append(0b0100, 4); // byte mode indicator
  bb.append(bytes.length, charCountBits(version));
  for (const b of bytes) bb.append(b, 8);

  if (bb.length > capacityBits) return null;

  // Terminator, then pad to a whole byte, then alternating pad bytes.
  bb.append(0, Math.min(4, capacityBits - bb.length));
  bb.append(0, (8 - (bb.length % 8)) % 8);
  for (let pad = 0xec; bb.length < capacityBits; pad ^= 0xec ^ 0x11) {
    bb.append(pad, 8);
  }

  const data = new Uint8Array(bb.length / 8);
  bb.bits.forEach((bit, i) => {
    data[i >>> 3] |= bit << (7 - (i & 7));
  });
  return data;
}

/** Split data into blocks, add EC codewords, and interleave the result. */
function addEccAndInterleave(data, version, ecl) {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][version];
  const rawCodewords = Math.floor(numRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks = [];
  const divisor = reedSolomonDivisor(blockEccLen);
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dataLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = Array.from(data.slice(k, k + dataLen));
    k += dataLen;
    const ecc = Array.from(reedSolomonRemainder(dat, divisor));
    // Short blocks get a placeholder byte so that every block is the same
    // length for interleaving. That byte is dropped again below, which is
    // what keeps a short block's error correction codewords intact.
    if (i < numShortBlocks) dat.push(0);
    blocks.push(dat.concat(ecc));
  }

  const result = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      // Skip the placeholder byte that was added to the short blocks.
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
        result.push(block[i]);
      }
    });
  }
  return result;
}

/* ------------------------------------------------------------------ *
 * The symbol
 * ------------------------------------------------------------------ */

export class QrCode {
  constructor(version, ecl, modules, isFunction, mask) {
    this.version = version;
    this.ecl = ecl;
    this.size = version * 4 + 17;
    this.modules = modules;
    this.isFunction = isFunction;
    this.mask = mask;
  }

  /** True when the module at (x, y) is dark. Outside the symbol is light. */
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return false;
    return this.modules[y][x];
  }
}

function alignmentPatternPositions(version) {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = version * 4 + 10; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

function makeGrid(size, value) {
  const rows = [];
  for (let i = 0; i < size; i++) rows.push(new Array(size).fill(value));
  return rows;
}

function setFunctionModule(modules, isFunction, x, y, dark) {
  modules[y][x] = dark;
  isFunction[y][x] = true;
}

function drawFinderPattern(modules, isFunction, size, cx, cy) {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) {
        setFunctionModule(modules, isFunction, x, y, dist !== 2 && dist !== 4);
      }
    }
  }
}

function drawAlignmentPattern(modules, isFunction, cx, cy) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      setFunctionModule(modules, isFunction, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function drawFormatBits(modules, isFunction, size, ecl, mask) {
  const data = (ecl.formatBits << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  const bit = (i) => ((bits >>> i) & 1) !== 0;

  // Top-left copy.
  for (let i = 0; i <= 5; i++) setFunctionModule(modules, isFunction, 8, i, bit(i));
  setFunctionModule(modules, isFunction, 8, 7, bit(6));
  setFunctionModule(modules, isFunction, 8, 8, bit(7));
  setFunctionModule(modules, isFunction, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) setFunctionModule(modules, isFunction, 14 - i, 8, bit(i));

  // Second copy, split across the other two finder corners.
  for (let i = 0; i < 8; i++) setFunctionModule(modules, isFunction, size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) setFunctionModule(modules, isFunction, 8, size - 15 + i, bit(i));

  // The always-dark module beside the lower-left format block.
  setFunctionModule(modules, isFunction, 8, size - 8, true);
}

function drawVersionBits(modules, isFunction, size, version) {
  if (version < 7) return;
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i++) {
    const bit = ((bits >>> i) & 1) !== 0;
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFunctionModule(modules, isFunction, a, b, bit);
    setFunctionModule(modules, isFunction, b, a, bit);
  }
}

function drawFunctionPatterns(modules, isFunction, size, version, ecl, mask) {
  // Timing patterns.
  for (let i = 0; i < size; i++) {
    setFunctionModule(modules, isFunction, 6, i, i % 2 === 0);
    setFunctionModule(modules, isFunction, i, 6, i % 2 === 0);
  }

  // Finder patterns with their separators.
  drawFinderPattern(modules, isFunction, size, 3, 3);
  drawFinderPattern(modules, isFunction, size, size - 4, 3);
  drawFinderPattern(modules, isFunction, size, 3, size - 4);

  // Alignment patterns, skipping the three finder corners.
  const positions = alignmentPatternPositions(version);
  const n = positions.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const corner = (i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0);
      if (!corner) drawAlignmentPattern(modules, isFunction, positions[i], positions[j]);
    }
  }

  drawFormatBits(modules, isFunction, size, ecl, mask);
  drawVersionBits(modules, isFunction, size, version);
}

/** Lay the codewords into the symbol along its zigzag path. */
function drawCodewords(modules, isFunction, size, codewords) {
  let i = 0; // bit index
  for (let right = size - 1; right >= 1; right -= 2) {
    // Step the pair of columns left past the vertical timing column, so that
    // column 6 is never visited and column 5 pairs with column 4 instead.
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && i < codewords.length * 8) {
          modules[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
        // Remaining modules past the data stay light, as the spec requires.
      }
    }
  }
}

function maskBit(mask, x, y) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7: return ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0;
    default: throw new Error('bad mask ' + mask);
  }
}

function applyMask(modules, isFunction, size, mask) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isFunction[y][x] && maskBit(mask, x, y)) modules[y][x] = !modules[y][x];
    }
  }
}

/** The specification's penalty score for a masked symbol. */
function penaltyScore(modules, size) {
  let result = 0;

  // A rolling record of the last seven run lengths along the line being
  // scanned. Rule 3 looks for a 1:1:3:1:1 run ratio with a wide light run on
  // one side of it, which is the finder pattern's own signature.
  const addHistory = (runLength, history) => {
    if (history[0] === 0) runLength += size; // stands in for the light margin
    history.pop();
    history.unshift(runLength);
  };

  const countFinderPatterns = (history) => {
    const n = history[1];
    const core =
      n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n;
    return (
      (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) +
      (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0)
    );
  };

  const terminateAndCount = (runColor, runLength, history) => {
    let len = runLength;
    if (runColor) {
      addHistory(len, history);
      len = 0;
    }
    addHistory(len + size, history);
    return countFinderPatterns(history);
  };

  // Rules 1 and 3, row by row and then column by column.
  const scanLine = (get) => {
    let score = 0;
    let runColor = false;
    let runLength = 0;
    const history = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < size; i++) {
      const color = get(i);
      if (color === runColor) {
        runLength++;
        if (runLength === 5) score += PENALTY_N1;
        else if (runLength > 5) score++;
      } else {
        addHistory(runLength, history);
        if (!runColor) score += countFinderPatterns(history) * PENALTY_N3;
        runColor = color;
        runLength = 1;
      }
    }
    score += terminateAndCount(runColor, runLength, history) * PENALTY_N3;
    return score;
  };

  for (let y = 0; y < size; y++) result += scanLine((x) => modules[y][x]);
  for (let x = 0; x < size; x++) result += scanLine((y) => modules[y][x]);

  // Rule 2: 2x2 blocks of a single shade.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
        result += PENALTY_N2;
      }
    }
  }

  // Rule 4: imbalance between dark and light modules.
  let dark = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules[y][x]) dark++;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  result += Math.max(k, 0) * PENALTY_N4;

  return result;
}

/**
 * Encode text as a QR Code.
 *
 * @param {string} text the content
 * @param {object} [options]
 * @param {object} [options.ecl] an ECC level; defaults to MEDIUM
 * @param {number} [options.mask] force a mask 0-7; omit to pick the best
 * @returns {QrCode}
 */
export function encodeText(text, options = {}) {
  const ecl = options.ecl || ECC.MEDIUM;
  const bytes = toUtf8(String(text));

  let version = 0;
  let data = null;
  for (let v = MIN_VERSION; v <= MAX_VERSION; v++) {
    const attempt = buildCodewords(bytes, v, ecl);
    if (attempt) {
      version = v;
      data = attempt;
      break;
    }
  }
  if (!data) throw new Error('QR encode: content is too long for any version');

  const codewords = addEccAndInterleave(data, version, ecl);
  const size = version * 4 + 17;

  let best = null;
  const forced = typeof options.mask === 'number' ? [options.mask] : [0, 1, 2, 3, 4, 5, 6, 7];
  for (const mask of forced) {
    const modules = makeGrid(size, false);
    const isFunction = makeGrid(size, false);
    drawFunctionPatterns(modules, isFunction, size, version, ecl, 0);
    drawCodewords(modules, isFunction, size, codewords);
    // Format bits depend on the mask, so they are redrawn for each candidate.
    drawFormatBits(modules, isFunction, size, ecl, mask);
    applyMask(modules, isFunction, size, mask);
    const score = penaltyScore(modules, size);
    if (!best || score < best.score) best = { score, modules, isFunction, mask };
  }

  return new QrCode(version, ecl, best.modules, best.isFunction, best.mask);
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

/**
 * An SVG path string covering every dark module, in module units.
 * Pair it with a viewBox that allows for the quiet zone.
 */
export function toSvgPath(qr, border = 4) {
  const parts = [];
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.get(x, y)) parts.push('M' + (x + border) + ',' + (y + border) + 'h1v1h-1z');
    }
  }
  return parts.join('');
}

/** A complete, standalone SVG document for a QR Code. */
export function toSvg(qr, options = {}) {
  const border = options.border == null ? 4 : options.border;
  const dark = options.dark || '#000000';
  const light = options.light || '#ffffff';
  const dim = qr.size + border * 2;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim + '" shape-rendering="crispEdges">' +
    '<rect width="100%" height="100%" fill="' + light + '"/>' +
    '<path d="' + toSvgPath(qr, border) + '" fill="' + dark + '"/>' +
    '</svg>'
  );
}

/**
 * Collapse each row of dark modules into runs, which keeps generated PDFs
 * and canvas draws to a fraction of the rectangles a per-module loop needs.
 */
export function toRuns(qr) {
  const runs = [];
  for (let y = 0; y < qr.size; y++) {
    let x = 0;
    while (x < qr.size) {
      if (!qr.get(x, y)) {
        x++;
        continue;
      }
      let end = x;
      while (end < qr.size && qr.get(end, y)) end++;
      runs.push({ x, y, width: end - x, height: 1 });
      x = end;
    }
  }
  return runs;
}

/** Draw a QR Code into a 2D canvas context, fitted to a square box. */
export function drawToCanvas(qr, ctx, x, y, size, options = {}) {
  const border = options.border == null ? 4 : options.border;
  const dim = qr.size + border * 2;
  const scale = size / dim;
  ctx.save();
  ctx.fillStyle = options.light || '#ffffff';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = options.dark || '#000000';
  for (const run of toRuns(qr)) {
    ctx.fillRect(
      x + (run.x + border) * scale,
      y + (run.y + border) * scale,
      run.width * scale + 0.02,
      scale + 0.02
    );
  }
  ctx.restore();
}

export default { ECC, encodeText, toSvg, toSvgPath, toRuns, drawToCanvas, numDataCodewords, numRawDataModules, toUtf8, QrCode };
