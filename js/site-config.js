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
  supportEmail: '',
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
