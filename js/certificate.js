/*
 * Tilecraft Digital — License Certificate
 *
 * Produces the one-page PDF certificate a buyer downloads after a purchase,
 * and can re-download at any time from the Studio. Everything is generated in
 * the browser: the page layout, the QR code, and the PDF itself.
 */

import { SITE } from './site-config.js';
import { activationUrl, formatIssuedDate } from './license.js';
import { PdfDocument, measureText, wrapText } from './pdf.js';
import { encodeText, toRuns, ECC } from './qrcode.js';
import {
  CERTIFICATE_ALLOWS,
  CERTIFICATE_DOES_NOT_ALLOW,
  CERTIFICATE_DURATION
} from './license-terms.js';

/* The certificate uses the same inks as the site. */
const INK = {
  paper: [0.973, 0.957, 0.925],
  text: [0.078, 0.09, 0.161],
  muted: [0.38, 0.4, 0.46],
  rule: [0.82, 0.8, 0.76],
  pink: [0.937, 0.235, 0.502],
  teal: [0.0, 0.698, 0.678],
  overprint: [0.4, 0.33, 0.55],
  white: [1, 1, 1]
};

const PAGE = { width: 612, height: 792 };
const MARGIN = 54;
const CONTENT = PAGE.width - MARGIN * 2;

/** The filename a certificate downloads as. */
export function certificateFilename(license) {
  const slug = String(license.slug || 'license').replace(/[^a-z0-9-]/gi, '-');
  return 'tilecraft-license-' + slug + '-' + license.code + '.pdf';
}

/**
 * Build the certificate as a PdfDocument.
 *
 * @param {object} license a license record from js/license.js
 * @returns {PdfDocument}
 */
export function buildCertificate(license) {
  const url = activationUrl(license.code);
  const licensePageUrl = SITE.origin + '/license/';
  const doc = new PdfDocument({
    width: PAGE.width,
    height: PAGE.height,
    info: {
      Title: 'Commercial License Certificate — ' + license.productName,
      Author: SITE.name,
      Subject: 'Commercial license for ' + license.productName + ' (' + license.code + ')',
      Keywords: 'license, certificate, ' + license.code
    }
  });

  // Paper.
  doc.rect(0, 0, PAGE.width, PAGE.height, INK.paper);

  /* ---------------- Masthead ---------------- */

  // Two ink layers, slightly out of register, overprinting where they meet.
  // This is the same decorative device the site uses in its headings.
  doc.rect(0, 0, PAGE.width, 10, INK.pink);
  doc.rect(0, 6, PAGE.width, 10, INK.teal);
  doc.rect(0, 6, PAGE.width, 4, INK.overprint);

  const mastheadY = MARGIN + 28;

  doc.text(SITE.name.toUpperCase(), MARGIN, mastheadY, {
    font: 'bold',
    size: 10,
    color: INK.text,
    letterSpacing: 2.4
  });
  doc.text(SITE.domain, PAGE.width - MARGIN, mastheadY, {
    font: 'mono',
    size: 9,
    color: INK.muted,
    align: 'right'
  });

  doc.line(MARGIN, mastheadY + 14, PAGE.width - MARGIN, mastheadY + 14, INK.text, 1.5);

  /* ---------------- Title ---------------- */

  // The title is printed three times: once in each ink, a hair out of
  // register, and then cleanly in the text ink on top. That is the
  // misregistered look of a risograph print, with a crisp readable layer.
  const titleAt = (line, baseline) => {
    doc.text(line, MARGIN + 1.6, baseline + 1.2, { font: 'bold', size: 30, color: INK.pink });
    doc.text(line, MARGIN - 1.2, baseline - 0.8, { font: 'bold', size: 30, color: INK.teal });
    doc.text(line, MARGIN, baseline, { font: 'bold', size: 30, color: INK.text });
  };
  titleAt('Commercial License', 152);
  titleAt('Certificate', 186);

  doc.text(
    'This certificate is the record of the license described below.',
    MARGIN,
    210,
    { font: 'regular', size: 9.5, color: INK.muted }
  );

  /* ---------------- Details ---------------- */

  const rows = [];
  if (license.licensee) rows.push(['Licensed to', license.licensee, 'bold', 12]);
  rows.push(['Product', license.productName, 'bold', 12]);
  rows.push(['License code', license.code, 'mono', 13]);
  rows.push(['Issued', formatIssuedDate(license.issuedAt), 'regular', 12]);
  if (license.orderRef) rows.push(['Order reference', license.orderRef, 'mono', 10.5]);

  const labelWidth = 120;
  const valueWidth = CONTENT - labelWidth;
  let y = 248;

  for (const [label, value, font, size] of rows) {
    doc.text(label.toUpperCase(), MARGIN, y, {
      font: 'regular',
      size: 7.5,
      color: INK.muted,
      letterSpacing: 1.1
    });
    const lines = wrapText(value, font, size, valueWidth);
    let lineY = y;
    for (const line of lines) {
      doc.text(line, MARGIN + labelWidth, lineY, { font, size, color: INK.text });
      lineY += size * 1.3;
    }
    y = lineY - size * 1.3 + 27;
  }

  if (!license.licensee) {
    doc.text(
      'No licensee name was entered, so this license is held by the purchaser of the order above.',
      MARGIN,
      y - 8,
      { font: 'regular', size: 8.5, color: INK.muted }
    );
    y += 10;
  }

  const ruleY = Math.max(y + 2, 392);
  doc.line(MARGIN, ruleY, PAGE.width - MARGIN, ruleY, INK.rule, 0.75);

  /* ---------------- Terms column ---------------- */

  const columnTop = ruleY + 30;
  const leftWidth = 300;
  const rightX = MARGIN + leftWidth + 24;
  const rightWidth = PAGE.width - MARGIN - rightX;

  let left = columnTop;

  doc.text('WHAT THIS LICENSE ALLOWS', MARGIN, left, {
    font: 'bold',
    size: 8,
    color: INK.teal,
    letterSpacing: 1.1
  });
  left += 15;
  left = doc.paragraph(CERTIFICATE_ALLOWS, MARGIN, left, leftWidth, {
    size: 9.5,
    color: INK.text,
    lineHeight: 13.5
  });

  left += 26;
  doc.text('WHAT IT DOES NOT ALLOW', MARGIN, left, {
    font: 'bold',
    size: 8,
    color: INK.pink,
    letterSpacing: 1.1
  });
  left += 15;
  left = doc.paragraph(CERTIFICATE_DOES_NOT_ALLOW, MARGIN, left, leftWidth, {
    size: 9.5,
    color: INK.text,
    lineHeight: 13.5
  });

  left += 24;
  left = doc.paragraph(CERTIFICATE_DURATION, MARGIN, left, leftWidth, {
    size: 9.5,
    color: INK.muted,
    lineHeight: 13.5
  });

  left += 26;
  const linkLabel = 'Read the full license: ' + licensePageUrl;
  doc.text(linkLabel, MARGIN, left, { font: 'bold', size: 9, color: INK.text });
  const linkWidth = measureText(linkLabel, 'bold', 9);
  doc.line(MARGIN, left + 2.5, MARGIN + linkWidth, left + 2.5, INK.text, 0.6);
  doc.link(MARGIN, left - 9, linkWidth, 13, licensePageUrl);

  /* ---------------- Activation column ---------------- */

  let right = columnTop;

  doc.text('ACTIVATE ON ANOTHER DEVICE', rightX, right, {
    font: 'bold',
    size: 8,
    color: INK.muted,
    letterSpacing: 1.1
  });
  right += 16;

  const qrBox = rightWidth;
  const qrPad = 9;
  const qrSize = qrBox - qrPad * 2;
  const qr = encodeText(url, { ecl: ECC.MEDIUM });

  doc.rect(rightX, right, qrBox, qrBox, INK.white);
  doc.strokeRect(rightX, right, qrBox, qrBox, INK.rule, 0.75);
  doc.qr(toRuns(qr), qr.size, rightX + qrPad, right + qrPad, qrSize, {
    border: 1,
    dark: INK.text
  });
  doc.link(rightX, right, qrBox, qrBox, url);

  right += qrBox + 16;
  doc.text('Scan this code, or open:', rightX, right, {
    font: 'regular',
    size: 8.5,
    color: INK.muted
  });
  right += 13;
  for (const line of wrapText(url, 'mono', 7.2, rightWidth)) {
    doc.text(line, rightX, right, { font: 'mono', size: 7.2, color: INK.text });
    right += 9.6;
  }

  right += 6;
  doc.paragraph(
    'Opening this link activates the license on that device. Keep it to yourself.',
    rightX,
    right,
    rightWidth,
    { size: 8, color: INK.muted, lineHeight: 11 }
  );

  /* ---------------- Footer ---------------- */

  const footerY = PAGE.height - MARGIN - 28;
  doc.line(MARGIN, footerY - 18, PAGE.width - MARGIN, footerY - 18, INK.rule, 0.75);

  doc.text(
    'Keep this certificate. It carries your license code and the link that activates it on another device.',
    MARGIN,
    footerY,
    { font: 'regular', size: 8.5, color: INK.muted }
  );
  doc.text(
    'Issued by ' + SITE.name + '. Activation codes travel in the link fragment and are never sent to a web server.',
    MARGIN,
    footerY + 12,
    { font: 'regular', size: 8.5, color: INK.muted }
  );

  // Footer ink bar, mirroring the masthead.
  doc.rect(0, PAGE.height - 16, PAGE.width, 10, INK.teal);
  doc.rect(0, PAGE.height - 10, PAGE.width, 10, INK.pink);
  doc.rect(0, PAGE.height - 10, PAGE.width, 4, INK.overprint);

  return doc;
}

/** The certificate as PDF bytes. */
export function certificateBytes(license) {
  return buildCertificate(license).toBytes();
}

/** The certificate as a Blob. */
export function certificateBlob(license) {
  return new Blob([certificateBytes(license)], { type: 'application/pdf' });
}

export default { buildCertificate, certificateBytes, certificateBlob, certificateFilename };
