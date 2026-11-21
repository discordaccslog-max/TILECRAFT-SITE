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
  },

  /* ------------------------------------------------------------------ *
   * The extra scenes, which come with the mockup pack
   * ------------------------------------------------------------------ */

  cushion: {
    label: 'Cushion',
    extra: true,
    width: 520,
    height: 380,
    body: (fill) => `
      <rect width="520" height="380" fill="#eae4da"/>
      <path d="M150 90 Q260 70 370 90 Q392 190 370 290 Q260 312 150 290 Q128 190 150 90Z" fill="${fill}"/>
      <path d="M150 90 Q260 70 370 90 Q392 190 370 290 Q260 312 150 290 Q128 190 150 90Z" fill="url(#soft)"/>
      <path d="M150 90 Q260 70 370 90 Q392 190 370 290 Q260 312 150 290 Q128 190 150 90Z"
            fill="none" stroke="#2a2a2a" stroke-opacity="0.3" stroke-width="3"/>
      <ellipse cx="260" cy="322" rx="120" ry="13" fill="#000000" opacity="0.12"/>`
  },

  mug: {
    label: 'Mug',
    extra: true,
    width: 520,
    height: 380,
    body: (fill) => `
      <rect width="520" height="380" fill="#ece6dc"/>
      <path d="M352 150 q46 0 46 40 t-46 40" fill="none" stroke="#3a3a3a" stroke-opacity="0.5" stroke-width="14"/>
      <rect x="160" y="110" width="194" height="190" rx="16" fill="${fill}"/>
      <rect x="160" y="110" width="194" height="190" rx="16" fill="url(#soft)"/>
      <rect x="160" y="110" width="194" height="190" rx="16" fill="none"
            stroke="#2a2a2a" stroke-opacity="0.4" stroke-width="3"/>
      <ellipse cx="257" cy="110" rx="97" ry="16" fill="#f6f2ea"/>
      <ellipse cx="257" cy="110" rx="97" ry="16" fill="none" stroke="#2a2a2a" stroke-opacity="0.35" stroke-width="3"/>
      <ellipse cx="257" cy="312" rx="100" ry="11" fill="#000000" opacity="0.13"/>`
  },

  label: {
    label: 'Label',
    extra: true,
    width: 520,
    height: 380,
    body: (fill) => `
      <rect width="520" height="380" fill="#e9e3d9"/>
      <rect x="150" y="60" width="220" height="260" rx="10" fill="#f8f5ef"/>
      <rect x="150" y="60" width="220" height="260" rx="10" fill="none"
            stroke="#2a2a2a" stroke-opacity="0.25" stroke-width="3"/>
      <rect x="168" y="78" width="184" height="128" fill="${fill}"/>
      <rect x="168" y="78" width="184" height="128" fill="url(#soft)"/>
      <rect x="168" y="232" width="124" height="10" rx="5" fill="#2a2a2a" opacity="0.5"/>
      <rect x="168" y="254" width="92" height="8" rx="4" fill="#2a2a2a" opacity="0.3"/>
      <rect x="168" y="272" width="150" height="8" rx="4" fill="#2a2a2a" opacity="0.3"/>
      <ellipse cx="260" cy="332" rx="112" ry="11" fill="#000000" opacity="0.12"/>`
  },

  bookCover: {
    label: 'Book cover',
    extra: true,
    width: 520,
    height: 380,
    body: (fill) => `
      <rect width="520" height="380" fill="#eae5db"/>
      <rect x="168" y="46" width="190" height="282" rx="4" fill="#d8d2c6"/>
      <rect x="176" y="40" width="190" height="282" rx="4" fill="${fill}"/>
      <rect x="176" y="40" width="190" height="282" rx="4" fill="url(#soft)"/>
      <rect x="176" y="40" width="14" height="282" fill="#000000" opacity="0.14"/>
      <rect x="176" y="40" width="190" height="282" rx="4" fill="none"
            stroke="#2a2a2a" stroke-opacity="0.4" stroke-width="3"/>
      <rect x="212" y="150" width="120" height="10" rx="5" fill="#f8f5ef" opacity="0.92"/>
      <rect x="212" y="172" width="78" height="8" rx="4" fill="#f8f5ef" opacity="0.8"/>
      <ellipse cx="270" cy="334" rx="104" ry="11" fill="#000000" opacity="0.13"/>`
  },

  tiledWall: {
    label: 'Tiled wall',
    extra: true,
    width: 520,
    height: 380,
    body: (fill) => `
      <rect width="520" height="380" fill="#e7e1d6"/>
      <rect x="40" y="36" width="440" height="286" fill="${fill}"/>
      <rect x="40" y="36" width="440" height="286" fill="url(#soft)"/>
      <g stroke="#f6f2ea" stroke-opacity="0.85" stroke-width="5">
        <path d="M40 131H480M40 226H480"/>
        <path d="M150 36V322M260 36V322M370 36V322"/>
      </g>
      <rect x="40" y="36" width="440" height="286" fill="none" stroke="#2a2a2a" stroke-opacity="0.3" stroke-width="3"/>
      <rect x="40" y="322" width="440" height="16" fill="#cdc6b8"/>`
  },

  giftWrap: {
    label: 'Gift wrap',
    extra: true,
    width: 520,
    height: 380,
    body: (fill) => `
      <rect width="520" height="380" fill="#ebe5db"/>
      <rect x="120" y="96" width="280" height="200" rx="6" fill="${fill}"/>
      <rect x="120" y="96" width="280" height="200" rx="6" fill="url(#soft)"/>
      <rect x="244" y="96" width="32" height="200" fill="#f6f2ea" opacity="0.9"/>
      <rect x="120" y="180" width="280" height="32" fill="#f6f2ea" opacity="0.9"/>
      <path d="M260 180 q-46 -56 -16 -70 q30 -14 16 70Z" fill="#f6f2ea" opacity="0.95"/>
      <path d="M260 180 q46 -56 16 -70 q-30 -14 -16 70Z" fill="#f6f2ea" opacity="0.95"/>
      <rect x="120" y="96" width="280" height="200" rx="6" fill="none"
            stroke="#2a2a2a" stroke-opacity="0.35" stroke-width="3"/>
      <ellipse cx="260" cy="306" rx="146" ry="12" fill="#000000" opacity="0.12"/>`
  }
};

/** The six scenes every Collection and tool includes. */
export const MOCKUPS = Object.entries(SCENES)
  .filter(([, scene]) => !scene.extra)
  .map(([id, scene]) => ({ id, label: scene.label }));

/** The six that arrive with the mockup pack. */
export const EXTRA_MOCKUPS = Object.entries(SCENES)
  .filter(([, scene]) => scene.extra)
  .map(([id, scene]) => ({ id, label: scene.label }));

/** Every scene, in display order: the included six, then the extras. */
export const ALL_MOCKUPS = [...MOCKUPS, ...EXTRA_MOCKUPS];

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
