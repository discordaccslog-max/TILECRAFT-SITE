/*
 * Tilecraft Digital — backups
 *
 * Licenses and saved work live only in this browser. Nothing is held on a
 * server, which means nobody — including us — can recover it if the browser
 * data is cleared or the device is replaced. A backup file is the way out of
 * that, and it is one file covering everything.
 */

import { listLicenses, mergeLicenses } from './license.js';
import { getSettings, setSettings } from './settings.js';
import { exportAll, importAll } from './storage.js';
import { SITE } from './site-config.js';

export const BACKUP_FORMAT = 'tilecraft-backup';
export const BACKUP_VERSION = 1;

/** Build the backup object: every license, every saved item, and settings. */
export async function buildBackup() {
  let work = [];
  try {
    work = await exportAll();
  } catch {
    // A browser with IndexedDB unavailable still gets a licenses backup,
    // which is the part that cannot be recreated.
    work = [];
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    site: SITE.domain,
    exportedAt: new Date().toISOString(),
    licenses: listLicenses(),
    settings: getSettings(),
    work
  };
}

/** A filename for a backup, stamped with the date. */
export function backupFilename(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  return 'tilecraft-backup-' + stamp + '.json';
}

/** The backup as a Blob, ready to download. */
export async function backupBlob() {
  const backup = await buildBackup();
  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
}

/**
 * Check that a parsed file really is one of our backups.
 * @returns {{ok: boolean, reason: string}}
 */
export function validateBackup(data) {
  if (!data || typeof data !== 'object') return { ok: false, reason: 'That file is not a backup.' };
  if (data.format !== BACKUP_FORMAT) {
    return { ok: false, reason: 'That file is not a Tilecraft Digital backup.' };
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    return {
      ok: false,
      reason: 'That backup was made by a newer version of the Studio than this one.'
    };
  }
  if (!Array.isArray(data.licenses)) {
    return { ok: false, reason: 'That backup is missing its list of licenses.' };
  }
  return { ok: true, reason: 'ok' };
}

/**
 * Restore a backup.
 *
 * Licenses are added to whatever is already on this device rather than
 * replacing it, so restoring a backup never loses a license that was
 * activated since it was made. Saved work with the same key is overwritten
 * by the backup's copy.
 *
 * @returns {Promise<{ok: boolean, reason: string, licenses: number, work: number}>}
 */
export async function restoreBackup(data) {
  const check = validateBackup(data);
  if (!check.ok) return { ok: false, reason: check.reason, licenses: 0, work: 0 };

  const licenses = mergeLicenses(data.licenses);

  let work = 0;
  if (Array.isArray(data.work) && data.work.length) {
    try {
      work = await importAll(data.work);
    } catch {
      return {
        ok: false,
        reason: 'The licenses were restored, but this browser would not store the saved work.',
        licenses,
        work: 0
      };
    }
  }

  if (data.settings && typeof data.settings === 'object') {
    const allowed = {};
    for (const key of ['theme', 'scale', 'reducedMotion', 'walkthroughSeen']) {
      if (data.settings[key] !== undefined) allowed[key] = data.settings[key];
    }
    setSettings(allowed);
  }

  return { ok: true, reason: 'restored', licenses, work };
}

/** Read and restore a backup from a File chosen by the buyer. */
export async function restoreFromFile(file) {
  let text;
  try {
    text = await file.text();
  } catch {
    return { ok: false, reason: 'That file could not be read.', licenses: 0, work: 0 };
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'That file is not readable as a backup.', licenses: 0, work: 0 };
  }

  return restoreBackup(data);
}

export default { buildBackup, backupBlob, backupFilename, validateBackup, restoreBackup, restoreFromFile };
