/*
 * Exports.
 *
 * What a buyer actually receives is a zip: the artwork, plus a note saying
 * what they may do with it. These tests read those archives back with an
 * independent reader, so a download that is subtly malformed — a bad CRC, a
 * missing license note, a filename that escaped its own archive — fails
 * here rather than in somebody's unzip tool.
 *
 * Drawing a tile needs a canvas, so the exports that go through one are
 * exercised in the browser instead; everything here is the part that
 * decides what a download contains and what it is called.
 */

import '../tests/helpers/environment.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import { makeZip, blobBytes } from '../studio/modules/_shared/zip.mjs';
import {
  licenseNote,
  safeName,
  fileNameFor,
  setPngDpi,
  describeLimit
} from '../studio/modules/_shared/export.mjs';
import { readZip } from './helpers/zip-read.mjs';
import { decodePng } from './helpers/png-decode.mjs';
import { encodePng } from '../tools/patterns/raster.mjs';
import { productBySlug } from '../js/products.js';
import { SITE } from '../js/site-config.js';
import { TESTED_MAXIMUM } from '../js/export-limit.js';

const bytesOf = async (blob) => blobBytes(blob);

/* ------------------------------------------------------------------ *
 * The archive itself
 * ------------------------------------------------------------------ */

test('a zip can be read back, entry for entry', async () => {
  const artwork = new Uint8Array([1, 2, 3, 4, 5, 250, 0, 128]);
  const zip = await bytesOf(makeZip([
    { name: 'pattern.png', data: artwork },
    { name: 'LICENSE.txt', data: 'terms go here' }
  ]));

  const { entries, names } = readZip(zip);
  assert.deepEqual(names, ['pattern.png', 'LICENSE.txt']);
  assert.deepEqual([...entries[0].bytes], [...artwork]);
  assert.equal(entries[1].text, 'terms go here');
  for (const entry of entries) {
    assert.ok(entry.crcOk, entry.name + ' has a bad checksum');
    assert.ok(entry.stored, entry.name + ' should be stored, not deflated');
  }
});

test('a zip survives text that is not plain ASCII', async () => {
  const note = 'Colorway: Café — Crème\nSize: 2 048 × 2 048\n';
  const zip = await bytesOf(makeZip([{ name: 'LICENSE.txt', data: note }]));
  const { entries } = readZip(zip);
  assert.equal(entries[0].text, note);
  assert.ok(entries[0].crcOk);
  // The length is in bytes, not characters, or the entry would be truncated.
  assert.ok(entries[0].bytes.length > note.length);
});

test('an empty zip is still a readable zip', async () => {
  const { entries } = readZip(await bytesOf(makeZip([])));
  assert.deepEqual(entries, []);
});

test('a large entry is written with the right length', async () => {
  // Four megabytes, which is the order of a full-size PNG export.
  const big = new Uint8Array(4 * 1024 * 1024);
  for (let i = 0; i < big.length; i++) big[i] = (i * 31) & 0xff;

  const { entries } = readZip(await bytesOf(makeZip([{ name: 'sheet.png', data: big }])));
  assert.equal(entries[0].bytes.length, big.length);
  assert.ok(entries[0].crcOk);
});

/* ------------------------------------------------------------------ *
 * The license note that travels with every download
 * ------------------------------------------------------------------ */

const context = {
  product: productBySlug('geometric-essentials'),
  license: {
    code: 'TILE-GMTR-K7N4PXBM-WC',
    licensee: 'A Buyer',
    orderRef: 'order-12345'
  }
};

test('the license note records the product, the code, and the terms', () => {
  const note = licenseNote(context, {
    pattern: 'Drafting',
    colorway: 'Riso',
    size: '4096 x 4096 px at 300 DPI'
  });

  assert.match(note, /TILECRAFT DIGITAL/);
  assert.match(note, /Geometric Essentials/);
  assert.match(note, /TILE-GMTR-K7N4PXBM-WC/);
  assert.match(note, /A Buyer/);
  assert.match(note, /order-12345/);
  assert.match(note, /Drafting/);
  assert.match(note, /Riso/);
  assert.match(note, /4096 x 4096 px at 300 DPI/);

  // Both halves of the licence, so a buyer reading only this file is not
  // left guessing at the limits.
  assert.match(note, /WHAT THIS LICENSE ALLOWS/);
  assert.match(note, /WHAT IT DOES NOT ALLOW/);
  assert.match(note, /No attribution/);
  assert.match(note, /train AI models/);
  assert.match(note, /refunded/);
});

test('the license note points at the live license page', () => {
  const note = licenseNote(context);
  assert.ok(
    note.includes(SITE.origin + '/license/'),
    'the note should link the real license page, not a hardcoded address'
  );
});

test('the license note copes with a missing licensee or order', () => {
  const note = licenseNote({ product: { name: 'Repeat Builder' }, license: {} });
  assert.match(note, /Repeat Builder/);
  assert.match(note, /not recorded/);
  assert.ok(!note.includes('undefined'), 'a blank field leaked into the note');
  assert.ok(!note.includes('Licensed to:'), 'an empty licensee line should be left out');
});

test('the license note carries a date', () => {
  const note = licenseNote(context);
  const today = new Date().toISOString().slice(0, 10);
  assert.ok(note.includes('Exported:'), 'no export date');
  assert.ok(note.includes(today), 'the export date is not today');
});

/* ------------------------------------------------------------------ *
 * Filenames
 * ------------------------------------------------------------------ */

test('a filename is safe whatever the pattern is called', () => {
  assert.equal(safeName('Terrazzo Bold'), 'terrazzo-bold');
  assert.equal(safeName('Soft / Warm'), 'soft-warm');
  assert.equal(safeName('  spaced  out  '), 'spaced-out');
  assert.equal(safeName('../../etc/passwd'), 'etc-passwd');
  assert.equal(safeName('Café Crème'), 'caf-cr-me');
  assert.equal(safeName('???'), 'pattern');
  assert.equal(safeName(''), 'pattern');
});

test('the batch naming scheme fills in every placeholder', () => {
  const name = fileNameFor('{pattern}-{colorway}-{index}-{size}', {
    pattern: 'Terrazzo Bold',
    colorway: 'Midnight',
    index: 3,
    width: 4096,
    height: 2048
  });
  assert.equal(name, 'terrazzo-bold-midnight-03-4096x2048');
});

test('the index in a batch name is padded, so files sort in order', () => {
  const names = [1, 2, 9, 10, 11].map((index) =>
    fileNameFor('{index}-{colorway}', { pattern: 'x', colorway: 'c', index, width: 1, height: 1 })
  );
  assert.deepEqual(names, ['01-c', '02-c', '09-c', '10-c', '11-c']);
  assert.deepEqual([...names].sort(), names, 'padded names should already be in order');
});

test('a naming scheme cannot produce a path or escape the archive', () => {
  const name = fileNameFor('{pattern}/{colorway}', {
    pattern: '../..',
    colorway: 'sub/dir',
    index: 1,
    width: 1,
    height: 1
  });
  assert.ok(!name.includes('/'), 'a separator survived into the filename');
  assert.ok(!name.includes('..'), 'a parent reference survived into the filename');
});

test('a scheme with no placeholders still yields a usable name', () => {
  assert.equal(
    fileNameFor('my tiles', { pattern: 'p', colorway: 'c', index: 1, width: 1, height: 1 }),
    'my-tiles'
  );
});

/* ------------------------------------------------------------------ *
 * Resolution written into PNG exports
 * ------------------------------------------------------------------ */

/*
 * A real PNG to insert a resolution into.
 *
 * In the browser the bytes come from canvas.toBlob; here they come from the
 * site's own encoder, which produces the same thing a PNG writer produces.
 * Using a real file rather than a handmade fixture means the DPI inserter
 * is tested against a stream it will actually meet.
 */
function smallPng() {
  const width = 8;
  const height = 8;
  const pixels = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 3] = (i * 7) & 0xff;
    pixels[i * 3 + 1] = (i * 13) & 0xff;
    pixels[i * 3 + 2] = (i * 29) & 0xff;
  }
  return encodePng(pixels, width, height, 3);
}

test('a PNG export carries its resolution', () => {
  const withDpi = setPngDpi(smallPng(), 300);
  const image = decodePng(withDpi);
  assert.equal(image.dpi, 300, 'the pHYs chunk should record 300 DPI');
});

test('the resolution chunk goes before the image data, as the format requires', () => {
  const withDpi = setPngDpi(smallPng(), 150);
  const text = Buffer.from(withDpi).toString('latin1');
  assert.ok(text.indexOf('pHYs') < text.indexOf('IDAT'), 'pHYs must precede IDAT');
  assert.equal(decodePng(withDpi).dpi, 150);
});

test('every offered resolution is written correctly', () => {
  for (const dpi of [72, 150, 300, 600]) {
    assert.equal(decodePng(setPngDpi(smallPng(), dpi)).dpi, dpi, dpi + ' DPI was not recorded');
  }
});

test('setting the resolution does not corrupt the image', () => {
  const before = decodePng(smallPng());
  const after = decodePng(setPngDpi(smallPng(), 300));
  assert.equal(after.width, before.width);
  assert.equal(after.height, before.height);
  assert.deepEqual([...after.data], [...before.data]);
});

/* ------------------------------------------------------------------ *
 * The export limit
 * ------------------------------------------------------------------ */

test('the export limit is described in pixels and in inches', () => {
  const text = describeLimit(16384);
  assert.match(text, /16,384/);
  assert.match(text, /inch/i);
});

test('the figure the product page states is the one that was tested', () => {
  assert.equal(TESTED_MAXIMUM, 16384);
  const product = productBySlug('production-studio');
  const claim = product.features.find((f) => /16,384/.test(f));
  assert.ok(claim, 'the Production Studio page should state the tested maximum');
  assert.match(claim, /16,384 x 16,384/);
});
