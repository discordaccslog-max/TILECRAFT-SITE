/*
 * Tilecraft Digital — the home page
 *
 * Renders the two product tiers from js/products.js, runs the hero's two
 * drifting ink plates, and moves the sticky canvas through a new composition
 * as each product section scrolls into view.
 */

import { PRODUCTS, TIERS, productsByTier, formatPrice } from './products.js';
import { drawInkLayer, liveCanvas, seedFrom } from './riso.js';
import { renderFeature, renderToolTile } from './previews.js';
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
  section.dataset.index = String(index);
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
      '<div class="panel__art" aria-hidden="true"></div>' +
      '<h3 class="panel__title">' + escapeHtml(product.name) + '</h3>' +
      '<p class="panel__short">' + escapeHtml(product.short) + '</p>' +
      '<p class="panel__foot"><span class="price">' + formatPrice(product.price) + '</span>' +
      '<span class="panel__more">Read more</span></p>';

    item.append(link);
    host.append(item);

    renderToolTile(link.querySelector('.panel__art'), product.slug, 110);
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

  // The sticky surface shows a real pattern from the collection in view,
  // not an illustration of one. Which pattern is picked from the section's
  // own index, so scrolling back shows the same one again.
  const label = document.querySelector('[data-canvas-label]');

  // A token guards against a slow render landing after a newer one and
  // labelling the surface with the wrong pattern.
  let paintToken = 0;

  const paint = (section) => {
    const token = ++paintToken;
    const slug = section.dataset.seed;
    const index = Number(section.dataset.index || 0);
    const heading = section.querySelector('h2');
    const collection = heading ? heading.textContent.trim() : '';

    return renderFeature(canvas, slug, index * 7 + 3, 160).then((ok) => {
      if (token !== paintToken) return;
      if (!ok) {
        canvas.style.background = 'var(--paper-sunk)';
        if (label) label.textContent = '';
        return;
      }
      if (label) {
        label.textContent = canvas.dataset.patternName
          ? canvas.dataset.patternName + ' — from ' + collection
          : 'A pattern from ' + collection;
      }
    });
  };

  const show = (section) => {
    if (section === current) return;
    current = section;
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

  document.addEventListener('tilecraft:themechange', () => {
    if (current) paint(current);
  });

  /*
   * Which section the canvas should be showing is decided by a probe line
   * drawn just below the canvas itself, rather than by whichever section
   * covers most of the viewport.
   *
   * That distinction matters on narrow screens. There the canvas is a band
   * pinned to the top, so the content a reader is actually looking at
   * starts below it — measuring from the middle of the viewport picks the
   * section after the one being read. Measuring from under the band gives
   * the right answer in both layouts, because on wide screens the band is
   * the full height of the column and the probe lands at its middle.
   */
  const container = canvas.closest('.split__canvas') || canvas;

  const probeLine = () => {
    const band = container.getBoundingClientRect();
    const viewport = window.innerHeight;

    // A tall canvas is the full-height column beside the content: the
    // reading area is the whole viewport, so probe its middle. A short one
    // is the band pinned above the content: the reading area is what is
    // left below it, so probe the middle of that.
    if (band.height > viewport * 0.6) return viewport / 2;
    return (Math.max(band.bottom, 0) + viewport) / 2;
  };

  const pick = () => {
    const line = probeLine();
    let best = sections[0];
    for (const section of sections) {
      const box = section.getBoundingClientRect();
      if (box.top <= line && box.bottom > line) return section;
      // Past the last section, hold on to the last one.
      if (box.top <= line) best = section;
    }
    return best;
  };

  /*
   * The update is driven from two places, because neither is reliable on
   * its own. Scroll events are coalesced, and can be delivered sparsely
   * when the page is being painted slowly; an IntersectionObserver still
   * fires as each section crosses the viewport even then. Running both and
   * recomputing from the probe either way means the canvas keeps up
   * whichever one arrives.
   *
   * The work is reading six rectangles, so it is done directly rather than
   * deferred to an animation frame, which is itself throttled in exactly
   * the situations where scroll events go missing.
   */
  const update = () => show(pick());

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });

  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(update, {
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]
    });
    sections.forEach((section) => observer.observe(section));
  }

  update();
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
