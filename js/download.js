/*
 * Tilecraft Digital — saving files from the browser.
 *
 * Studio modules receive these through their context, so a module never has
 * to build its own download plumbing.
 */

/** Save a Blob under a filename. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next turn of the event loop, once the click has been taken.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Save bytes under a filename, with a media type. */
export function downloadBytes(bytes, filename, type = 'application/octet-stream') {
  downloadBlob(new Blob([bytes], { type }), filename);
}

/** Save text under a filename. */
export function downloadText(text, filename, type = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([text], { type }), filename);
}

/** Save an object as formatted JSON. */
export function downloadJson(value, filename) {
  downloadText(JSON.stringify(value, null, 2), filename, 'application/json');
}

/** Save a canvas as a PNG. */
export function downloadCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, filename);
      resolve(!!blob);
    }, 'image/png');
  });
}

/**
 * Copy text to the clipboard, falling back to a hidden textarea when the
 * clipboard API is unavailable or refused.
 * @returns {Promise<boolean>}
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea route */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    area.style.pointerEvents = 'none';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export default { downloadBlob, downloadBytes, downloadText, downloadJson, downloadCanvas, copyText };
