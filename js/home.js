/*
 * Tilecraft Digital — the home page
 *
 * Renders the two product tiers from js/products.js, runs the hero's two
 * drifting ink plates, and moves the sticky canvas through a new composition
 * as each product section scrolls into view.
 */

import { PRODUCTS, TIERS, productsByTier, formatPrice } from './products.js';
import { drawComposition, drawInkLayer, liveCanvas, seedFrom } from './riso.js';
import { prefersReducedMotion } from './settings.js';

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */

const INK_PAIRS = [
  ['pink', 'teal'],
  ['teal', 'pink']
];

function setUpHero() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;

  const plates = [...hero.querySelectorAll('canvas[data-ink-layer]')];
  if (!plates.length) return;

  let pass = 0;

  const paint = () => {
    const pair = INK_PAIRS[pass % INK_PAIRS.length];
    plates.forEach((canvas, index) => {
      const ink = pair[index % pair.length];
      canvas.dataset.ink = ink;
      drawInkLayer(canvas, { ink, seed: seedFrom('hero-' + index + '-' + pass), alpha: 0.88 });
    });
  };

  plates.forEach((canvas) => liveCanvas(canvas, () => paint()));

  // Moving the cursor nudges the top plate out of register.
  const nudge = hero.querySelector('[data-hero-nudge]');
  if (nudge && !prefersReducedMotion() && window.matchMedia('(hover: hover)').matches) {
    let frame = 0;
    hero.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerType !== 'mouse') return;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const box = hero.getBoundingClientRect();
          const x = ((event.clientX - box.left) / box.width - 0.5) * 2;
          const y = ((event.clientY - box.top) / box.height - 0.5) * 2;
          nudge.style.setProperty('--nudge-x', (x * 18).toFixed(2) + 'px');
          nudge.style.setProperty('--nudge-y', (y * 14).toFixed(2) + 'px');
        });
      },
      { passive: true }
    );

    hero.addEventListener('pointerleave', () => {
      nudge.style.setProperty('--nudge-x', '0px');
      nudge.style.setProperty('--nudge-y', '0px');
    });
  }

  // The hint is written for a mouse. On a device without one, say what
  // actually works there instead.
  const hint = hero.querySelector('[data-hero-hint]');
  if (hint && !window.matchMedia('(hover: hover)').matches) {
    hint.textContent = 'Two inks, overprinting. ';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'link-button';
    button.dataset.reink = '';
    button.textContent = 'Re-ink the plates';
    hint.append(button, '.');
  }

  // Clicking re-inks the plates.
  const reink = () => {
    pass++;
    paint();
  };

  hero.addEventListener('click', (event) => {
    if (event.target.closest('a, button')) return;
    reink();
  });

  for (const button of hero.querySelectorAll('[data-reink]')) {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      reink();
    });
  }
}

/* ------------------------------------------------------------------ *
 * Collections, as scrolling sections beside the sticky canvas
 * ------------------------------------------------------------------ */

function collectionSection(product, index) {
  const section = document.createElement('section');
  section.id = 'product-' + product.slug;
  section.className = 'product-section';
  section.dataset.inks = (product.inks || ['pink', 'teal']).join(',');
  section.dataset.seed = product.slug;
  section.setAttribute('aria-labelledby', 'heading-' + product.slug);

  const number = String(index + 1).padStart(2, '0');
  const highlights = product.features.slice(0, 3);

  section.innerHTML =
    '<p class="eyebrow">Collection ' + number + '</p>' +
    '<h2 id="heading-' + product.slug + '" class="product-section__title">' +
    '<span class="overprint" data-text="' + escapeAttribute(product.name) + '">' +
    escapeHtml(product.name) +
    '</span></h2>' +
    '<p class="lede">' + escapeHtml(product.short) + '</p>' +
    '<ul class="feature-list">' +
    highlights.map((f) => '<li>' + escapeHtml(f) + '</li>').join('') +
    '</ul>' +
    '<p class="product-section__price"><span class="price">' + formatPrice(product.price) + '</span> ' +
    '<span class="product-section__tax">Applicable taxes are shown at checkout.</span></p>' +
    '<p class="product-section__action">' +
    '<a class="button" href="/products/' + product.slug + '/">' +
    escapeHtml(product.name) + '<span class="visually-hidden"> — read the full description</span>' +
    '</a></p>';

  return section;
}

function renderCollections() {
  const host = document.querySelector('[data-collections]');
  if (!host) return;
  const products = productsByTier('collection');
  const fragment = document.createDocumentFragment();
  products.forEach((product, index) => fragment.append(collectionSection(product, index)));
  host.append(fragment);
}

/* ------------------------------------------------------------------ *
 * Studio Editions — the print shop panels
 * ------------------------------------------------------------------ */

function renderStudioEditions() {
  const host = document.querySelector('[data-studio-editions]');
  if (!host) return;

  for (const product of productsByTier('studio-edition')) {
    const item = document.createElement('li');
    const featured = product.featured ? ' panel--featured' : '';

    const link = document.createElement('a');
    link.className = 'panel' + featured;
    link.href = '/products/' + product.slug + '/';
    link.innerHTML =
      (product.featured ? '<p class="panel__flag">Most capable</p>' : '') +
      '<div class="panel__art"><canvas aria-hidden="true"></canvas></div>' +
      '<h3 class="panel__title">' + escapeHtml(product.name) + '</h3>' +
      '<p class="panel__short">' + escapeHtml(product.short) + '</p>' +
      '<p class="panel__foot"><span class="price">' + formatPrice(product.price) + '</span>' +
      '<span class="panel__more">Read more</span></p>';

    item.append(link);
    host.append(item);

    const canvas = link.querySelector('canvas');
    liveCanvas(canvas, (element) =>
      drawComposition(element, {
        seed: seedFrom(product.slug + '-panel'),
        inks: product.inks || ['pink', 'teal'],
        paper: '#141127',
        grain: false
      })
    );
  }
}

/* ------------------------------------------------------------------ *
 * The sticky canvas follows the section in view
 * ------------------------------------------------------------------ */

function setUpStickyCanvas() {
  const canvas = document.querySelector('[data-sticky-canvas]');
  const sections = [...document.querySelectorAll('.product-section')];
  if (!canvas || !sections.length) return;

  let current = null;

  const paint = (section) => {
    const inks = (section.dataset.inks || 'pink,teal').split(',');
    drawComposition(canvas, { seed: seedFrom(section.dataset.seed || section.id), inks });
  };

  const show = (section) => {
    if (section === current) return;
    current = section;
    const label = document.querySelector('[data-canvas-label]');
    if (label) {
      const heading = section.querySelector('h2');
      label.textContent = heading
        ? 'Composition for ' + heading.textContent.trim() + ' — decorative, not a pattern preview'
        : 'Decorative composition — not a pattern preview';
    }
    if (prefersReducedMotion()) {
      paint(section);
      return;
    }
    canvas.style.opacity = '0';
    window.setTimeout(() => {
      paint(section);
      canvas.style.opacity = '1';
    }, 180);
  };

  liveCanvas(canvas, () => {
    if (current) paint(current);
    else paint(sections[0]);
  });

  if (typeof IntersectionObserver !== 'function') {
    show(sections[0]);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) show(visible.target);
    },
    { rootMargin: '-35% 0px -35% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
  );

  sections.forEach((section) => observer.observe(section));
  show(sections[0]);
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(text) {
  return escapeHtml(text).replace(/"/g, '&quot;');
}

/* ------------------------------------------------------------------ *
 * Start
 * ------------------------------------------------------------------ */

function start() {
  renderCollections();
  renderStudioEditions();
  setUpStickyCanvas();
  setUpHero();

  const count = document.querySelector('[data-product-count]');
  if (count) count.textContent = String(PRODUCTS.length);

  const tierBlurb = document.querySelector('[data-tier-blurb="collection"]');
  if (tierBlurb) tierBlurb.textContent = TIERS.collection.blurb;

  const editionBlurb = document.querySelector('[data-tier-blurb="studio-edition"]');
  if (editionBlurb) editionBlurb.textContent = TIERS['studio-edition'].blurb;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
