/*
 * The export limit, for the storefront.
 *
 * Production Studio measures what a device can really produce, because a
 * canvas past the browser's limit does not throw — it silently returns
 * blank pixels. The product page quotes a figure that was tested rather
 * than assumed, and then measures this visitor's own device so they see
 * what they will actually get.
 */

export const TESTED_MAXIMUM = 16384;

/** The figure the product page states, tested on a desktop browser. */
export function testedLabel() {
  return TESTED_MAXIMUM.toLocaleString('en-US') + ' × ' + TESTED_MAXIMUM.toLocaleString('en-US') + ' pixels';
}

let measured = null;

/**
 * Measure this device the same way Production Studio does: paint known
 * pixels in the far corner of a candidate canvas and read them back.
 */
export function measure() {
  if (measured) return measured;

  measured = new Promise((resolve) => {
    const candidates = [16384, 12000, 10000, 8192, 6000, 4096, 2048];
    for (const size of candidates) {
      let canvas = null;
      try {
        canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        if (canvas.width !== size) continue;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.fillStyle = '#7f3fbf';
        ctx.fillRect(size - 2, size - 2, 2, 2);
        const data = ctx.getImageData(size - 1, size - 1, 1, 1).data;
        if (data[0] === 0x7f && data[1] === 0x3f && data[2] === 0xbf) {
          resolve(size);
          return;
        }
      } catch {
        /* try the next size down */
      } finally {
        if (canvas) {
          canvas.width = 1;
          canvas.height = 1;
        }
      }
    }
    resolve(2048);
  });

  return measured;
}

/** A sentence naming the tested maximum and this device's own limit. */
export async function maxExportLabel() {
  const tested = testedLabel();
  try {
    const here = await measure();
    const atThreeHundred = (here / 300).toFixed(1);
    if (here >= TESTED_MAXIMUM) {
      return 'Tested to ' + tested + ' — and this device handles that size, about ' +
        atThreeHundred + ' inches square at 300 DPI.';
    }
    return 'Tested to ' + tested + ' on a desktop browser. This device measures ' +
      here.toLocaleString('en-US') + ' × ' + here.toLocaleString('en-US') +
      ' pixels, about ' + atThreeHundred + ' inches square at 300 DPI. ' +
      'Production Studio measures your device and never offers a size it cannot produce.';
  } catch {
    return 'Tested to ' + tested + ' on a desktop browser.';
  }
}

export default { TESTED_MAXIMUM, testedLabel, measure, maxExportLabel };
