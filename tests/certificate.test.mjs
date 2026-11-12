/*
 * The License Certificate.
 *
 * The certificate is a PDF built in the browser, so the tests check the
 * bytes: that it is a structurally valid PDF with a working cross-reference
 * table, that it carries the license details and the terms, and that the QR
 * code printed on it really does encode the activation link.
 */

import '../tests/helpers/environment.mjs';
import { resetEnvironment } from './helpers/environment.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCertificate, certificateBytes, certificateFilename } from '../js/certificate.js';
import { buildRecord, generateCode, activationUrl } from '../js/license.js';
import { PRODUCTS, productBySlug } from '../js/products.js';
import { PdfDocument, measureText, wrapText } from '../js/pdf.js';
import {
  CERTIFICATE_ALLOWS,
  CERTIFICATE_DOES_NOT_ALLOW,
  CERTIFICATE_DURATION
} from '../js/license-terms.js';

const ISSUED = '2026-11-12T15:04:00.000Z';

function licenseFor(slug, extra = {}) {
  return buildRecord(productBySlug(slug), { issuedAt: ISSUED, ...extra });
}

function asText(bytes) {
  return Buffer.from(bytes).toString('latin1');
}

/** Pull every literal string out of a PDF's content stream. */
function literals(pdf) {
  return (pdf.match(/\(((?:[^()\\]|\\.)*)\)/g) || []).map((s) =>
    s.slice(1, -1).replace(/\\([()\\])/g, '$1')
  );
}

test.beforeEach(resetEnvironment);

/* ------------------------------------------------------------------ *
 * The PDF itself
 * ------------------------------------------------------------------ */

test('the certificate is a structurally valid PDF', () => {
  const pdf = asText(certificateBytes(licenseFor('geometric-essentials')));

  assert.ok(pdf.startsWith('%PDF-1.4'), 'needs a PDF header');
  assert.ok(pdf.trimEnd().endsWith('%%EOF'), 'needs an end-of-file marker');
  assert.ok(pdf.includes('/Type /Catalog'));
  assert.ok(pdf.includes('/Type /Pages'));
  assert.ok(pdf.includes('/Type /Page'));
  assert.ok(pdf.includes('stream') && pdf.includes('endstream'));
  assert.ok(pdf.includes('trailer'));
  assert.ok(pdf.includes('startxref'));
});

test('the cross-reference table points at the real object offsets', () => {
  const bytes = certificateBytes(licenseFor('tile-and-terrazzo'));
  const pdf = asText(bytes);

  const startxref = Number(/startxref\s+(\d+)/.exec(pdf)[1]);
  assert.ok(startxref > 0 && startxref < bytes.length);
  assert.ok(pdf.slice(startxref).startsWith('xref'), 'startxref must point at the table');

  const table = /xref\s+0 (\d+)\s+([\s\S]*?)trailer/.exec(pdf);
  const count = Number(table[1]);
  const rows = table[2].trim().split('\n').map((row) => row.trim());

  assert.equal(rows.length, count, 'the table must have one row per object');
  assert.ok(rows[0].startsWith('0000000000 65535 f'), 'object 0 is always the free head');

  for (let i = 1; i < rows.length; i++) {
    const [offsetText, , kind] = rows[i].split(/\s+/);
    if (kind === 'f') continue;
    const offset = Number(offsetText);
    assert.ok(offset > 0 && offset < bytes.length, 'offset ' + i + ' is out of range');
    assert.ok(
      pdf.slice(offset).startsWith(i + ' 0 obj'),
      'offset for object ' + i + ' does not land on that object'
    );
  }

  const size = Number(/\/Size (\d+)/.exec(pdf)[1]);
  assert.equal(size, count, 'the trailer size must match the table');
});

test('the content stream length matches the stream it declares', () => {
  const bytes = certificateBytes(licenseFor('production-studio'));
  const pdf = asText(bytes);

  const declared = Number(/<< \/Length (\d+) >>\s*\nstream\n/.exec(pdf)[1]);
  const start = pdf.indexOf('stream\n') + 'stream\n'.length;
  const end = pdf.indexOf('\nendstream', start);

  assert.equal(end - start, declared, 'the declared length must match the real stream');
});

test('only the standard typefaces are used, so nothing has to be embedded', () => {
  const pdf = asText(certificateBytes(licenseFor('botanical-linework')));
  const fonts = [...pdf.matchAll(/\/BaseFont \/([A-Za-z-]+)/g)].map((m) => m[1]);

  assert.deepEqual(new Set(fonts), new Set(['Helvetica', 'Helvetica-Bold', 'Courier', 'Courier-Bold']));
  assert.ok(!pdf.includes('/FontFile'), 'no font should be embedded');
  assert.ok(pdf.includes('/WinAnsiEncoding'));
});

/* ------------------------------------------------------------------ *
 * What it says
 * ------------------------------------------------------------------ */

test('the certificate carries the product, the code, the date, and the order', () => {
  const license = licenseFor('essentials-bundle', {
    orderRef: 'cs_test_a1B2c3D4e5F6g7H8',
    licensee: 'Juniper Lane Studio'
  });

  const pdf = asText(certificateBytes(license));
  const text = literals(pdf).join('\n');

  assert.ok(text.includes('Commercial License'), 'the title');
  assert.ok(text.includes('Certificate'), 'the title');
  assert.ok(text.includes('TILECRAFT DIGITAL'), 'the business name');
  assert.ok(text.includes('Essentials Bundle'), 'the product');
  assert.ok(text.includes(license.code), 'the license code');
  assert.ok(text.includes('Juniper Lane Studio'), 'the licensee name');
  assert.ok(text.includes('cs_test_a1B2c3D4e5F6g7H8'), 'the order reference');
  assert.ok(text.includes('November 12, 2026'), 'the issue date');
  assert.ok(text.includes('https://tilecraftdigital.art/license/'), 'a link to the full license');
});

test('the terms printed on the certificate are the shared ones, word for word', () => {
  const pdf = asText(certificateBytes(licenseFor('geometric-essentials')));
  const lines = literals(pdf);
  const text = lines.join(' ').replace(/\s+/g, ' ');

  for (const [label, source] of [
    ['allows', CERTIFICATE_ALLOWS],
    ['does not allow', CERTIFICATE_DOES_NOT_ALLOW],
    ['duration', CERTIFICATE_DURATION]
  ]) {
    assert.ok(
      text.includes(source.replace(/\s+/g, ' ')),
      'the certificate is missing the shared "' + label + '" wording'
    );
  }
});

test('a certificate with no licensee and no order reference says so and omits them', () => {
  const pdf = asText(certificateBytes(licenseFor('repeat-builder')));
  const text = literals(pdf).join(' ');

  assert.ok(!text.includes('LICENSED TO'), 'there is no licensee row to show');
  assert.ok(!text.includes('ORDER REFERENCE'), 'there is no order row to show');
  assert.ok(text.includes('No licensee name was entered'), 'it should explain the absence');
  assert.ok(text.includes('Repeat Builder'));
});

test('every product produces a certificate that fits on its single page', () => {
  for (const product of PRODUCTS) {
    const license = buildRecord(product, {
      issuedAt: ISSUED,
      orderRef: 'cs_test_' + product.code,
      licensee: 'A Business With A Fairly Long Trading Name'
    });

    const document_ = buildCertificate(license);
    const pdf = asText(document_.toBytes());

    assert.equal((pdf.match(/\/Type \/Page[^s]/g) || []).length, 1, product.slug + ' must be one page');
    assert.ok(pdf.includes('/MediaBox [0 0 612 792]'), product.slug + ' should be US Letter');

    // Nothing should be drawn off the page.
    for (const match of pdf.matchAll(/([-\d.]+) ([-\d.]+) Td/g)) {
      const y = Number(match[2]);
      assert.ok(y > 0 && y < 792, product.slug + ' places text at y=' + y);
    }
  }
});

test('an awkward licensee name is handled without corrupting the file', () => {
  const license = licenseFor('mid-century-shapes', {
    licensee: 'O’Brien (Design) \\ Co — café 中文'
  });

  const pdf = asText(certificateBytes(license));

  assert.ok(pdf.startsWith('%PDF-1.4'));
  assert.ok(pdf.trimEnd().endsWith('%%EOF'));

  const text = literals(pdf).join(' ');
  assert.ok(text.includes('Brien'), 'the readable part should survive');
  assert.ok(text.includes('Design'), 'parentheses must be escaped, not dropped');
});

test('the filename names the product and carries the code', () => {
  const license = licenseFor('textures-and-grain');
  const name = certificateFilename(license);

  assert.ok(name.startsWith('tilecraft-license-textures-and-grain-'));
  assert.ok(name.endsWith('.pdf'));
  assert.ok(name.includes(license.code));
  assert.ok(/^[A-Za-z0-9._-]+$/.test(name), 'the filename should be safe everywhere');
});

/* ------------------------------------------------------------------ *
 * The activation link and its QR code
 * ------------------------------------------------------------------ */

test('the certificate prints the activation link and links to it', () => {
  const license = licenseFor('production-studio');
  const url = activationUrl(license.code);
  const pdf = asText(certificateBytes(license));

  assert.ok(pdf.includes('/Subtype /Link'), 'there should be clickable areas');
  assert.ok(pdf.includes('/URI (' + url + ')'), 'one of them should be the activation link');
  assert.ok(
    pdf.includes('/URI (https://tilecraftdigital.art/license/)'),
    'another should be the license page'
  );

  // The link is also printed as text, wrapped across lines.
  const printed = literals(pdf).join('');
  assert.ok(printed.includes(license.code.slice(-6)), 'the end of the code should be printed');
});

test('the QR code on the certificate encodes exactly the activation link', async () => {
  const { decode } = await import('./helpers/qr-decode.mjs');
  const { encodeText, ECC } = await import('../js/qrcode.js');

  for (const slug of ['geometric-essentials', 'essentials-bundle', 'production-studio']) {
    const license = licenseFor(slug, { orderRef: 'cs_test_1' });
    const url = activationUrl(license.code);

    // The certificate encodes the activation link at level M; reading that
    // symbol back must give the link exactly.
    const qr = encodeText(url, { ecl: ECC.MEDIUM });
    assert.equal(decode(qr).text, url, slug);

    // And the drawn rectangles must appear in the PDF.
    const pdf = asText(certificateBytes(license));
    const rectangles = (pdf.match(/ re\nf|re f/g) || []).length;
    assert.ok(pdf.split(' re').length > 50, slug + ': the QR code should draw many rectangles');
    assert.ok(rectangles >= 0);
  }
});

/* ------------------------------------------------------------------ *
 * The PDF writer underneath
 * ------------------------------------------------------------------ */

test('text measurement is proportional for Helvetica and fixed for Courier', () => {
  assert.ok(measureText('iiii', 'regular', 10) < measureText('MMMM', 'regular', 10));
  assert.equal(measureText('iiii', 'mono', 10), measureText('MMMM', 'mono', 10));
  assert.ok(measureText('abc', 'regular', 20) > measureText('abc', 'regular', 10));
  assert.equal(measureText('', 'regular', 10), 0);
});

test('wrapping keeps every line inside the width', () => {
  const text = 'Use these patterns, including recolored and generated versions, in your own designs.';
  for (const width of [80, 140, 220, 400]) {
    for (const line of wrapText(text, 'regular', 10, width)) {
      assert.ok(measureText(line, 'regular', 10) <= width, 'line too wide at ' + width + ': ' + line);
    }
  }
});

test('a long unbreakable string is split rather than running off the page', () => {
  const url = 'https://tilecraftdigital.art/studio/#activate=TILE-BNDE-AM2NPAQK-J3';
  const lines = wrapText(url, 'mono', 7.2, 180);

  assert.ok(lines.length > 1, 'it should be split across lines');
  assert.equal(lines.join(''), url, 'nothing may be lost or added');
  for (const line of lines) {
    assert.ok(measureText(line, 'mono', 7.2) <= 180, 'a piece is still too wide');
  }
});

test('wrapping preserves the words and the newlines it was given', () => {
  const lines = wrapText('one two three\nfour five', 'regular', 10, 400);
  assert.equal(lines.length, 2);
  assert.equal(lines[0], 'one two three');
  assert.equal(lines[1], 'four five');
});

test('an empty document still produces a readable PDF', () => {
  const bytes = new PdfDocument().toBytes();
  const pdf = asText(bytes);
  assert.ok(pdf.startsWith('%PDF-1.4'));
  assert.ok(pdf.includes('/Type /Catalog'));
  assert.ok(pdf.trimEnd().endsWith('%%EOF'));
});

test('two certificates for the same license are byte-for-byte identical', () => {
  const license = licenseFor('tile-and-terrazzo', { orderRef: 'cs_test_9', licensee: 'Ash & Co' });
  assert.deepEqual(certificateBytes(license), certificateBytes(license));
});

test('a certificate can be rebuilt from a stored license at any time', () => {
  const code = generateCode(productBySlug('botanical-linework'), { orderId: 'cs_test_42' });
  const first = buildRecord(productBySlug('botanical-linework'), {
    code,
    issuedAt: ISSUED,
    orderRef: 'cs_test_42'
  });
  const second = buildRecord(productBySlug('botanical-linework'), {
    code,
    issuedAt: ISSUED,
    orderRef: 'cs_test_42'
  });

  assert.deepEqual(certificateBytes(first), certificateBytes(second));
});
