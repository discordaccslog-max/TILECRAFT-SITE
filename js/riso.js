/*
 * Tilecraft Digital — riso compositions
 *
 * Draws the abstract two-ink compositions used as illustration across the
 * site: the sticky canvas beside the scrolling content, the hero's drifting
 * ink layers, the swatch at the head of each product card, and the artwork on
 * the Studio Edition panels.
 *
 * These are decorative illustrations. They are deliberately not samples of
 * the patterns a buyer receives, and the site says so wherever one appears.
 *
 * Each composition is drawn from a seed, so the same section always produces
 * the same artwork, and two inks are overlaid with a blend mode so that they
 * overprint into a third color where they cross, the way two passes through
 * a risograph do.
 */

/** A small deterministic pseudo-random generator. */
export function seeded(seed) {
  let a = seed >>> 0;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable seed from any string. */
export function seedFrom(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < String(text).length; i++) {
    h ^= String(text).charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function readToken(name, fallback) {
  if (typeof getComputedStyle !== 'function') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** The current ink palette, read from the stylesheet so themes stay in step. */
export function palette() {
  const dark = document.documentElement.classList.contains('is-dark') || isDarkMode();
  return {
    pink: readToken('--pink', dark ? '#ff5c9b' : '#ef3c80'),
    teal: readToken('--teal', dark ? '#2fe3d6' : '#00b2ad'),
    paper: readToken('--paper-sunk', dark ? '#0b0a16' : '#ece4d5'),
    ink: readToken('--ink', dark ? '#f4efe3' : '#14172a'),
    blend: dark ? 'screen' : 'multiply',
    dark
  };
}

function isDarkMode() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark') return true;
  if (attr === 'light') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Size a canvas to its CSS box at the device pixel ratio. */
export function fitCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
    canvas.width = width * ratio;
    canvas.height = height * ratio;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

/* ------------------------------------------------------------------ *
 * Shape vocabulary
 *
 * Each routine draws one ink's worth of marks. A composition runs two of
 * them, in two inks, with a blend mode between.
 * ------------------------------------------------------------------ */

function arcs(ctx, w, h, rnd, color) {
  const count = 4 + Math.floor(rnd() * 4);
  const cx = w * (0.2 + rnd() * 0.6);
  const cy = h * (0.2 + rnd() * 0.6);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    const radius = Math.min(w, h) * (0.12 + (i / count) * 0.62) * (0.85 + rnd() * 0.4);
    const start = rnd() * Math.PI * 2;
    const sweep = Math.PI * (0.4 + rnd() * 1.1);
    ctx.lineWidth = Math.max(3, Math.min(w, h) * (0.012 + rnd() * 0.05));
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + sweep);
    ctx.stroke();
  }
}

function orbits(ctx, w, h, rnd, color) {
  const count = 3 + Math.floor(rnd() * 3);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const r = Math.min(w, h) * (0.1 + rnd() * 0.34);
    const x = w * (0.1 + rnd() * 0.8);
    const y = h * (0.1 + rnd() * 0.8);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ribbons(ctx, w, h, rnd, color) {
  const bands = 3 + Math.floor(rnd() * 4);
  ctx.fillStyle = color;
  for (let i = 0; i < bands; i++) {
    const thickness = h * (0.05 + rnd() * 0.16);
    const y = h * (rnd() * 0.95) - thickness / 2;
    const skew = (rnd() - 0.5) * h * 0.5;
    ctx.beginPath();
    ctx.moveTo(-w * 0.1, y);
    ctx.lineTo(w * 1.1, y + skew);
    ctx.lineTo(w * 1.1, y + skew + thickness);
    ctx.lineTo(-w * 0.1, y + thickness);
    ctx.closePath();
    ctx.fill();
  }
}

function stack(ctx, w, h, rnd, color) {
  const cols = 2 + Math.floor(rnd() * 3);
  const rows = 2 + Math.floor(rnd() * 3);
  const pad = Math.min(w, h) * 0.08;
  const cw = (w - pad * 2) / cols;
  const ch = (h - pad * 2) / rows;
  ctx.fillStyle = color;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (rnd() < 0.42) continue;
      const inset = Math.min(cw, ch) * rnd() * 0.3;
      ctx.fillRect(pad + c * cw + inset, pad + r * ch + inset, cw - inset * 2, ch - inset * 2);
    }
  }
}

function wedges(ctx, w, h, rnd, color) {
  const count = 3 + Math.floor(rnd() * 4);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = w * rnd();
    const y = h * rnd();
    const size = Math.min(w, h) * (0.18 + rnd() * 0.42);
    const rotation = rnd() * Math.PI * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.arc(0, 0, size, 0, Math.PI / (1.4 + rnd() * 2.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function scatter(ctx, w, h, rnd, color) {
  const count = 60 + Math.floor(rnd() * 90);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const r = Math.min(w, h) * (0.006 + rnd() * rnd() * 0.05);
    ctx.beginPath();
    ctx.arc(w * rnd(), h * rnd(), r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function lattice(ctx, w, h, rnd, color) {
  const step = Math.min(w, h) / (4 + Math.floor(rnd() * 5));
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, step * 0.09);
  for (let x = -h; x < w + h; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h, h);
    ctx.stroke();
  }
  if (rnd() > 0.45) {
    for (let x = -h; x < w + h; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + h, 0);
      ctx.stroke();
    }
  }
}

function blobs(ctx, w, h, rnd, color) {
  const count = 2 + Math.floor(rnd() * 3);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const cx = w * (0.15 + rnd() * 0.7);
    const cy = h * (0.15 + rnd() * 0.7);
    const base = Math.min(w, h) * (0.16 + rnd() * 0.3);
    const points = 7 + Math.floor(rnd() * 4);
    ctx.beginPath();
    for (let p = 0; p <= points; p++) {
      const angle = (p / points) * Math.PI * 2;
      const radius = base * (0.65 + rnd() * 0.7);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.85;
      if (p === 0) ctx.moveTo(x, y);
      else {
        const prevAngle = ((p - 1) / points) * Math.PI * 2;
        const midAngle = (angle + prevAngle) / 2;
        const cpRadius = base * 1.15;
        ctx.quadraticCurveTo(
          cx + Math.cos(midAngle) * cpRadius,
          cy + Math.sin(midAngle) * cpRadius * 0.85,
          x,
          y
        );
      }
    }
    ctx.closePath();
    ctx.fill();
  }
}

const SHAPES = { arcs, orbits, ribbons, stack, wedges, scatter, lattice, blobs };
const SHAPE_NAMES = Object.keys(SHAPES);

/** A halftone dot field laid over the composition. */
function halftone(ctx, w, h, rnd, color, strength) {
  const step = Math.max(5, Math.min(w, h) / 26);
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.fillStyle = color;
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      const fade = 1 - y / h;
      const r = step * 0.42 * fade * (0.5 + rnd() * 0.8);
      if (r <= 0.3) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Draw a two-ink composition into a canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} [options]
 * @param {string|number} [options.seed] anything stable; the same seed always
 *        produces the same composition
 * @param {string[]} [options.inks] two ink names: 'pink' or 'teal'
 * @param {string} [options.paper] background color; omit for the themed paper
 * @param {number} [options.alpha] ink opacity, default 0.92
 * @param {boolean} [options.grain] draw the halftone field, default true
 */
export function drawComposition(canvas, options = {}) {
  if (!canvas) return;
  const { ctx, width, height } = fitCanvas(canvas);
  if (width < 2 || height < 2) return;

  const colors = palette();
  const seedValue = typeof options.seed === 'number' ? options.seed : seedFrom(options.seed || 'tilecraft');
  const rnd = seeded(seedValue);

  const inkNames = options.inks && options.inks.length === 2 ? options.inks : ['pink', 'teal'];
  const inkA = colors[inkNames[0]] || colors.pink;
  const inkB = colors[inkNames[1]] || colors.teal;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = options.paper || colors.paper;
  ctx.fillRect(0, 0, width, height);

  // Two passes, one per ink, blended so the overlap makes a third color.
  const first = SHAPE_NAMES[Math.floor(rnd() * SHAPE_NAMES.length)];
  let second = SHAPE_NAMES[Math.floor(rnd() * SHAPE_NAMES.length)];
  if (second === first) second = SHAPE_NAMES[(SHAPE_NAMES.indexOf(first) + 3) % SHAPE_NAMES.length];

  const alpha = options.alpha == null ? 0.92 : options.alpha;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'source-over';
  SHAPES[first](ctx, width, height, rnd, inkA);
  ctx.globalCompositeOperation = colors.blend;
  SHAPES[second](ctx, width, height, rnd, inkB);
  if (options.grain !== false) {
    halftone(ctx, width, height, rnd, colors.ink, colors.dark ? 0.07 : 0.1);
  }
  ctx.restore();
}

/**
 * Draw a single ink layer, for the hero's two drifting plates.
 * The layers are separate elements so that CSS can move them independently
 * and the browser can blend them together.
 */
export function drawInkLayer(canvas, options = {}) {
  if (!canvas) return;
  const { ctx, width, height } = fitCanvas(canvas);
  if (width < 2 || height < 2) return;

  const colors = palette();
  const rnd = seeded(typeof options.seed === 'number' ? options.seed : seedFrom(options.seed || 'ink'));
  const ink = colors[options.ink] || colors.pink;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  // A plate is a couple of distinct shapes with plenty of bare paper around
  // them, not a wash of color. Two plates drifting across each other then
  // read as two passes of ink, and the headline in front of them stays
  // comfortably legible.
  ctx.globalAlpha = options.alpha == null ? (colors.dark ? 0.5 : 0.72) : options.alpha;

  const count = 2;
  for (let i = 0; i < count; i++) {
    const cx = width * (0.34 + rnd() * 0.5);
    const cy = height * (0.15 + rnd() * 0.7);
    const base = Math.min(width, height) * (0.17 + rnd() * 0.17);
    const points = 8 + Math.floor(rnd() * 4);

    ctx.fillStyle = ink;
    ctx.beginPath();
    for (let p = 0; p <= points; p++) {
      const angle = (p / points) * Math.PI * 2;
      const radius = base * (0.75 + rnd() * 0.5);
      const x = cx + Math.cos(angle) * radius * 1.25;
      const y = cy + Math.sin(angle) * radius;
      if (p === 0) {
        ctx.moveTo(x, y);
        continue;
      }
      const previous = ((p - 1) / points) * Math.PI * 2;
      const middle = (angle + previous) / 2;
      ctx.quadraticCurveTo(
        cx + Math.cos(middle) * base * 1.45,
        cy + Math.sin(middle) * base * 1.16,
        x,
        y
      );
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Keep a canvas drawn at the right size, redrawing when the element resizes
 * and when the theme changes. Returns a function that redraws on demand.
 */
export function liveCanvas(canvas, draw) {
  let frame = 0;
  const render = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => draw(canvas));
  };

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
  } else {
    window.addEventListener('resize', render, { passive: true });
  }

  if (window.matchMedia) {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    if (query.addEventListener) query.addEventListener('change', render);
  }

  document.addEventListener('tilecraft:themechange', render);
  render();
  return render;
}

export default { drawComposition, drawInkLayer, liveCanvas, palette, seeded, seedFrom, fitCanvas };
