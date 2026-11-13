/*
 * A small PNG reader, for the test suite only.
 *
 * The texture collection ships real PNG tiles, and a tile that does not
 * wrap would be a broken product. Checking that means reading the shipped
 * file back rather than trusting the encoder that wrote it, so this decodes
 * the file the same way a browser would: walk the chunks, inflate IDAT,
 * and undo the per-scanline filters.
 *
 * It handles the colour types this site produces — grayscale and RGB, eight
 * bits per sample, no interlacing — and refuses anything else rather than
 * returning something plausible but wrong.
 */

import zlib from 'node:zlib';

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function decodePng(bytes) {
  const data = Uint8Array.from(bytes);
  for (let i = 0; i < SIGNATURE.length; i++) {
    if (data[i] !== SIGNATURE[i]) throw new Error('Not a PNG file.');
  }

  let offset = 8;
  let header = null;
  let dpi = null;
  const idat = [];

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  while (offset < data.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
    const body = data.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      header = {
        width: view.getUint32(offset + 8),
        height: view.getUint32(offset + 12),
        depth: body[8],
        colorType: body[9],
        interlace: body[12]
      };
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(body));
    } else if (type === 'pHYs') {
      const perMetreX = view.getUint32(offset + 8);
      const unit = body[8];
      // Unit 1 is metres, which is the only unit a DPI figure can be read from.
      if (unit === 1) dpi = Math.round(perMetreX * 0.0254);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  if (!header) throw new Error('PNG had no header chunk.');
  if (header.depth !== 8) throw new Error('Only 8-bit PNGs are read here.');
  if (header.interlace !== 0) throw new Error('Interlaced PNGs are not read here.');

  const channels = header.colorType === 0 ? 1 : header.colorType === 2 ? 3 : 0;
  if (!channels) throw new Error('Only grayscale and RGB PNGs are read here.');

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { width, height } = header;
  const stride = width * channels;
  const out = new Uint8Array(stride * height);

  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;

    const rowStart = y * stride;
    const prevStart = rowStart - stride;

    for (let x = 0; x < stride; x++) {
      const value = line[x];
      const left = x >= channels ? out[rowStart + x - channels] : 0;
      const up = y > 0 ? out[prevStart + x] : 0;
      const upLeft = y > 0 && x >= channels ? out[prevStart + x - channels] : 0;

      let restored;
      switch (filter) {
        case 0: restored = value; break;
        case 1: restored = value + left; break;
        case 2: restored = value + up; break;
        case 3: restored = value + ((left + up) >> 1); break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          restored = value + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default: throw new Error('Unknown PNG filter ' + filter + '.');
      }
      out[rowStart + x] = restored & 0xff;
    }
  }

  // Hand back the shape tools/patterns/raster.mjs uses, so the same seam
  // check can run over a decoded file and a freshly rendered image alike.
  if (channels === 1) {
    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
      rgb[i * 3] = out[i];
      rgb[i * 3 + 1] = out[i];
      rgb[i * 3 + 2] = out[i];
    }
    return { width, height, data: rgb, channels: 3, sourceChannels: 1, dpi };
  }

  return { width, height, data: out, channels: 3, sourceChannels: 3, dpi };
}

export default { decodePng };
