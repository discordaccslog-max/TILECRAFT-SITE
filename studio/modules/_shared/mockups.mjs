/*
 * Mockups.
 *
 * Six original SVG scenes that show a pattern on something, so a buyer can
 * judge scale before they commit to a print run. Every one is drawn here
 * from rectangles, paths, and gradients — there is no photograph anywhere
 * in this project, and these are illustrations, not product shots.
 *
 * Each mockup fills its surfaces from a single <pattern> whose tile is the
 * live, recolored artwork, so what is shown is the real thing at the real
 * repeat size.
 */

const SHADE = `
  <linearGradient id="soft" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.26"/>
    <stop offset="0.45" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.22"/>
  </linearGradient>
  <linearGradient id="fold" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#000000" stop-opacity="0.2"/>
    <stop offset="0.12" stop-color="#ffffff" stop-opacity="0.16"/>
    <stop offset="0.3" stop-color="#000000" stop-opacity="0.14"/>
    <stop offset="0.52" stop-color="#ffffff" stop-opacity="0.14"/>
    <stop offset="0.72" stop-color="#000000" stop-opacity="0.16"/>
    <stop offset="0.88" stop-color="#ffffff" stop-opacity="0.12"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.22"/>
  </linearGradient>
  <linearGradient id="roomLight" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.2"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.16"/>
  </linearGradient>`;

/**
 * The scenes. Each returns the SVG body; `fill` is the paint to use for
 * patterned surfaces and `scene` is the stage size.
 */
const SCENES = {
  fabric: {
    label: 'Fabric',
    width: 520,
    height: 380,
    body: (fill) => `
      <rect width="520" height="380" fill="#efe9df"/>
      <path d="M40 24 H480 V300 Q440 330 400 306 Q360 282 320 308 Q280 334 240 310
               Q200 286 160 312 Q120 338 80 314 Q60 302 40 308 Z" fill="${fill}"/>
      <path d="M40 24 H480 V300 Q440 330 400 306 Q360 282 320 308 Q280 334 240 310
               Q200 286 160 312 Q120 338 80 314 Q60 302 40 308 Z" fill="url(#fold)"/>
      <path d="M40 24 H480 V300 Q440 330 400 306 Q360 282 320 308 Q280 334 240 310
               Q200 286 160 312 Q120 338 80 314 Q60 302 40 308 Z"
            fill="none" stroke="#2a2a2a" stroke-opacity="0.35" stroke-width="2"/>
      <ellipse cx="260" cy="348" rx="210" ry="14" fill="#000000" opacity="0.1"/>`
  },

  wall: {
    label: 'Wall',
    width: 520,
    height: 380,
    body: (fill) => `
      <rect width="520" height="380" fill="#e7e2d8"/>
      <rect x="0" y="0" width="380" height="300" fill="${fill}"/>
      <rect x="0" y="0" width="380" height="300" fill="url(#roomLight)"/>
      <path d="M380 0 H520 V300 L380 300 Z" fill="${fill}"/>
      <path d="M380 0 H520 V300 L380 300 Z" fill="#000000" opacity="0.22"/>
      <rect x="0" y="300" width="520" height="12" fill="#d8d2c6"/>
      <rect x="0" y="312" width="520" height="68" fill="#cfc7b8"/>
      <path d="M0 312 H520 V380 H0 Z" fill="url(#roomLight)" opacity="0.5"/>
      <rect x="96" y="62" width="150" height="110" rx="3" fill="#f6f3ec" stroke="#3a3a3a" stroke-opacity="0.5" stroke-width="5"/>
      <rect x="112" y="78" width="118" height="78" fill="#ded7ca"/>
      <rect x="330" y="214" width="26" height="86" rx="4" fill="#bdb3a2"/>
      <ellipse cx="343" cy="306" rx="30" ry="7" fill="#000000" opacity="0.12"/>`
  },

  notebook: {
    label: 'Notebook',
    width: 520,
    height: 380,
    body: (fill) => `
      <rect width="520" height="380" fill="#e9e4da"/>
      <rect x="148" y="40" width="232" height="306" rx="6" fill="#ffffff" opacity="0.65"/>
      <rect x="140" y="34" width="236" height="306" rx="6" fill="${fill}"/>
      <rect x="140" y="34" width="236" height="306" rx="6" fill="url(#soft)"/>
      <rect x="140" y="34" width="18" height="306" fill="#000000" opacity="0.16"/>
      <rect x="140" y="34" width="236" height="306" rx="6" fill="none"
            stroke="#2a2a2a" stroke-opacity="0.4" stroke-width="2"/>
      <rect x="336" y="34" width="9" height="306" fill="#2b2b2b" opacity="0.5"/>
      <rect x="376" y="46" width="6" height="282" rx="3" fill="#d9d2c4"/>
      <ellipse cx="258" cy="356" rx="130" ry="11" fill="#000000" opacity="0.12"/>`
  },

  tote: {
    label: 'Tote bag',
    width: 520,
    height: 380,
    body: (fill) => `
      <rect width="520" height="380" fill="#ece7dd"/>
      <path d="M196 96 Q196 40 232 40 Q268 40 268 96" fill="none" stroke="#3b3b3b" stroke-opacity="0.65" stroke-width="9" stroke-linecap="round"/>
      <path d="M252 96 Q252 40 288 40 Q324 40 324 96" fill="none" stroke="#3b3b3b" stroke-opacity="0.45" stroke-width="9" stroke-linecap="round"/>
      <path d="M160 96 H360 L348 332 Q260 348 172 332 Z" fill="${fill}"/>
      <path d="M160 96 H360 L348 332 Q260 348 172 332 Z" fill="url(#soft)"/>
      <path d="M160 96 H360 L348 332 Q260 348 172 332 Z" fill="none" stroke="#2a2a2a" stroke-opacity="0.38" stroke-width="2"/>
      <path d="M160 96 H360 L357 118 H163 Z" fill="#000000" opacity="0.1"/>
      <ellipse cx="260" cy="348" rx="104" ry="10" fill="#000000" opacity="0.13"/>`
  },

  box: {
    label: 'Box',
    width: 520,
    height: 380,
    body: (fill) => `
      <rect width="520" height="380" fill="#eae5db"/>
      <path d="M150 140 L260 86 L370 140 L260 194 Z" fill="${fill}"/>
      <path d="M150 140 L260 86 L370 140 L260 194 Z" fill="#ffffff" opacity="0.2"/>
      <path d="M150 140 L260 194 L260 320 L150 266 Z" fill="${fill}"/>
      <path d="M150 140 L260 194 L260 320 L150 266 Z" fill="#000000" opacity="0.08"/>
      <path d="M370 140 L260 194 L260 320 L370 266 Z" fill="${fill}"/>
      <path d="M370 140 L260 194 L260 320 L370 266 Z" fill="#000000" opacity="0.26"/>
      <path d="M150 140 L260 86 L370 140 L260 194 Z M150 140 L260 194 L260 320 L150 266 Z M370 140 L260 194 L260 320 L370 266 Z"
            fill="none" stroke="#2a2a2a" stroke-opacity="0.35" stroke-width="2"/>
      <ellipse cx="260" cy="330" rx="118" ry="12" fill="#000000" opacity="0.12"/>`
  },

  phoneCase: {
    label: 'Phone case',
    width: 520,
    height: 380,
    body: (fill) => `
      <rect width="520" height="380" fill="#e8e3d9"/>
      <rect x="196" y="30" width="128" height="320" rx="26" fill="${fill}"/>
      <rect x="196" y="30" width="128" height="320" rx="26" fill="url(#soft)"/>
      <rect x="196" y="30" width="128" height="320" rx="26" fill="none"
            stroke="#2a2a2a" stroke-opacity="0.45" stroke-width="3"/>
      <rect x="214" y="48" width="56" height="56" rx="14" fill="#2c2c2c" opacity="0.82"/>
      <circle cx="232" cy="66" r="9" fill="#55606b"/>
      <circle cx="254" cy="66" r="9" fill="#55606b"/>
      <circle cx="232" cy="88" r="9" fill="#55606b"/>
      <circle cx="254" cy="88" r="5" fill="#8c949c"/>
      <ellipse cx="260" cy="360" rx="70" ry="9" fill="#000000" opacity="0.13"/>`
  }
};

export const MOCKUPS = Object.entries(SCENES).map(([id, scene]) => ({ id, label: scene.label }));

/**
 * Build a mockup as an SVG string.
 *
 * @param {string} id one of the scene ids
 * @param {string} tileUri the pattern tile as a data URI
 * @param {number} tileSize how large one repeat appears, in scene units
 */
export function mockupSvg(id, tileUri, tileSize = 64) {
  const scene = SCENES[id] || SCENES.fabric;
  const size = Math.max(8, tileSize);

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    'viewBox="0 0 ' + scene.width + ' ' + scene.height + '" width="100%" height="100%">' +
    '<defs>' +
    '<pattern id="tile" width="' + size + '" height="' + size + '" patternUnits="userSpaceOnUse">' +
    '<image href="' + tileUri + '" x="0" y="0" width="' + size + '" height="' + size + '" ' +
    'preserveAspectRatio="none"/>' +
    '</pattern>' +
    SHADE +
    '</defs>' +
    scene.body('url(#tile)') +
    '</svg>'
  );
}

export default { MOCKUPS, mockupSvg };
