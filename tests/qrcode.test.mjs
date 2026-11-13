/*
 * The QR encoder.
 *
 * Every symbol is read back with the reader in tests/helpers/qr-decode.mjs,
 * which proves the encoder produces something a scanner could actually read,
 * rather than merely something that looks like a QR code.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { ECC, encodeText, toSvg, toRuns, numDataCodewords } from '../js/qrcode.js';
import { decode, syndromesAreZero, readSecondFormatCopy, readVersionBits } from './helpers/qr-decode.mjs';
import { generateCode, activationUrl } from '../js/license.js';
import { PRODUCTS } from '../js/products.js';
import { SITE } from '../js/site-config.js';

const LEVELS = Object.entries(ECC);

/* ------------------------------------------------------------------ *
 * Round trips
 * ------------------------------------------------------------------ */

test('short, medium, and long content survives a round trip at every level', () => {
  const samples = [
    'A',
    'hello world',
    SITE.origin + '/',
    'x'.repeat(100),
    'y'.repeat(400),
    'z'.repeat(1100)
  ];

  for (const text of samples) {
    for (const [name, ecl] of LEVELS) {
      const qr = encodeText(text, { ecl });
      assert.equal(decode(qr).text, text, 'failed at ' + name + ' with ' + text.length + ' chars');
    }
  }
});

test('non-ASCII content survives a round trip', () => {
  const samples = ['café über', '中文測試', 'emoji \u{1F3A8}\u{1F9F5}', '© 2026 — Tilecraft'];
  for (const text of samples) {
    assert.equal(decode(encodeText(text)).text, text);
  }
});

test('every mask produces a readable symbol', () => {
  const text = SITE.origin + '/studio/';
  for (let mask = 0; mask < 8; mask++) {
    const qr = encodeText(text, { mask });
    assert.equal(qr.mask, mask);
    const read = decode(qr);
    assert.equal(read.text, text);
    assert.equal(read.mask, mask);
  }
});

test('the mask chosen automatically is one of the eight', () => {
  const qr = encodeText(SITE.origin + '/studio/#activate=TILE-GMTR-K7N4PXBM-WC');
  assert.ok(qr.mask >= 0 && qr.mask <= 7);
});

/* ------------------------------------------------------------------ *
 * Structure
 * ------------------------------------------------------------------ */

test('the error correction codewords are mathematically valid', () => {
  for (const text of ['A', 'x'.repeat(60), 'y'.repeat(500)]) {
    for (const [name, ecl] of LEVELS) {
      const read = decode(encodeText(text, { ecl }));
      for (const [index, block] of read.blocks.entries()) {
        assert.ok(
          syndromesAreZero(block, read.eccLen),
          'block ' + index + ' at ' + name + ' is not a valid Reed-Solomon codeword'
        );
      }
    }
  }
});

test('both copies of the format information agree', () => {
  for (const [, ecl] of LEVELS) {
    const qr = encodeText(SITE.origin + '/', { ecl });
    const second = readSecondFormatCopy(qr);
    assert.equal(second.mask, qr.mask);
    assert.equal(second.formatBits, ecl.formatBits);
  }
});

test('the format bits match the values in the specification', () => {
  // Published format strings for mask 0: level M is 101010000010010 and
  // level L is 111011111000100.
  const expected = {
    MEDIUM: 0b101010000010010,
    LOW: 0b111011111000100
  };

  for (const [name, bits] of Object.entries(expected)) {
    const qr = encodeText('A', { ecl: ECC[name], mask: 0 });
    assert.equal(readSecondFormatCopy(qr).raw, bits, name + ' format bits are wrong');
  }
});

test('version information is written and checks out from version 7 up', () => {
  const qr = encodeText('v'.repeat(200)); // comfortably past version 7
  assert.ok(qr.version >= 7, 'expected a large version, got ' + qr.version);
  const read = readVersionBits(qr);
  assert.ok(read.ok, 'version information failed its BCH check');
  assert.equal(read.version, qr.version);
});

test('the symbol is the size its version implies, and has three finder patterns', () => {
  const qr = encodeText(SITE.origin + '/studio/');
  assert.equal(qr.size, qr.version * 4 + 17);

  const corners = [
    [0, 0],
    [qr.size - 7, 0],
    [0, qr.size - 7]
  ];

  for (const [ox, oy] of corners) {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
        assert.equal(qr.get(ox + x, oy + y), ring !== 2, 'finder pattern wrong at ' + ox + ',' + oy);
      }
    }
  }
});

test('the smallest version that fits is chosen', () => {
  for (const [, ecl] of LEVELS) {
    const qr = encodeText('a'.repeat(40), { ecl });
    if (qr.version === 1) continue;
    const capacityBelow = numDataCodewords(qr.version - 1, ecl);
    // Four bits of mode, eight or sixteen of length, then the bytes.
    const needed = Math.ceil((4 + (qr.version - 1 <= 9 ? 8 : 16) + 40 * 8) / 8);
    assert.ok(needed > capacityBelow, 'version ' + (qr.version - 1) + ' would have fitted');
  }
});

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

test('the SVG output is a complete document covering every dark module', () => {
  const qr = encodeText(SITE.origin + '/');
  const svg = toSvg(qr);

  assert.ok(svg.startsWith('<svg '));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));

  const border = 4;
  const dimension = qr.size + border * 2;
  assert.ok(svg.includes('viewBox="0 0 ' + dimension + ' ' + dimension + '"'));

  let dark = 0;
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.get(x, y)) dark++;
  assert.equal((svg.match(/h1v1h-1z/g) || []).length, dark);
});

test('run-length output covers exactly the dark modules', () => {
  const qr = encodeText(SITE.origin + '/studio/');
  const runs = toRuns(qr);

  const painted = new Set();
  for (const run of runs) {
    assert.ok(run.width >= 1);
    for (let i = 0; i < run.width; i++) painted.add(run.x + i + ',' + run.y);
  }

  let dark = 0;
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (!qr.get(x, y)) {
        assert.ok(!painted.has(x + ',' + y), 'a light module was painted at ' + x + ',' + y);
        continue;
      }
      dark++;
      assert.ok(painted.has(x + ',' + y), 'a dark module was missed at ' + x + ',' + y);
    }
  }

  assert.equal(painted.size, dark);
  assert.ok(runs.length < dark, 'runs should be fewer than individual modules');
});

/* ------------------------------------------------------------------ *
 * What the certificate actually encodes
 * ------------------------------------------------------------------ */

test('every product activation link encodes and reads back', () => {
  for (const product of PRODUCTS) {
    const url = activationUrl(generateCode(product, { orderId: 'order-1' }));
    const qr = encodeText(url, { ecl: ECC.MEDIUM });
    assert.equal(decode(qr).text, url, 'failed for ' + product.slug);
    assert.ok(qr.version <= 8, 'an activation link should stay a small symbol');
  }
});

test('content too long for any version is refused rather than truncated', () => {
  assert.throws(() => encodeText('x'.repeat(5000), { ecl: ECC.HIGH }), /too long/);
});
