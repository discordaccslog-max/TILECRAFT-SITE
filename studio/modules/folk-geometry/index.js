/*
 * folk-geometry
 *
 * A Collection module. Every Collection shares one workspace, in
 * ../_shared/viewer.mjs, because they do the same job over different
 * artwork: browse, recolor, preview tiled, see it on something, export.
 *
 * See MODULES.md for the contract this implements.
 */

import { mountCollection } from '../_shared/viewer.mjs';

export function mount(container, context) {
  return mountCollection(container, context, 'folk-geometry');
}

export default { mount };
