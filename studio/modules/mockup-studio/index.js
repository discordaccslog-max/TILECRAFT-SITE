/*
 * Mockup Studio
 *
 * Puts a pattern on something, so it can be judged at the size it will
 * actually be seen. Works on any pattern the buyer owns and on a tile they
 * bring in themselves, and writes the finished scene out as a PNG.
 *
 * A tile loaded from the buyer's own machine is read here and nowhere
 * else: it goes through an object URL into an <img> and onto a canvas.
 * An uploaded SVG is only ever drawn as an image, never inserted into the
 * page, so it cannot run script of its own.
 *
 * See MODULES.md for the contract this implements.
 */

import { el, loadStyles, field, slider, segmented, status, guard } from '../_shared/ui.mjs';
import { ALL_MOCKUPS, MOCKUPS, mockupSvg } from '../_shared/mockups.mjs';
import { loadCollection, asPattern, tileDataUri } from '../_shared/render.mjs';
import { makeZip } from '../_shared/zip.mjs';
import { licenseNote, safeName, setPngDpi } from '../_shared/export.mjs';

const COLLECTION_SLUGS = [
  'geometric-essentials', 'textures-and-grain', 'botanical-linework',
  'mid-century-shapes', 'tile-and-terrazzo', 'art-deco-lines',
  'stripes-and-rules', 'checks-and-weaves', 'waves-and-water',
  'stars-and-night', 'folk-geometry', 'arches-and-columns',
  'scallops-and-shells', 'confetti-and-specks', 'crystal-and-facet'
];

const SIZES = [
  { value: '1200', label: '1200 px' },
  { value: '2000', label: '2000 px' },
  { value: '3000', label: '3000 px' }
];

const MAX_BYTES = 12 * 1024 * 1024;

function titleFor(slug) {
  return slug.split('-').map((w) => (w === 'and' ? 'and' : w[0].toUpperCase() + w.slice(1))).join(' ');
}

/** Draw an SVG string to a canvas at the given width. */
async function svgToCanvas(svg, width, height) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('The scene could not be drawn.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function mount(container, context) {
  loadStyles();

  const hasPack = !!(context.options && context.options.has('mockup-pack'));
  const scenes = hasPack ? ALL_MOCKUPS : MOCKUPS;

  const state = {
    tileUri: '',
    tileName: 'pattern',
    scene: scenes[0].id,
    tileSize: 64,
    size: 2000,
    collection: '',
    index: 0,
    specs: []
  };

  const root = el('div', { class: 'mod' });
  const statusNode = el('p', { class: 'module-status', role: 'status' });

  /*
   * guard() wraps a function and hands the wrapper back rather than
   * running it, so every call site here invokes what it builds. Anything
   * that throws inside reports itself in the status line instead of
   * failing silently.
   */
  const withGuard = (run) => guard(statusNode, context, run)();
  const preview = el('div', { class: 'mockup mod__wide' });

  function draw() {
    preview.textContent = '';
    if (!state.tileUri) {
      preview.append(el('p', { class: 'hint', text: 'Pick a pattern, or load a tile of your own.' }));
      return;
    }
    preview.insertAdjacentHTML('afterbegin', mockupSvg(state.scene, state.tileUri, state.tileSize));
  }

  /* ---- Choosing a pattern from a Collection ---- */

  const owned = (context.unlocked || []).filter((slug) => COLLECTION_SLUGS.includes(slug));

  const collectionPicker = el('select', { class: 'browser__search' });
  collectionPicker.append(el('option', { value: '', text: owned.length ? 'Pick a Collection' : 'No Collections unlocked' }));
  for (const slug of owned) collectionPicker.append(el('option', { value: slug, text: titleFor(slug) }));

  const patternPicker = el('select', { class: 'browser__search' });

  async function openCollection(slug) {
    state.specs = [];
    patternPicker.textContent = '';
    if (!slug) return;

    const { specs, base } = await loadCollection(slug);
    state.specs = specs.map((spec) => asPattern(spec, base));
    state.collection = slug;
    specs.forEach((spec, i) => patternPicker.append(el('option', { value: String(i), text: spec.name })));
    await choosePattern(0);
  }

  async function choosePattern(index) {
    const pattern = state.specs[index];
    if (!pattern) return;
    state.index = index;
    state.tileName = pattern.name;
    state.tileUri = await tileDataUri(pattern, pattern.spec.colorways[0].colors, 320);
    draw();
  }

  collectionPicker.addEventListener('change', () =>
    withGuard(() => openCollection(collectionPicker.value))
  );
  patternPicker.addEventListener('change', () =>
    withGuard(() => choosePattern(Number(patternPicker.value)))
  );

  /* ---- Or a tile of the buyer's own ---- */

  const fileInput = el('input', {
    type: 'file',
    accept: 'image/png,image/jpeg,image/svg+xml',
    style: { display: 'none' }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    withGuard(async () => {
      if (file.size > MAX_BYTES) {
        throw new Error('That file is larger than 12 MB. Try a smaller tile.');
      }

      /*
       * The file is read through an object URL into an <img>, which is
       * the only thing that touches it. An SVG drawn this way cannot run
       * script or fetch anything, which is why it is never inserted into
       * the document.
       */
      const url = URL.createObjectURL(file);
      try {
        const image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('That file could not be read as an image.'));
          img.src = url;
        });

        const size = Math.max(16, Math.min(1024, image.naturalWidth || 512));
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        canvas.getContext('2d').drawImage(image, 0, 0, size, size);

        state.tileUri = canvas.toDataURL('image/png');
        state.tileName = file.name.replace(/\.[^.]+$/, '') || 'tile';
        collectionPicker.value = '';
        patternPicker.textContent = '';
        draw();
        status(statusNode, 'Loaded ' + file.name + '. It stays on this device.');
      } finally {
        URL.revokeObjectURL(url);
        fileInput.value = '';
      }
    });
  });

  /* ---- Export ---- */

  const exportButton = el('button', {
    type: 'button',
    class: 'button button--ink',
    text: 'Download this mockup',
    onclick: () => withGuard(async () => {
      if (!state.tileUri) throw new Error('There is nothing on the scene yet.');

      const scene = scenes.find((s) => s.id === state.scene) || scenes[0];
      const svg = mockupSvg(state.scene, state.tileUri, state.tileSize);
      const width = state.size;
      const height = Math.round((width * 380) / 520);
      const canvas = await svgToCanvas(svg, width, height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      let bytes = new Uint8Array(await blob.arrayBuffer());
      bytes = setPngDpi(bytes, 300);

      const base = safeName(state.tileName) + '-' + safeName(scene.label);
      const zip = makeZip([
        { name: base + '.png', data: bytes },
        {
          name: 'LICENSE.txt',
          data: licenseNote(context, {
            pattern: state.tileName,
            size: width + ' x ' + height + ' px at 300 DPI'
          })
        }
      ]);

      context.files.downloadBlob(zip, 'tilecraft-' + base + '.zip');
      status(statusNode, 'Downloaded ' + scene.label + ' at ' + width + ' x ' + height + ' pixels.');
    })
  });

  /* ---- Layout ---- */

  const sceneChooser = el('div', { class: 'chips' });
  for (const scene of scenes) {
    sceneChooser.append(el('button', {
      type: 'button',
      class: 'chip',
      'aria-pressed': String(scene.id === state.scene),
      text: scene.label,
      onclick: () => {
        state.scene = scene.id;
        for (const chip of sceneChooser.querySelectorAll('.chip')) {
          chip.setAttribute('aria-pressed', String(chip.textContent === scene.label));
        }
        draw();
      }
    }));
  }

  const panel = el('div', { class: 'panel' }, [
    el('h3', { class: 'panel__title', text: 'What to show' }),
    field('Collection', collectionPicker),
    field('Pattern', patternPicker),
    el('p', { class: 'panel__row' }, [
      el('button', {
        type: 'button',
        class: 'button button--small',
        text: 'Load my own tile',
        onclick: () => fileInput.click()
      })
    ]),
    el('p', {
      class: 'hint',
      text: 'PNG, JPEG or SVG, up to 12 MB. Your file is read by this browser and is not uploaded.'
    }),

    el('h3', { class: 'panel__title', text: 'Scene' }),
    sceneChooser,
    hasPack
      ? el('p', { class: 'hint', text: 'Twelve scenes, including the extra pack on your license.' })
      : el('p', { class: 'hint', text: 'Six scenes. The extra mockup pack adds six more.' }),

    slider('Repeat size in the scene', {
      min: 12,
      max: 220,
      step: 2,
      value: state.tileSize,
      format: (v) => v + ' units',
      onInput: (v) => {
        state.tileSize = v;
        draw();
      }
    }).node,

    el('h3', { class: 'panel__title', text: 'Export' }),
    field('Width', segmented(SIZES, String(state.size), (value) => {
      state.size = Number(value);
    })),
    el('p', { class: 'panel__row' }, [exportButton]),
    fileInput
  ]);

  root.append(
    el('div', { class: 'mod mod--split' }, [panel, el('div', { class: 'mod__main' }, [preview])]),
    statusNode
  );
  container.append(root);

  if (owned.length) {
    collectionPicker.value = owned[0];
    await openCollection(owned[0]);
  }
  draw();

  return () => {};
}

export default { mount };
