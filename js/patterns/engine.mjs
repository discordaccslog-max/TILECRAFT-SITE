/*
 * Tilecraft Digital — the pattern engine
 *
 * One pattern is a small JSON spec: a tile size, a list of color slots, and
 * a list of primitives. This module turns a spec plus a set of colors into
 * an SVG tile. The build script uses it to write the shipped SVG files; the
 * Studio uses the same code to recolor, preview, and export, so what a
 * buyer sees is produced by exactly the same path as what they download.
 *
 * Primitives
 *
 *   rect      x, y, w, h, rx?            filled rectangle
 *   circle    cx, cy, r                  filled circle
 *   ellipse   cx, cy, rx, ry, rot?       filled ellipse
 *   ring      cx, cy, r, w               stroked circle (an annulus)
 *   arc       cx, cy, r, a0, a1, w, cap? stroked circular arc
 *   poly      pts                        filled straight-sided polygon
 *   line      pts, w, cap?, join?        stroked straight polyline
 *   blob      cx, cy, radii, rot?        filled closed smooth curve
 *   curve     pts, w, cap?               stroked smooth open curve
 *
 * Every primitive carries either `fill` or `stroke`, naming a color slot.
 *
 * Seamlessness is a property of how a spec is built, not of this module:
 * the generator repeats any motif that crosses a tile edge on the opposite
 * side, and the SVG viewBox clips the overhang. The build script then
 * rasterizes the result and checks the edges really do match.
 */

/* ------------------------------------------------------------------ *
 * Geometry shared by the SVG writer and the build's rasterizer
 * ------------------------------------------------------------------ */

/** Points along a circular arc, flattened finely enough to look smooth. */
export function arcPoints(cx, cy, r, a0, a1, steps) {
  const span = Math.abs(a1 - a0);
  const count = steps || Math.max(8, Math.ceil((span / (Math.PI * 2)) * 64));
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const a = a0 + ((a1 - a0) * i) / count;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** The outline of a blob: a closed smooth curve through evenly spaced radii. */
export function blobPoints(cx, cy, radii, rot = 0) {
  const n = radii.length;
  return radii.map((r, i) => {
    const a = rot + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

/**
 * A cubic path through a list of points, Catmull-Rom converted to Bezier.
 * Used for blobs and smooth curves so the SVG stays small and clean rather
 * than carrying hundreds of flattened line segments.
 */
export function smoothPath(points, closed, tension = 1) {
  const n = points.length;
  if (n < 2) return '';
  const at = (i) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];

  let d = 'M' + fmt(points[0][0]) + ',' + fmt(points[0][1]);
  const last = closed ? n : n - 1;

  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k = tension / 6;
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d +=
      'C' + fmt(c1[0]) + ',' + fmt(c1[1]) +
      ' ' + fmt(c2[0]) + ',' + fmt(c2[1]) +
      ' ' + fmt(p2[0]) + ',' + fmt(p2[1]);
  }

  if (closed) d += 'Z';
  return d;
}

/** Flatten a smooth curve to line segments, for rasterizing and checking. */
export function flattenSmooth(points, closed, tension = 1, perSegment = 12) {
  const n = points.length;
  if (n < 2) return points.slice();
  const at = (i) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  const out = [];
  const last = closed ? n : n - 1;

  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k = tension / 6;
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];

    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const u = 1 - t;
      out.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]
      ]);
    }
  }

  if (!closed) out.push(points[n - 1]);
  return out;
}

/* ------------------------------------------------------------------ *
 * Numbers and colors
 * ------------------------------------------------------------------ */

/** Trim a number to three decimals, which is plenty at these tile sizes. */
export function fmt(n) {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

function colorFor(slot, colors) {
  if (typeof slot !== 'string') return '#000000';
  if (slot.startsWith('#')) return slot;
  const value = colors && colors[slot];
  return typeof value === 'string' ? value : '#000000';
}

/** Mix two hex colors. Used by colorway helpers and the texture mapper. */
export function mixHex(a, b, t) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const m = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return rgbToHex(m);
}

export function hexToRgb(hex) {
  const value = String(hex).replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0
  ];
}

export function rgbToHex(rgb) {
  return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/** Relative luminance, for deciding whether a color reads as light or dark. */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/* ------------------------------------------------------------------ *
 * One primitive to SVG
 * ------------------------------------------------------------------ */

function strokeAttrs(p, colors) {
  return (
    ' fill="none" stroke="' + colorFor(p.stroke, colors) + '"' +
    ' stroke-width="' + fmt(p.w) + '"' +
    ' stroke-linecap="' + (p.cap || 'butt') + '"' +
    ' stroke-linejoin="' + (p.join || 'round') + '"'
  );
}

function pointsAttr(pts) {
  return pts.map((p) => fmt(p[0]) + ',' + fmt(p[1])).join(' ');
}

/** One primitive as an SVG element. */
export function primitiveToSvg(p, colors) {
  switch (p.t) {
    case 'rect':
      return (
        '<rect x="' + fmt(p.x) + '" y="' + fmt(p.y) + '" width="' + fmt(p.w) + '" height="' + fmt(p.h) + '"' +
        (p.rx ? ' rx="' + fmt(p.rx) + '"' : '') +
        ' fill="' + colorFor(p.fill, colors) + '"/>'
      );

    case 'circle':
      return (
        '<circle cx="' + fmt(p.cx) + '" cy="' + fmt(p.cy) + '" r="' + fmt(p.r) + '"' +
        ' fill="' + colorFor(p.fill, colors) + '"/>'
      );

    case 'ellipse':
      return (
        '<ellipse cx="' + fmt(p.cx) + '" cy="' + fmt(p.cy) + '" rx="' + fmt(p.rx) + '" ry="' + fmt(p.ry) + '"' +
        (p.rot ? ' transform="rotate(' + fmt((p.rot * 180) / Math.PI) + ' ' + fmt(p.cx) + ' ' + fmt(p.cy) + ')"' : '') +
        ' fill="' + colorFor(p.fill, colors) + '"/>'
      );

    case 'ring':
      return (
        '<circle cx="' + fmt(p.cx) + '" cy="' + fmt(p.cy) + '" r="' + fmt(p.r) + '"' +
        strokeAttrs(p, colors) + '/>'
      );

    case 'arc': {
      const pts = arcPoints(p.cx, p.cy, p.r, p.a0, p.a1);
      const large = Math.abs(p.a1 - p.a0) > Math.PI ? 1 : 0;
      const sweep = p.a1 > p.a0 ? 1 : 0;
      const a = pts[0];
      const b = pts[pts.length - 1];
      return (
        '<path d="M' + fmt(a[0]) + ',' + fmt(a[1]) +
        'A' + fmt(p.r) + ',' + fmt(p.r) + ' 0 ' + large + ' ' + sweep + ' ' + fmt(b[0]) + ',' + fmt(b[1]) + '"' +
        strokeAttrs(p, colors) + '/>'
      );
    }

    case 'poly':
      return (
        '<polygon points="' + pointsAttr(p.pts) + '" fill="' + colorFor(p.fill, colors) + '"/>'
      );

    case 'line':
      return (
        '<polyline points="' + pointsAttr(p.pts) + '"' + strokeAttrs(p, colors) + '/>'
      );

    case 'blob':
      return (
        '<path d="' + smoothPath(blobPoints(p.cx, p.cy, p.radii, p.rot || 0), true) + '"' +
        ' fill="' + colorFor(p.fill, colors) + '"/>'
      );

    case 'curve':
      return (
        '<path d="' + smoothPath(p.pts, !!p.closed) + '"' + strokeAttrs(p, colors) + '/>'
      );

    default:
      return '';
  }
}

/* ------------------------------------------------------------------ *
 * A whole tile
 * ------------------------------------------------------------------ */

/**
 * Render a pattern spec as an SVG tile.
 *
 * @param {object} spec the pattern
 * @param {object} [colors] slot name to hex; defaults to the first colorway
 * @param {object} [options]
 * @param {number} [options.size] width and height attributes, in pixels
 * @param {boolean} [options.standalone] include the XML declaration
 * @returns {string}
 */
export function renderSvg(spec, colors, options = {}) {
  const palette = colors || colorsOf(spec, 0);
  const tile = spec.tile;
  const size = options.size || tile;

  const body = spec.draw.map((p) => primitiveToSvg(p, palette)).join('');

  return (
    (options.standalone ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '') +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + tile + ' ' + tile + '"' +
    ' width="' + size + '" height="' + size + '"' +
    ' shape-rendering="geometricPrecision">' +
    '<title>' + escapeXml(spec.name) + '</title>' +
    '<rect width="' + tile + '" height="' + tile + '" fill="' + colorFor(spec.background || 'bg', palette) + '"/>' +
    body +
    '</svg>'
  );
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The colors of one of a pattern's colorways, by index or by name. */
export function colorsOf(spec, which = 0) {
  const list = spec.colorways || [];
  if (!list.length) return {};
  const found =
    typeof which === 'string'
      ? list.find((c) => c.name === which) || list[0]
      : list[Math.max(0, Math.min(list.length - 1, which))];
  return { ...found.colors };
}

/** An SVG tile as a data URI, ready for a CSS background or an img src. */
export function toDataUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/%20/g, ' ');
}

export default { renderSvg, colorsOf, toDataUri, primitiveToSvg, mixHex, luminance };
