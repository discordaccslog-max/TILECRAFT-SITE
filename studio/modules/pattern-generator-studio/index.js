/*
 * Pattern Generator Studio
 *
 * Makes new seamless patterns from adjustable settings rather than
 * supplying a fixed set. Every result carries a seed, so a pattern can be
 * recreated exactly, and a saved favorite stores the settings and the seed
 * together — which is the whole point of saving one.
 *
 * It reuses the shared stage, palette editor, mockups, and exporter, so a
 * generated pattern behaves exactly like a Collection pattern downstream.
 */

import { el, loadStyles, slider, segmented, toggle, status, guard, debounce } from '../_shared/ui.mjs';
import { asPattern, tileDataUri, colorsOf } from '../_shared/render.mjs';
import {
  createStage, createColorways, createMockups, createExportPanel
} from '../_shared/viewer.mjs';
import { generateSpec, randomSeed, MOTIFS, LAYOUTS, DEFAULTS } from './generate.mjs';

const PALETTES = [
  { name: 'Riso', colors: { bg: '#f7f2e8', ink: '#14172a', accent: '#ef3c80', accent2: '#00b2ad' } },
  { name: 'Night Press', colors: { bg: '#141124', ink: '#f4efe3', accent: '#ff5c9b', accent2: '#2fe3d6' } },
  { name: 'Clay', colors: { bg: '#f3e7dc', ink: '#4a3328', accent: '#c96f4a', accent2: '#8aa07c' } },
  { name: 'Slate', colors: { bg: '#eef1f4', ink: '#232b36', accent: '#4a7ba7', accent2: '#8f9bab' } },
  { name: 'Sage', colors: { bg: '#eff3ec', ink: '#2b3a2f', accent: '#6f9173', accent2: '#b9a06b' } },
  { name: 'Monochrome', colors: { bg: '#ffffff', ink: '#111111', accent: '#555555', accent2: '#999999' } }
];

export async function mount(container, context) {
  loadStyles();

  const statusNode = el('p', { class: 'module-status', role: 'status' });

  const saved = {
    favorites: (await context.storage.get('favorites')) || [],
    last: await context.storage.get('last')
  };

  let settings = { ...DEFAULTS, ...(saved.last ? saved.last.settings : {}) };
  let seed = (saved.last && saved.last.seed) || randomSeed();
  let colors = { ...PALETTES[0].colors };
  let colorwayName = PALETTES[0].name;
  let custom = (await context.storage.get('colorways')) || [];
  let pattern = null;
  let currentUri = '';

  /* ---- Pieces ---- */

  const stage = createStage({ initialTile: 170 });
  const mockups = createMockups();

  const colorways = createColorways({
    onChange: (way, isEdit) => {
      colors = { ...way.colors };
      colorwayName = isEdit ? 'Custom' : way.name;
      renderColorways();
      refresh();
    },
    onSave: async (name) => {
      custom.push({ name, colors: { ...colors } });
      await context.storage.set('colorways', custom);
      colorwayName = name;
      renderColorways();
      status(statusNode, 'Saved the colorway "' + name + '".');
    },
    onRemove: async (way) => {
      custom = custom.filter((c) => c.name !== way.name);
      await context.storage.set('colorways', custom);
      renderColorways();
    }
  });

  const exportPanel = createExportPanel({
    context,
    getPattern: () => pattern,
    getColors: () => colors,
    getColorwayName: () => colorwayName,
    statusNode
  });

  function renderColorways() {
    colorways.render({
      colorways: PALETTES.map((p) => ({ ...p, custom: false })).concat(custom.map((c) => ({ ...c, custom: true }))),
      activeName: colorwayName,
      colors,
      slots: ['bg', 'ink', 'accent']
    });
  }

  /* ---- Generation ---- */

  const refresh = debounce(async () => {
    const spec = generateSpec(settings, seed, [{ name: colorwayName, colors }]);
    pattern = asPattern(spec, '');
    currentUri = await tileDataUri(pattern, colors);
    stage.setTile(currentUri);
    stage.setCaption('Seed ' + seed + ' · ' + settings.motif + ' · one repeat is ' + stage.size + 'px');
    mockups.render(currentUri, Math.max(10, Math.round(stage.size / 3)));
    seedInput.value = seed;
    await context.storage.set('last', { settings, seed });
    context.ui.setStatus('Seed ' + seed);
  }, 50);

  /* ---- Controls ---- */

  const seedInput = el('input', {
    type: 'text', value: seed, 'aria-label': 'Seed', class: 'browser__search',
    style: { flex: '1 1 8rem', fontFamily: 'var(--font-mono)' }
  });
  seedInput.addEventListener('change', () => {
    const next = seedInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!next) {
      seedInput.value = seed;
      return;
    }
    seed = next;
    refresh();
  });

  const motifSelect = el('select');
  for (const m of MOTIFS) motifSelect.append(el('option', { value: m.value, text: m.label }));
  motifSelect.value = settings.motif;
  motifSelect.addEventListener('change', () => {
    settings.motif = motifSelect.value;
    refresh();
  });

  const controls = [
    el('div', { class: 'ctl' }, [
      el('label', { class: 'ctl__label', text: 'Motif', for: 'gen-motif' }),
      motifSelect
    ]),
    el('div', { class: 'ctl' }, [
      el('span', { class: 'ctl__label', text: 'Layout' }),
      segmented(LAYOUTS, settings.layout, (value) => {
        settings.layout = value;
        refresh();
      })
    ])
  ];
  motifSelect.id = 'gen-motif';

  const sliders = [
    ['Density', 'density', 2, 14, 1, (v) => v + ' across'],
    ['Scale', 'scale', 0.1, 1, 0.01, (v) => Math.round(v * 100) + '%'],
    ['Rotation', 'rotation', 0, 180, 1, (v) => v + '°'],
    ['Spacing', 'spacing', 0, 0.8, 0.01, (v) => Math.round(v * 100) + '%'],
    ['Looseness', 'jitter', 0, 1, 0.01, (v) => Math.round(v * 100) + '%'],
    ['Line weight', 'weight', 0, 1, 0.01, (v) => Math.round(v * 100) + '%'],
    ['Accent share', 'accentShare', 0, 1, 0.01, (v) => Math.round(v * 100) + '%']
  ];

  const sliderControls = {};
  for (const [label, key, min, max, step, format] of sliders) {
    const control = slider(label, {
      min, max, step, value: settings[key], format,
      onInput: (value) => {
        settings[key] = value;
        refresh();
      }
    });
    sliderControls[key] = control;
    controls.push(control.node);
  }

  function applySettings(next, nextSeed) {
    settings = { ...DEFAULTS, ...next };
    if (nextSeed) seed = nextSeed;
    motifSelect.value = settings.motif;
    for (const [, key] of sliders.map((s) => [s[0], s[1]])) {
      if (sliderControls[key]) sliderControls[key].set(settings[key]);
    }
    // The layout buttons are rebuilt so the pressed state follows.
    layoutHost.textContent = '';
    layoutHost.append(segmented(LAYOUTS, settings.layout, (value) => {
      settings.layout = value;
      refresh();
    }));
    refresh();
  }

  const layoutHost = el('span');
  controls[1].replaceChild(layoutHost, controls[1].lastChild);
  layoutHost.append(segmented(LAYOUTS, settings.layout, (value) => {
    settings.layout = value;
    refresh();
  }));

  const randomiseButton = el('button', {
    type: 'button', class: 'btn btn--primary', text: 'Randomize',
    onclick: () => {
      seed = randomSeed();
      // Randomize explores within whatever is currently set, so the motif
      // and layout the buyer chose are kept.
      settings = {
        ...settings,
        density: 2 + Math.floor(Math.random() * 10),
        scale: 0.2 + Math.random() * 0.7,
        rotation: Math.floor(Math.random() * 181),
        spacing: Math.random() * 0.6,
        jitter: Math.random() * 0.8,
        weight: 0.1 + Math.random() * 0.8,
        accentShare: Math.random() * 0.6
      };
      applySettings(settings, seed);
      status(statusNode, 'New pattern from seed ' + seed + '.');
    }
  });

  const newSeedButton = el('button', {
    type: 'button', class: 'btn', text: 'New seed',
    onclick: () => {
      seed = randomSeed();
      refresh();
    }
  });

  /* ---- Favorites ---- */

  const favList = el('div', { class: 'ways' });

  function renderFavorites() {
    favList.textContent = '';
    if (!saved.favorites.length) {
      favList.append(el('p', { class: 'hint hint--inline', text: 'Nothing saved yet. Save a pattern you like and it comes back with its settings and its seed.' }));
      return;
    }
    for (const fav of saved.favorites) {
      favList.append(el('button', {
        type: 'button', class: 'way', title: 'Seed ' + fav.seed,
        onclick: () => {
          applySettings(fav.settings, fav.seed);
          status(statusNode, 'Loaded "' + fav.name + '".');
        }
      }, [
        el('span', { text: fav.name }),
        el('span', {
          class: 'way__remove', role: 'button', tabindex: '0', title: 'Remove', text: '×',
          onclick: async (event) => {
            event.stopPropagation();
            saved.favorites = saved.favorites.filter((f) => f !== fav);
            await context.storage.set('favorites', saved.favorites);
            renderFavorites();
          }
        })
      ]));
    }
  }

  const favNameInput = el('input', { type: 'text', class: 'browser__search', placeholder: 'Name this pattern', style: { flex: '1 1 9rem' } });
  const saveFavButton = el('button', {
    type: 'button', class: 'btn', text: 'Save to favorites',
    onclick: guard(statusNode, context, async () => {
      const name = favNameInput.value.trim() || settings.motif + ' ' + seed.slice(0, 4);
      favNameInput.value = '';
      saved.favorites.push({ name, seed, settings: { ...settings } });
      await context.storage.set('favorites', saved.favorites);
      renderFavorites();
      status(statusNode, 'Saved "' + name + '". It keeps the settings and the seed.');
    })
  });

  /* ---- Layout ---- */

  const zoomControl = slider('Pattern scale', {
    min: 30, max: 480, step: 2, value: 170,
    format: (v) => v + 'px',
    onInput: (v) => {
      stage.setSize(v);
      stage.setCaption('Seed ' + seed + ' · ' + settings.motif + ' · one repeat is ' + v + 'px');
      if (currentUri) mockups.render(currentUri, Math.max(10, Math.round(v / 3)));
    }
  });

  const left = el('div', {}, [
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Settings' }),
      ...controls,
      el('div', { class: 'ctl' }, [
        el('label', { class: 'ctl__label', text: 'Seed', for: seedInput.id || 'gen-seed' }),
        el('div', { class: 'panel__row' }, [seedInput]),
        el('p', { class: 'ctl__hint', text: 'The same seed and settings always make the same pattern. Type one in to get a result back.' })
      ]),
      el('div', { class: 'panel__row', style: { marginTop: '0.85rem' } }, [randomiseButton, newSeedButton])
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Favorites' }),
      favList,
      el('div', { class: 'panel__row', style: { marginTop: '0.75rem' } }, [favNameInput, saveFavButton])
    ])
  ]);

  seedInput.id = 'gen-seed';

  const right = el('div', {}, [
    el('div', { class: 'panel' }, [
      stage.node,
      el('div', { style: { marginTop: '0.85rem' } }, [
        zoomControl.node,
        el('div', { class: 'panel__row', style: { marginTop: '0.6rem' } }, [
          toggle('Outline one repeat', false, (on) => stage.setOutline(on))
        ])
      ])
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Colorways' }),
      colorways.node
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'On products' }),
      mockups.node,
      el('p', { class: 'hint', text: 'Drawn illustrations, shown so you can judge scale. Test print before a long run — a screen is not a printer.' })
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Export' }),
      exportPanel.node,
      statusNode
    ])
  ]);

  container.append(el('div', { class: 'mod mod--split' }, [left, right]));

  renderColorways();
  renderFavorites();
  await refresh();

  return () => {};
}

export default { mount };
