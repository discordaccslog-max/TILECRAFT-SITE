/*
 * Small DOM helpers shared by the Studio modules, plus the one-time load
 * of the module stylesheet.
 *
 * Everything here keeps to the Studio's own tokens, so modules inherit the
 * theme, the type, and both light and dark modes without restating them.
 */

export function el(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(typeof child === 'string' || typeof child === 'number' ? String(child) : child);
  }
  return node;
}

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/** Load the shared module stylesheet once per session. */
export function loadStyles() {
  const id = 'tilecraft-module-styles';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = new URL('./module.css', import.meta.url).href;
  document.head.append(link);
}

/** A labelled control row. */
export function field(labelText, control, hint) {
  const id = 'f' + Math.random().toString(36).slice(2, 9);
  control.id = id;
  return el('div', { class: 'ctl' }, [
    el('label', { class: 'ctl__label', for: id, text: labelText }),
    control,
    hint ? el('p', { class: 'ctl__hint', text: hint }) : null
  ]);
}

/** A range input that shows its value. */
export function slider(labelText, { min, max, step, value, format, onInput }) {
  const output = el('span', { class: 'ctl__value', text: format ? format(value) : String(value) });
  const input = el('input', {
    type: 'range',
    min: String(min),
    max: String(max),
    step: String(step),
    value: String(value)
  });
  input.addEventListener('input', () => {
    const next = Number(input.value);
    output.textContent = format ? format(next) : String(next);
    onInput(next);
  });

  const id = 'f' + Math.random().toString(36).slice(2, 9);
  input.id = id;

  return {
    node: el('div', { class: 'ctl' }, [
      el('div', { class: 'ctl__head' }, [
        el('label', { class: 'ctl__label', for: id, text: labelText }),
        output
      ]),
      input
    ]),
    set(next) {
      input.value = String(next);
      output.textContent = format ? format(next) : String(next);
    }
  };
}

/** A group of mutually exclusive buttons. */
export function segmented(options, value, onChange) {
  const group = el('div', { class: 'seg', role: 'group' });
  const buttons = options.map((option) =>
    el('button', {
      type: 'button',
      text: option.label,
      'aria-pressed': option.value === value ? 'true' : 'false',
      onclick: () => {
        for (const b of group.children) b.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-pressed', 'true');
        onChange(option.value);
      }
    })
  );
  let button;
  options.forEach((option, i) => {
    button = buttons[i];
    group.append(button);
  });
  return group;
}

/** A small checkbox with a label. */
export function toggle(labelText, value, onChange) {
  const input = el('input', { type: 'checkbox' });
  input.checked = !!value;
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { class: 'toggle' }, [input, el('span', { text: labelText })]);
}

/** Announce something to the person and to a screen reader. */
export function status(node, message, tone = 'ok') {
  node.textContent = message;
  node.className = 'module-status' + (tone === 'error' ? ' is-error' : tone === 'busy' ? ' is-busy' : '');
}

/** Wrap an async action so failures are reported rather than swallowed. */
export function guard(statusNode, context, run) {
  return async (...args) => {
    try {
      await run(...args);
    } catch (error) {
      console.error(error);
      status(statusNode, error.message || 'That did not work.', 'error');
      if (context && context.ui && context.ui.toast) {
        context.ui.toast(error.message || 'That did not work.', 'error');
      }
    }
  };
}

/** Debounce, for search fields and sliders that drive expensive redraws. */
export function debounce(fn, wait = 120) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

export default { el, $, $$, loadStyles, field, slider, segmented, toggle, status, guard, debounce };
