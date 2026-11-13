/*
 * A small ZIP reader, for the test suite only.
 *
 * Every download from the Studio is a zip written by our own code, so the
 * tests read those archives back the way an unzip tool would: find the end
 * record, walk the central directory, and pull each entry out of its local
 * header, checking the stored CRC against the bytes.
 *
 * Nothing here ships. Its purpose is to prove that what the Studio hands a
 * buyer is a real archive and not merely a plausible-looking blob.
 */

const decoder = new TextDecoder();

function crc32(bytes) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

/**
 * Read a zip.
 *
 * @param {Uint8Array} input
 * @returns {{entries: Array<{name, bytes, text, crcOk, stored}>, names: string[]}}
 */
export function readZip(input) {
  const bytes = Uint8Array.from(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // The end record is last, after a comment that is empty here, so it is
  // found by scanning back for its signature.
  let end = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error('No end-of-central-directory record: this is not a zip.');

  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const entries = [];

  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error('Central directory entry ' + i + ' has the wrong signature.');
    }

    const method = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    if (view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error(name + ' has no local header.');
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.subarray(dataStart, dataStart + size);

    entries.push({
      name,
      bytes: data,
      get text() {
        return decoder.decode(data);
      },
      stored: method === 0,
      crcOk: crc32(data) === crc
    });

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return { entries, names: entries.map((e) => e.name) };
}

export default { readZip };
