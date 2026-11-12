/*
 * A minimal QR Code reader, written for the test suite only.
 *
 * It takes the module grid produced by js/qrcode.js and reads the text back
 * out of it the way a scanner would: recover the format information, rebuild
 * the function-pattern map, remove the mask, walk the zigzag to collect the
 * codewords, de-interleave the blocks, and parse the byte-mode segment.
 *
 * Nothing here is shipped to the site. Its whole purpose is to prove that the
 * encoder produces a symbol that can actually be read back.
 */

const ECC_CODEWORDS_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
];

const NUM_EC_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
];

// Format-information two-bit code to the error correction ordinal used above.
const ORDINAL_FOR_FORMAT_BITS = { 1: 0, 0: 1, 3: 2, 2: 3 };

function numRawDataModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function alignmentPatternPositions(version) {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = version * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

/** Rebuild the map of modules that carry structure rather than data. */
function functionMap(version) {
  const size = version * 4 + 17;
  const fn = [];
  for (let i = 0; i < size; i++) fn.push(new Array(size).fill(false));
  const mark = (x, y) => {
    if (x >= 0 && y >= 0 && x < size && y < size) fn[y][x] = true;
  };

  for (let i = 0; i < size; i++) {
    mark(6, i);
    mark(i, 6);
  }
  for (const center of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) mark(center[0] + dx, center[1] + dy);
    }
  }
  const pos = alignmentPatternPositions(version);
  for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < pos.length; j++) {
      const corner =
        (i === 0 && j === 0) ||
        (i === 0 && j === pos.length - 1) ||
        (i === pos.length - 1 && j === 0);
      if (corner) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) mark(pos[i] + dx, pos[j] + dy);
      }
    }
  }
  for (let i = 0; i <= 8; i++) {
    mark(8, i);
    mark(i, 8);
  }
  for (let i = 0; i < 8; i++) {
    mark(size - 1 - i, 8);
    mark(8, size - 1 - i);
  }
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      mark(a, b);
      mark(b, a);
    }
  }
  return fn;
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
    default: throw new Error('bad mask');
  }
}

/** Read the 15 format bits from the top-left copy and check their BCH code. */
function readFormat(qr) {
  const bits = [];
  for (let i = 0; i <= 5; i++) bits[i] = qr.get(8, i);
  bits[6] = qr.get(8, 7);
  bits[7] = qr.get(8, 8);
  bits[8] = qr.get(7, 8);
  for (let i = 9; i < 15; i++) bits[i] = qr.get(14 - i, 8);

  let raw = 0;
  for (let i = 14; i >= 0; i--) raw = (raw << 1) | (bits[i] ? 1 : 0);
  const unmasked = raw ^ 0x5412;
  const data = (unmasked >>> 10) & 0x1f;

  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  if (((data << 10) | rem) !== unmasked) {
    throw new Error('format information failed its BCH check');
  }

  return { formatBits: (data >>> 3) & 3, mask: data & 7 };
}

/** The second format copy, split across the other two finder corners. */
export function readSecondFormatCopy(qr) {
  const size = qr.size;
  const bits = [];
  for (let i = 0; i < 8; i++) bits[i] = qr.get(size - 1 - i, 8);
  for (let i = 8; i < 15; i++) bits[i] = qr.get(8, size - 15 + i);
  let raw = 0;
  for (let i = 14; i >= 0; i--) raw = (raw << 1) | (bits[i] ? 1 : 0);
  const unmasked = raw ^ 0x5412;
  const data = (unmasked >>> 10) & 0x1f;
  return { formatBits: (data >>> 3) & 3, mask: data & 7, raw };
}

/** Read the 18 version bits, for symbols at version 7 and above. */
export function readVersionBits(qr) {
  const size = qr.size;
  let bits = 0;
  for (let i = 17; i >= 0; i--) {
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    bits = (bits << 1) | (qr.get(a, b) ? 1 : 0);
  }
  const version = (bits >>> 12) & 0x3f;
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const ok = ((version << 12) | rem) === bits;
  return { version, ok, bits };
}

function gfMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

/**
 * True when every Reed-Solomon syndrome of a codeword block is zero, which
 * is the defining property of a valid, uncorrupted RS codeword.
 */
export function syndromesAreZero(block, eccLen) {
  let root = 1;
  for (let i = 0; i < eccLen; i++) {
    let sum = 0;
    let power = 1;
    for (let j = block.length - 1; j >= 0; j--) {
      sum ^= gfMultiply(block[j], power);
      power = gfMultiply(power, root);
    }
    if (sum !== 0) return false;
    root = gfMultiply(root, 0x02);
  }
  return true;
}

/**
 * Read a QrCode object produced by js/qrcode.js back to text.
 *
 * @returns {{text: string, version: number, mask: number, formatBits: number,
 *            blocks: number[][], eccLen: number, bytes: number[]}}
 */
export function decode(qr) {
  const size = qr.size;
  if ((size - 17) % 4 !== 0) throw new Error('bad symbol size ' + size);
  const version = (size - 17) / 4;
  const format = readFormat(qr);
  const ordinal = ORDINAL_FOR_FORMAT_BITS[format.formatBits];
  const fn = functionMap(version);

  const grid = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      let value = qr.get(x, y);
      if (!fn[y][x] && maskBit(format.mask, x, y)) value = !value;
      row.push(value);
    }
    grid.push(row);
  }

  const rawCodewords = Math.floor(numRawDataModules(version) / 8);
  const bits = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fn[y][x] && bits.length < rawCodewords * 8) bits.push(grid[y][x] ? 1 : 0);
      }
    }
  }

  const interleaved = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    interleaved.push(byte);
  }

  const numBlocks = NUM_EC_BLOCKS[ordinal][version];
  const eccLen = ECC_CODEWORDS_PER_BLOCK[ordinal][version];
  const numShort = numBlocks - (rawCodewords % numBlocks);
  const shortLen = Math.floor(rawCodewords / numBlocks);
  const shortDataLen = shortLen - eccLen;

  // Every block occupies shortLen + 1 interleaving columns. Short blocks have
  // nothing in the column that long blocks use for their extra data codeword.
  const padded = [];
  for (let i = 0; i < numBlocks; i++) padded.push(new Array(shortLen + 1).fill(null));

  let k = 0;
  for (let i = 0; i < shortLen + 1; i++) {
    for (let j = 0; j < numBlocks; j++) {
      if (i === shortDataLen && j < numShort) continue;
      padded[j][i] = interleaved[k++];
    }
  }

  // Drop the empty column to recover each block's real codeword sequence.
  const blocks = padded.map((block) => block.filter((b) => b !== null));

  const data = [];
  for (let j = 0; j < numBlocks; j++) {
    const dataLen = shortDataLen + (j < numShort ? 0 : 1);
    for (let i = 0; i < dataLen; i++) data.push(blocks[j][i]);
  }

  const stream = [];
  for (const byte of data) for (let i = 7; i >= 0; i--) stream.push((byte >>> i) & 1);

  let p = 0;
  const take = (n) => {
    let value = 0;
    for (let i = 0; i < n; i++) value = (value << 1) | stream[p++];
    return value;
  };

  const mode = take(4);
  if (mode !== 0b0100) throw new Error('expected byte mode, got 0b' + mode.toString(2));
  const count = take(version <= 9 ? 8 : 16);
  const bytes = [];
  for (let i = 0; i < count; i++) bytes.push(take(8));
  const text = new TextDecoder().decode(new Uint8Array(bytes));

  return { text, version, mask: format.mask, formatBits: format.formatBits, blocks, eccLen, bytes };
}
