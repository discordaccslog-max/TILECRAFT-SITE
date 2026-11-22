/*
 * Tilecraft Digital — site configuration
 *
 * Edit this file to change site-wide details. Nothing else needs to change.
 *
 * supportEmail
 *   Leave as an empty string until a support mailbox exists. While it is
 *   empty, every place that would show it (Contact page, footer, Studio
 *   "Report a problem" link) simply omits that line, and the surrounding
 *   layout stays complete. Set it to an address and those lines appear
 *   automatically as mailto links.
 *
 * postalAddress
 *   The business address, one array entry per line, as it should be read.
 *   Shown on the Contact page and carried into the Organization schema.
 *   Works the same way as supportEmail: an empty array omits the block
 *   and the page still reads as complete.
 */

/*
 * domain / origin
 *   Where the site is served from. These are not cosmetic: they are built
 *   into canonical URLs, the sitemap, Open Graph tags, and — most
 *   importantly — the activation links printed and QR-encoded on every
 *   License Certificate. A certificate is a document a buyer keeps, so a
 *   link on one has to keep working. Change this only when the site really
 *   moves, then run `npm run build`.
 */

export const SITE = {
  name: 'Tilecraft Digital',
  tagline: 'Original seamless patterns and textures, delivered in a browser Studio.',
  domain: 'tilecraft-site.vercel.app',
  origin: 'https://tilecraft-site.vercel.app',
  licensePrefix: 'TILE',
  supportEmail: 'tilemail@tilecraftdigital.art',
  postalAddress: [
    '111 E Pigeon Plum Dr, Apt 102',
    'Jupiter, FL 33458-7868',
    'United States'
  ],
  supportResponseTime: 'within two business days',
  refundDays: 14,
  lastUpdated: '12 November 2026'
};

/** True when a support mailbox has been configured. */
export function hasSupportEmail() {
  return typeof SITE.supportEmail === 'string' && SITE.supportEmail.trim().length > 0;
}

/** The support address, trimmed, or an empty string when none is set. */
export function supportEmail() {
  return hasSupportEmail() ? SITE.supportEmail.trim() : '';
}

/** True when a postal address has been configured. */
export function hasPostalAddress() {
  return Array.isArray(SITE.postalAddress) && postalAddress().length > 0;
}

/** The postal address as an array of non-empty lines. */
export function postalAddress() {
  if (!Array.isArray(SITE.postalAddress)) return [];
  return SITE.postalAddress.map((line) => String(line).trim()).filter(Boolean);
}

/** The postal address on one line, for a schema field or a meta tag. */
export function postalAddressLine() {
  return postalAddress().join(', ');
}

/**
 * A mailto link for the support address, or an empty string when no address
 * is set. Callers must check the result before inserting it.
 */
export function supportMailto(subject) {
  if (!hasSupportEmail()) return '';
  const base = 'mailto:' + encodeURIComponent(supportEmail()).replace(/%40/g, '@');
  return subject ? base + '?subject=' + encodeURIComponent(subject) : base;
}

export default SITE;
