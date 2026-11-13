/*
 * Where a motif goes in a repeat.
 *
 * The placement maths lives here, apart from the canvas, for two reasons.
 * It is the part that decides whether a repeat actually tiles, so it is
 * worth being able to test it on its own; and keeping it separate means the
 * drawing code is only a loop over placements.
 *
 * A tile is seamless when every motif that crosses an edge is also drawn at
 * the matching position on the opposite edge. That is what the wrapped
 * copies are for: a placement near the right edge is repeated one tile to
 * the left, so the half that hangs off the edge reappears where it belongs.
 */

export const LAYOUTS = [
  { value: 'full', label: 'Full drop' },
  { value: 'half', label: 'Half drop' },
  { value: 'brick', label: 'Brick' },
  { value: 'mirror', label: 'Mirror' }
];

export const LAYOUT_VALUES = LAYOUTS.map((l) => l.value);

/**
 * Work out the grid a set of settings produces.
 *
 * @param {object} state  scale (0.12–1), spacing (0–1)
 * @param {number} tile   the tile's pixel size
 */
export function gridFor(state, tile) {
  const columns = Math.max(1, Math.round(1 / Math.max(0.12, state.scale)));
  const cell = tile / columns;
  return { columns, cell, size: cell * (1 - state.spacing) };
}

/**
 * Every motif placement in one tile, wrapped copies included.
 *
 * Each placement carries the index of the motif to draw, where to draw it,
 * how large, its rotation, and whether it is mirrored. A placement whose
 * bounding box falls entirely outside the tile is left out, so the caller
 * can draw the list as it stands.
 *
 * @returns {Array<{motif: number, x: number, y: number, size: number,
 *                  rotation: number, flipX: boolean, flipY: boolean,
 *                  wrapped: boolean}>}
 */
export function planRepeat(state, tile, motifCount) {
  if (!motifCount) return [];

  const { columns, cell, size } = gridFor(state, tile);
  const layout = LAYOUT_VALUES.includes(state.layout) ? state.layout : 'full';
  const offset = typeof state.offset === 'number' ? state.offset : 0.5;
  const out = [];

  for (let row = 0; row < columns; row++) {
    for (let col = 0; col < columns; col++) {
      const motif = (row * columns + col) % motifCount;

      let x = (col + 0.5) * cell;
      const y = (row + 0.5) * cell;
      let flipX = false;
      let flipY = false;

      if (layout === 'half') x += row % 2 ? cell * offset : 0;
      else if (layout === 'brick') x += row % 2 ? cell * 0.5 : 0;
      else if (layout === 'mirror') {
        flipX = col % 2 === 1;
        flipY = row % 2 === 1;
      }

      // Bring a shifted column back inside the tile, then place it again at
      // each wrapped offset so anything crossing an edge is drawn on both
      // sides of it.
      const baseX = ((x % tile) + tile) % tile;

      for (const dx of [0, -tile, tile]) {
        for (const dy of [0, -tile, tile]) {
          const px = baseX + dx;
          const py = y + dy;
          if (px + size / 2 <= 0 || px - size / 2 >= tile) continue;
          if (py + size / 2 <= 0 || py - size / 2 >= tile) continue;

          out.push({
            motif,
            x: px,
            y: py,
            size,
            rotation: state.rotation || 0,
            flipX,
            flipY,
            wrapped: dx !== 0 || dy !== 0
          });
        }
      }
    }
  }

  return out;
}

export default { LAYOUTS, LAYOUT_VALUES, gridFor, planRepeat };
