/*
 * Tilecraft Digital — page shell
 *
 * The header, footer, and document wrapper shared by every page. The build
 * script in tools/build.mjs passes each page's content through here so the
 * chrome is identical everywhere and can only be changed in one place.
 */

import { SITE, hasSupportEmail, supportEmail } from '../js/site-config.js';

export const ORIGIN = SITE.origin;

/** Escape text for use in HTML. */
export function h(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The header, with the current page marked. */
function header() {
  return `  <header class="site-header">
    <div class="site-header__inner">
      <a class="logo" href="/">
        <svg class="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
          <rect x="3" y="3" width="13" height="13" fill="var(--pink)" style="mix-blend-mode:var(--blend)"></rect>
          <path d="M16 3h13v13z" fill="var(--teal)" style="mix-blend-mode:var(--blend)"></path>
          <rect x="16" y="16" width="13" height="13" fill="var(--teal)" style="mix-blend-mode:var(--blend)"></rect>
          <circle cx="9.5" cy="22.5" r="6.5" fill="var(--pink)" style="mix-blend-mode:var(--blend)"></circle>
          <circle cx="9.5" cy="22.5" r="3" fill="var(--paper)"></circle>
        </svg>
        <span class="logo__text">Tilecraft Digital</span>
      </a>

      <button type="button" class="nav__toggle" data-nav-toggle aria-expanded="false" aria-controls="site-nav">
        Menu
      </button>

      <nav class="nav" id="site-nav" data-nav aria-label="Main">
        <ul class="nav__list">
          <li><a class="nav__link" href="/#collections">Collections</a></li>
          <li><a class="nav__link" href="/#bundles">Bundles</a></li>
          <li><a class="nav__link" href="/#studio-editions">Studio Editions</a></li>
          <li><a class="nav__link" href="/license/">License</a></li>
          <li><a class="nav__link" href="/faq/">FAQ</a></li>
        </ul>
        <div class="nav__extras">
          <a class="nav__cart" href="/cart/" data-cart-link>
            Cart<span class="nav__cart-count" data-cart-count hidden></span>
          </a>
          <a class="nav__studio" href="/studio/">Studio</a>
          <button type="button" class="theme-toggle" data-theme-toggle aria-label="Change color theme"></button>
        </div>
      </nav>
    </div>
  </header>`;
}

/** The footer. The support line is rendered only when an address is set. */
function footer() {
  const contact = hasSupportEmail()
    ? `        <p class="site-footer__contact" data-support-email="Support:" data-support-subject="Tilecraft Digital">Support: <a href="mailto:${h(
        supportEmail()
      )}">${h(supportEmail())}</a></p>`
    : '';

  return `  <footer class="site-footer">
    <div class="wrap">
      <div class="site-footer__grid">

        <div>
          <h2>Tilecraft Digital</h2>
          <p class="site-footer__contact">Original seamless patterns and textures, delivered in a browser Studio.</p>
${contact}
          <p class="site-footer__contact"><a href="/contact/">Contact us through the Contact page</a>.</p>
        </div>

        <div>
          <h3>Products</h3>
          <ul>
            <li><a href="/#collections">Collections</a></li>
            <li><a href="/#bundles">Bundles</a></li>
            <li><a href="/#studio-editions">Studio Editions</a></li>
            <li><a href="/studio/">Studio</a></li>
            <li><a href="/about/">About</a></li>
          </ul>
        </div>

        <div>
          <h3>Buying</h3>
          <ul>
            <li><a href="/license/">License</a></li>
            <li><a href="/refunds/">Refunds</a></li>
            <li><a href="/delivery/">Delivery</a></li>
            <li><a href="/faq/">FAQ</a></li>
          </ul>
        </div>

        <div>
          <h3>Legal</h3>
          <ul>
            <li><a href="/terms/">Terms of Service</a></li>
            <li><a href="/privacy/">Privacy Policy</a></li>
            <li><a href="/disclaimer/">Disclaimer</a></li>
            <li><a href="/consumer-rights/">Consumer rights</a></li>
            <li><a href="/accessibility/">Accessibility</a></li>
            <li><a href="/contact/">Contact</a></li>
          </ul>
        </div>

      </div>

      <div class="site-footer__legal">
        <span>&copy; <span data-year>2026</span> Tilecraft Digital. All rights reserved.</span>
        <span>All prices in US dollars. Applicable taxes are shown at checkout.</span>
      </div>
    </div>
  </footer>`;
}

/**
 * Wrap a page body in the full document.
 *
 * @param {object} options
 * @param {string} options.title         the <title>, without the site name
 * @param {string} options.description   the meta description
 * @param {string} options.path          absolute path, e.g. "/license/"
 * @param {string} options.body          the page's HTML
 * @param {string[]} [options.scripts]   module scripts to load
 * @param {string[]} [options.styles]    extra stylesheets
 * @param {boolean} [options.noindex]    leave the page out of search results
 * @param {string} [options.bodyClass]
 * @param {string} [options.ogTitle]
 */
export function document_({
  title,
  description,
  path,
  body,
  scripts = [],
  styles = [],
  noindex = false,
  bodyClass = '',
  ogTitle
}) {
  const fullTitle = title.includes('Tilecraft Digital') ? title : `${title} — Tilecraft Digital`;
  const url = ORIGIN + path;

  const robots = noindex
    ? '<meta name="robots" content="noindex, nofollow">\n'
    : '';

  const canonical = noindex ? '' : `<link rel="canonical" href="${h(url)}">\n`;

  const social = noindex
    ? ''
    : `<meta property="og:type" content="website">
<meta property="og:site_name" content="Tilecraft Digital">
<meta property="og:title" content="${h(ogTitle || fullTitle)}">
<meta property="og:description" content="${h(description)}">
<meta property="og:url" content="${h(url)}">
<meta property="og:image" content="${h(ORIGIN)}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Tilecraft Digital — original seamless patterns and textures.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${h(ogTitle || fullTitle)}">
<meta name="twitter:description" content="${h(description)}">
<meta name="twitter:image" content="${h(ORIGIN)}/og.png">
`;

  const styleLinks = ['/css/style.css', ...styles]
    .map((href) => `<link rel="stylesheet" href="${h(href)}">`)
    .join('\n');

  const scriptTags = scripts
    .map((src) => `<script type="module" src="${h(src)}"></script>`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(fullTitle)}</title>
<meta name="description" content="${h(description)}">
${robots}<meta name="theme-color" content="#f7f2e8">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${canonical}${social}<link rel="preload" href="/fonts/hanken-grotesk-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/bricolage-grotesque-latin-var.woff2" as="font" type="font/woff2" crossorigin>
${styleLinks}
</head>
<body${bodyClass ? ` class="${h(bodyClass)}"` : ''}>

<a class="skip-link" href="#main">Skip to the main content</a>

${header()}

<main id="main">
${body}
</main>

${footer()}

<script type="module" src="/js/site.js"></script>
${scriptTags}
</body>
</html>
`;
}

/** A standard page head block: eyebrow, title, lede, and optional date. */
export function pageHead({ eyebrow, title, lede, updated, seed = 'page' }) {
  return `  <div class="page-head">
    <div class="wrap page-head__inner">
      ${eyebrow ? `<p class="eyebrow">${h(eyebrow)}</p>` : ''}
      <h1><span class="overprint" data-text="${h(title)}">${h(title)}</span></h1>
      ${lede ? `<p class="lede">${lede}</p>` : ''}
      ${updated ? `<p class="updated">Last updated: ${h(updated)}</p>` : ''}
    </div>
  </div>`;
}

/** Wrap prose content in the standard column. */
export function prose(inner, extraClass = '') {
  return `  <div class="prose${extraClass ? ' ' + extraClass : ''}">
    <div class="wrap wrap--narrow">
${inner}
    </div>
  </div>`;
}
