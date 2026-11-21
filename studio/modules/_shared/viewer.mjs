/*
 * The shared pattern workspace.
 *
 * All five Collection modules are this file with a different slug, and the
 * Pattern Generator and Repeat Builder reuse its parts — the tiling stage,
 * the palette editor, the mockups, and the export panel — around their own
 * sources of patterns. Building it once means a fix to the preview or to
 * an export reaches every product at the same time.
 */

import { el, loadStyles, slider, segmented, toggle, status, guard, debounce } from './ui.mjs';
import {
  loadCollection, asPattern, tileDataUri, slotsOf, colorsOf, renderTile
} from './render.mjs';
import { MOCKUPS, ALL_MOCKUPS, mockupSvg } from './mockups.mjs';
import { exportPattern, maxExportSize, describeLimit, safeName } from './export.mjs';
import { makeZip } from './zip.mjs';

/* ------------------------------------------------------------------ *
 * The tiling stage
 * ------------------------------------------------------------------ */

/**
 * A live, infinitely tiling preview.
 *
 * The tile is a CSS background rather than a canvas, so the browser does
 * the repeating: zooming and resizing stay smooth however large the area
 * gets, and the single-repeat outline is just a second background drawn at
 * the same size.
 */
export function createStage({ initialTile = 150 } = {}) {
  const surface = el('div', { class: 'stage__surface' });
  const outline = el('div', { class: 'stage__outline', 'data-on': 'false' });
  const caption = el('p', { class: 'stage__caption', text: '' });
  const node = el('div', { class: 'stage' }, [surface, outline, caption]);

  let tilePx = initialTile;
  let uri = '';

  const apply = () => {
    surface.style.backgroundImage = uri ? 'url("' + uri + '")' : 'none';
    surface.style.backgroundSize = tilePx + 'px ' + tilePx + 'px';
    outline.style.backgroundSize = tilePx + 'px ' + tilePx + 'px';
  };

  return {
    node,
    setTile(dataUri) {
      uri = dataUri;
      apply();
    },
    setSize(px) {
      tilePx = Math.max(8, Math.round(px));
      apply();
    },
    get size() {
      return tilePx;
    },
    setOutline(on) {
      outline.dataset.on = on ? 'true' : 'false';
    },
    setCaption(text) {
      caption.textContent = text;
    }
  };
}

/* ------------------------------------------------------------------ *
 * Colorways
 * ------------------------------------------------------------------ */

/**
 * The colorway chooser and palette editor.
 *
 * Curated colorways come from the pattern; anything the buyer mixes can be
 * saved and comes back next time, because it is written to the module's
 * own storage and so travels in the Studio's backup.
 */
export function createColorways({ onChange, onSave, onRemove }) {
  const list = el('div', { class: 'ways' });
  const slotsHost = el('div', { class: 'slots' });
  const saveRow = el('div', { class: 'panel__row', style: { marginTop: '0.75rem' } });

  const nameInput = el('input', {
    type: 'text',
    placeholder: 'Name this colorway',
    'aria-label': 'Name for a saved colorway',
    maxlength: '40'
  });
  nameInput.className = 'browser__search';
  nameInput.style.flex = '1 1 9rem';

  const saveButton = el('button', {
    type: 'button',
    class: 'btn',
    text: 'Save colorway',
    onclick: () => {
      const name = nameInput.value.trim() || 'Custom ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      nameInput.value = '';
      onSave(name);
    }
  });

  saveRow.append(nameInput, saveButton);

  const node = el('div', {}, [list, slotsHost, saveRow]);

  function render({ colorways, activeName, colors, slots }) {
    list.textContent = '';
    for (const way of colorways) {
      const dots = el('span', { class: 'way__dots' },
        ['bg', 'ink', 'accent', 'accent2']
          .filter((s) => way.colors[s])
          .map((s) => el('span', { class: 'way__dot', style: { background: way.colors[s] } }))
      );

      const button = el('button', {
        type: 'button',
        class: 'way',
        'aria-pressed': way.name === activeName ? 'true' : 'false',
        onclick: () => onChange(way)
      }, [dots, el('span', { text: way.name })]);

      if (way.custom) {
        button.append(el('span', {
          class: 'way__remove',
          role: 'button',
          tabindex: '0',
          title: 'Remove this saved colorway',
          text: '×',
          onclick: (event) => {
            event.stopPropagation();
            onRemove(way);
          },
          onkeydown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              onRemove(way);
            }
          }
        }));
      }

      list.append(button);
    }

    slotsHost.textContent = '';
    for (const slot of slots) {
      const input = el('input', { type: 'color', value: colors[slot] || '#000000' });
      input.addEventListener('input', () => onChange({ name: 'Custom', colors: { ...colors, [slot]: input.value } }, true));
      slotsHost.append(el('label', { class: 'slot' }, [el('span', { text: slot }), input]));
    }
  }

  return { node, render };
}

/* ------------------------------------------------------------------ *
 * Mockups
 * ------------------------------------------------------------------ */

/**
 * The strip of scenes a pattern can be tried on.
 *
 * @param {object} [options]
 *   scenes: which scenes to show. Defaults to the six every product
 *   includes; pass ALL_MOCKUPS when the license carries the mockup pack.
 */
export function createMockups({ scenes = MOCKUPS } = {}) {
  const node = el('div', { class: 'mockups' });

  return {
    node,
    render(tileUri, tileSize) {
      node.textContent = '';
      for (const mockup of scenes) {
        const holder = el('div', { class: 'mockup' });
        holder.insertAdjacentHTML('afterbegin', mockupSvg(mockup.id, tileUri, tileSize));
        holder.append(el('p', { class: 'mockup__label', text: mockup.label }));
        node.append(holder);
      }
    }
  };
}

/* ------------------------------------------------------------------ *
 * Export panel
 * ------------------------------------------------------------------ */

export function createExportPanel({ context, getPattern, getColors, getColorwayName, getAllPatterns, statusNode }) {
  let mode = 'tile';
  let format = 'png';
  let size = 2048;
  let repeats = 4;
  let transparent = false;
  let limit = 8192;

  const sizeSelect = el('select');
  const repeatsRow = el('div');
  const transparentRow = el('div');

  /*
   * Extras bought at checkout. Each button only exists when the license
   * carries the extra, so nobody is shown a control that would refuse
   * them — and each one produces a real file rather than a promise of one.
   */
  const extrasRow = el('div');
  const held = (id) => !!(context.options && context.options.has(id));

  if (held('print-specs') || held('palette-files') || held('seam-report')) {
    extrasRow.append(el('p', { class: 'panel__title', style: { marginTop: '1.1rem' }, text: 'Your extras' }));
    const buttons = el('div', { class: 'panel__row' });

    if (held('print-specs')) {
      buttons.append(el('button', {
        type: 'button',
        class: 'btn',
        text: 'Spec sheet',
        onclick: guard(statusNode, context, async () => {
          const pattern = getPattern();
          const { specSheet } = await import('./extras.mjs');
          const doc = specSheet(pattern, context, { collection: context.product.name });
          context.files.downloadBlob(doc.toBlob(), 'tilecraft-' + safeName(pattern.name) + '-spec.pdf');
          status(statusNode, 'Downloaded the print specification for ' + pattern.name + '.');
        })
      }));
    }

    if (held('palette-files')) {
      buttons.append(el('button', {
        type: 'button',
        class: 'btn',
        text: 'Palette files',
        onclick: guard(statusNode, context, async () => {
          const pattern = getPattern();
          const { paletteEntries } = await import('./extras.mjs');
          const entries = await paletteEntries(pattern.spec.colorways, pattern.name, context);
          context.files.downloadBlob(makeZip(entries), 'tilecraft-' + safeName(pattern.name) + '-palettes.zip');
          status(statusNode, 'Downloaded the palettes for ' + pattern.name + '.');
        })
      }));
    }

    if (held('seam-report')) {
      buttons.append(el('button', {
        type: 'button',
        class: 'btn',
        text: 'Seam report',
        onclick: guard(statusNode, context, async () => {
          status(statusNode, 'Measuring every repeat…', 'busy');
          const { seamReport } = await import('./extras.mjs');
          const doc = await seamReport(getAllPatterns(), context, { collection: context.product.name });
          context.files.downloadBlob(doc.toBlob(), 'tilecraft-' + safeName(context.product.name) + '-seams.pdf');
          status(statusNode, 'Downloaded the seam report.');
        })
      }));
    }

    extrasRow.append(buttons);
  }

  const sizeOptions = [512, 1024, 2048, 3000, 4096, 6000, 8192, 12000, 16384];

  function fillSizes() {
    sizeSelect.textContent = '';
    for (const option of sizeOptions) {
      if (option > limit) continue;
      sizeSelect.append(el('option', { value: String(option), text: option + ' px' }));
    }
    if (!sizeOptions.filter((o) => o <= limit).includes(size)) {
      size = Math.max(...sizeOptions.filter((o) => o <= limit));
    }
    sizeSelect.value = String(size);
  }

  sizeSelect.addEventListener('change', () => {
    size = Number(sizeSelect.value);
  });

  const repeatsControl = slider('Repeats across', {
    min: 1, max: 12, step: 1, value: repeats,
    format: (v) => v + ' x ' + v,
    onInput: (v) => {
      repeats = v;
    }
  });
  repeatsRow.append(repeatsControl.node);

  const transparentToggle = toggle('Transparent background', transparent, (v) => {
    transparent = v;
  });
  transparentRow.append(transparentToggle);

  const limitNote = el('p', { class: 'hint', text: 'Checking the largest export this device can handle.' });

  const downloadButton = el('button', { class: 'btn btn--primary', type: 'button', text: 'Download' });

  const node = el('div', {}, [
    el('div', { class: 'ctl' }, [
      el('span', { class: 'ctl__label', text: 'What to export' }),
      segmented(
        [
          { value: 'tile', label: 'Single tile' },
          { value: 'sheet', label: 'Swatch sheet' }
        ],
        mode,
        (value) => {
          mode = value;
          repeatsRow.hidden = value !== 'sheet';
        }
      )
    ]),
    el('div', { class: 'ctl' }, [
      el('span', { class: 'ctl__label', text: 'Format' }),
      segmented(
        [
          { value: 'png', label: 'PNG' },
          { value: 'jpeg', label: 'JPEG' },
          { value: 'svg', label: 'SVG' }
        ],
        format,
        (value) => {
          format = value;
          transparentRow.hidden = value === 'jpeg';
        }
      )
    ]),
    el('div', { class: 'ctl' }, [
      el('label', { class: 'ctl__label', text: 'Pixel size', for: 'exp-size' }),
      sizeSelect
    ]),
    repeatsRow,
    transparentRow,
    limitNote,
    el('div', { class: 'panel__row', style: { marginTop: '0.85rem' } }, [downloadButton]),
    extrasRow
  ]);

  sizeSelect.id = 'exp-size';
  repeatsRow.hidden = true;

  maxExportSize().then((value) => {
    limit = value;
    fillSizes();
    limitNote.textContent =
      'Largest export this device handles: ' + describeLimit(value) +
      '. Sizes above that are not offered, so an export cannot fail silently.';
  });

  fillSizes();

  downloadButton.addEventListener('click', guard(statusNode, context, async () => {
    const pattern = getPattern();
    if (!pattern) throw new Error('Choose a pattern first.');
    if (format === 'svg' && !pattern.isVector) {
      throw new Error('This is a texture, which is a raster tile. Export it as PNG or JPEG.');
    }

    downloadButton.disabled = true;
    status(statusNode, 'Preparing the download…', 'busy');

    try {
      const width = mode === 'sheet' ? size : size;
      const tilePixels = mode === 'sheet' ? Math.max(8, Math.round(size / repeats)) : size;

      const result = await exportPattern({
        pattern,
        colors: getColors(),
        colorwayName: getColorwayName(),
        context,
        width,
        height: width,
        tilePixels,
        format,
        transparent: transparent && format !== 'jpeg',
        dpi: 300
      });

      context.files.downloadBlob(result.blob, result.filename);
      status(statusNode, 'Downloaded ' + result.filename + ' — the zip includes your license note.');
    } finally {
      downloadButton.disabled = false;
    }
  }));

  return { node };
}

/* ------------------------------------------------------------------ *
 * The collection workspace
 * ------------------------------------------------------------------ */

export async function mountCollection(container, context, slug) {
  loadStyles();

  const statusNode = el('p', { class: 'module-status', role: 'status' });
  container.append(el('p', { class: 'hint', text: 'Loading the collection…' }));

  const { specs, base } = await loadCollection(slug);
  const patterns = specs.map((spec) => asPattern(spec, '/patterns/' + slug + '/'));
  void base;

  const saved = {
    favorites: new Set((await context.storage.get('favorites')) || []),
    colorways: (await context.storage.get('colorways')) || {}
  };
  const lastId = await context.storage.get('lastPattern');

  container.textContent = '';

  /* ---- State ---- */

  let selected = patterns.find((p) => p.id === lastId) || patterns[0];
  let colors = colorsOf(selected.spec, 0);
  let colorwayName = selected.spec.colorways[0].name;
  let search = '';
  let activeTags = new Set();
  let showFavourites = false;

  /* ---- Pieces ---- */

  const stage = createStage({ initialTile: 150 });
  // The extra scenes appear only for a license that carries the pack.
  const mockups = createMockups({
    scenes: context.options && context.options.has('mockup-pack') ? ALL_MOCKUPS : MOCKUPS
  });
  const colorways = createColorways({
    onChange: (way, isEdit) => {
      colors = { ...way.colors };
      colorwayName = isEdit ? 'Custom' : way.name;
      refreshPreview();
      renderColorways();
    },
    onSave: async (name) => {
      const list = saved.colorways[selected.id] || [];
      list.push({ name, colors: { ...colors } });
      saved.colorways[selected.id] = list;
      await context.storage.set('colorways', saved.colorways);
      colorwayName = name;
      renderColorways();
      status(statusNode, 'Saved the colorway "' + name + '".');
    },
    onRemove: async (way) => {
      const list = (saved.colorways[selected.id] || []).filter((c) => c.name !== way.name);
      saved.colorways[selected.id] = list;
      await context.storage.set('colorways', saved.colorways);
      renderColorways();
      status(statusNode, 'Removed "' + way.name + '".');
    }
  });

  const exportPanel = createExportPanel({
    context,
    getPattern: () => selected,
    getColors: () => colors,
    getColorwayName: () => colorwayName,
    getAllPatterns: () => patterns,
    statusNode
  });

  /* ---- Browser ---- */

  const searchInput = el('input', {
    type: 'search',
    class: 'browser__search',
    placeholder: 'Search ' + patterns.length + ' patterns',
    'aria-label': 'Search patterns by name or tag'
  });
  searchInput.addEventListener('input', debounce(() => {
    search = searchInput.value.trim().toLowerCase();
    renderGrid();
  }, 140));

  const allTags = [...new Set(patterns.flatMap((p) => p.tags))].sort();
  const chips = el('div', { class: 'chips' }, [
    el('button', {
      type: 'button', class: 'chip', text: 'Favorites', 'aria-pressed': 'false',
      onclick: (event) => {
        showFavourites = !showFavourites;
        event.currentTarget.setAttribute('aria-pressed', showFavourites ? 'true' : 'false');
        renderGrid();
      }
    }),
    ...allTags.map((tag) =>
      el('button', {
        type: 'button', class: 'chip', text: tag, 'aria-pressed': 'false',
        onclick: (event) => {
          if (activeTags.has(tag)) activeTags.delete(tag);
          else activeTags.add(tag);
          event.currentTarget.setAttribute('aria-pressed', activeTags.has(tag) ? 'true' : 'false');
          renderGrid();
        }
      })
    )
  ]);

  const grid = el('div', { class: 'grid', role: 'listbox', 'aria-label': 'Patterns' });

  function matches(pattern) {
    if (showFavourites && !saved.favorites.has(pattern.id)) return false;
    if (activeTags.size && !pattern.tags.some((t) => activeTags.has(t))) return false;
    if (!search) return true;
    return (
      pattern.name.toLowerCase().includes(search) ||
      pattern.tags.some((t) => t.includes(search))
    );
  }

  async function renderGrid() {
    const visible = patterns.filter(matches);
    grid.textContent = '';

    if (!visible.length) {
      grid.append(el('p', { class: 'grid__empty', text: 'Nothing matches that. Clear the search or the filters.' }));
      return;
    }

    for (const pattern of visible) {
      const button = el('button', {
        type: 'button',
        class: 'swatch',
        role: 'option',
        title: pattern.name,
        'aria-pressed': pattern.id === selected.id ? 'true' : 'false',
        'aria-label': pattern.name,
        onclick: () => choose(pattern),
        oncontextmenu: (event) => {
          event.preventDefault();
          toggleFavourite(pattern);
        }
      }, [
        el('span', { class: 'swatch__name', text: pattern.name }),
        saved.favorites.has(pattern.id) ? el('span', { class: 'swatch__fav', text: '★', 'aria-hidden': 'true' }) : null
      ]);

      grid.append(button);

      // Thumbnails load in the pattern's own first colorway so the grid
      // shows the collection as designed, not as currently recolored.
      tileDataUri(
        pattern,
        colorsOf(pattern.spec, 0),
        pattern.isVector ? 0 : 128
      ).then((uri) => {
        button.style.backgroundImage = 'url("' + uri + '")';
      }).catch(() => {});
    }
  }

  async function toggleFavourite(pattern) {
    if (saved.favorites.has(pattern.id)) saved.favorites.delete(pattern.id);
    else saved.favorites.add(pattern.id);
    await context.storage.set('favorites', [...saved.favorites]);
    renderGrid();
  }

  /* ---- Selection ---- */

  /*
   * Four curated colorways come with every Collection and four more with
   * the extra colorway set. All eight are generated together and shipped
   * in the same file, because splitting them across two downloads would
   * mean two sets that drift apart; which of them this device may use is
   * decided here, from the license.
   */
  const INCLUDED_COLORWAYS = 4;
  const hasExtraColorways = !!(context.options && context.options.has('extra-colorways'));

  function colorwaysFor(pattern) {
    const all = pattern.spec.colorways;
    const allowed = hasExtraColorways ? all : all.slice(0, INCLUDED_COLORWAYS);
    const curated = allowed.map((c) => ({ ...c, custom: false }));
    const custom = (saved.colorways[pattern.id] || []).map((c) => ({ ...c, custom: true }));
    return curated.concat(custom);
  }

  function renderColorways() {
    colorways.render({
      colorways: colorwaysFor(selected),
      activeName: colorwayName,
      colors,
      slots: slotsOf(selected.spec)
    });
  }

  async function choose(pattern) {
    selected = pattern;
    colors = colorsOf(pattern.spec, 0);
    colorwayName = pattern.spec.colorways[0].name;
    await context.storage.set('lastPattern', pattern.id);
    title.textContent = pattern.name;
    meta.textContent =
      (pattern.isVector ? 'Vector pattern' : 'Texture tile') +
      ' · ' + pattern.tags.join(', ') +
      ' · ' + colorwaysFor(pattern).length + ' colorways';
    favButton.setAttribute('aria-pressed', saved.favorites.has(pattern.id) ? 'true' : 'false');
    renderColorways();
    renderGrid();
    await refreshPreview();
  }

  let currentUri = '';

  const refreshPreview = debounce(async () => {
    const uri = await tileDataUri(selected, colors, selected.isVector ? 0 : 512);
    currentUri = uri;
    stage.setTile(uri);
    stage.setCaption(selected.name + ' · ' + colorwayName + ' · one repeat is ' + stage.size + 'px');
    mockups.render(uri, Math.max(10, Math.round(stage.size / 3)));
  }, 60);

  /* ---- Layout ---- */

  const title = el('h2', { style: { fontSize: 'var(--step-1)' }, text: selected.name });
  const meta = el('p', { class: 'hint hint--inline', text: '' });

  const favButton = el('button', {
    type: 'button', class: 'btn', text: '★ Favorite',
    'aria-pressed': 'false',
    onclick: () => toggleFavourite(selected).then(() => {
      favButton.setAttribute('aria-pressed', saved.favorites.has(selected.id) ? 'true' : 'false');
    })
  });

  const zoomControl = slider('Pattern scale', {
    min: 30, max: 480, step: 2, value: 150,
    format: (v) => v + 'px',
    onInput: (v) => {
      stage.setSize(v);
      stage.setCaption(selected.name + ' · ' + colorwayName + ' · one repeat is ' + v + 'px');
      if (currentUri) mockups.render(currentUri, Math.max(10, Math.round(v / 3)));
    }
  });

  const outlineToggle = toggle('Outline one repeat', false, (on) => stage.setOutline(on));

  const left = el('div', {}, [
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Patterns' }),
      el('div', { class: 'browser__tools' }, [searchInput, chips]),
      grid
    ])
  ]);

  const right = el('div', {}, [
    el('div', { class: 'panel' }, [
      el('div', { class: 'panel__row', style: { justifyContent: 'space-between', marginBottom: '0.75rem' } }, [
        el('div', {}, [title, meta]),
        favButton
      ]),
      stage.node,
      el('div', { style: { marginTop: '0.85rem' } }, [zoomControl.node, el('div', { class: 'panel__row', style: { marginTop: '0.6rem' } }, [outlineToggle])])
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Colorways' }),
      colorways.node
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'On products' }),
      mockups.node,
      el('p', { class: 'hint', text: 'Drawn illustrations, shown so you can judge scale. Colors on a screen are not what a printer will produce — test print before a long run.' })
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Export' }),
      exportPanel.node,
      statusNode
    ])
  ]);

  container.append(el('div', { class: 'mod mod--split' }, [left, right]));

  await choose(selected);
  renderGrid();

  return () => {
    // Nothing is left running: the stage is CSS, and every listener lives
    // on nodes the Studio is about to remove.
  };
}

export { safeName, renderTile };
export default { mountCollection, createStage, createColorways, createMockups, createExportPanel };
