/*
 * Backups.
 *
 * Licenses and saved work exist only in the buyer's browser, so the backup
 * file is the only thing standing between them and losing everything. These
 * tests cover the full round trip: export, wipe the device, import, and
 * confirm that both the licenses and the saved work come back.
 */

import '../tests/helpers/environment.mjs';
import { resetEnvironment } from './helpers/environment.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBackup,
  backupFilename,
  validateBackup,
  restoreBackup,
  BACKUP_FORMAT,
  BACKUP_VERSION
} from '../js/backup.js';
import {
  activate,
  generateCode,
  listLicenses,
  clearLicenses,
  unlockedSlugs,
  isUnlocked,
  setLicensee
} from '../js/license.js';
import { scopedStorage, exportAll } from '../js/storage.js';
import { getSettings, setSettings } from '../js/settings.js';
import { productBySlug } from '../js/products.js';
import { SITE } from '../js/site-config.js';

const bundle = productBySlug('essentials-bundle');
const production = productBySlug('production-studio');
const generator = productBySlug('pattern-generator-studio');

/** Put a device into a known state: two licenses, saved work, and settings. */
async function seedDevice() {
  const bundleCode = generateCode(bundle, { orderId: 'cs_test_bundle' });
  const productionCode = generateCode(production, { orderId: 'cs_test_production' });

  activate(bundleCode, { orderRef: 'cs_test_bundle', licensee: 'Juniper Lane Studio' });
  activate(productionCode, { orderRef: 'cs_test_production' });

  const generatorStore = scopedStorage('pattern-generator-studio');
  await generatorStore.set('presets', [
    { name: 'Warm gray', hue: 32, density: 0.4 },
    { name: 'Deep teal', hue: 182, density: 0.7 }
  ]);
  await generatorStore.set('lastOpened', 'Warm gray');

  const productionStore = scopedStorage('production-studio');
  await productionStore.set('exportSizes', [1200, 2400, 4800]);

  setSettings({ theme: 'dark', scale: 'large' });

  return { bundleCode, productionCode };
}

/** Wipe the device completely, as clearing browser data would. */
async function wipeDevice() {
  clearLicenses();
  await scopedStorage('pattern-generator-studio').clear();
  await scopedStorage('production-studio').clear();
  setSettings({ theme: 'system', scale: 'normal' });
}

test.beforeEach(() => {
  resetEnvironment();
  clearLicenses();
});

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

test('a backup carries its format, the licenses, the settings, and the work', async () => {
  await seedDevice();
  const backup = await buildBackup();

  assert.equal(backup.format, BACKUP_FORMAT);
  assert.equal(backup.version, BACKUP_VERSION);
  assert.equal(backup.site, SITE.domain);
  assert.ok(!Number.isNaN(Date.parse(backup.exportedAt)), 'it should be stamped with a date');

  assert.equal(backup.licenses.length, 2);
  assert.equal(backup.settings.theme, 'dark');
  assert.equal(backup.settings.scale, 'large');
  assert.equal(backup.work.length, 3);
});

test('a backup is plain JSON that survives a round trip through a file', async () => {
  await seedDevice();
  const backup = await buildBackup();
  const text = JSON.stringify(backup, null, 2);

  assert.deepEqual(JSON.parse(text), backup);
  assert.ok(text.length > 200);
});

test('the filename is stamped with the date', () => {
  const name = backupFilename(new Date('2026-11-12T10:00:00Z'));
  assert.equal(name, 'tilecraft-backup-2026-11-12.json');
});

test('an empty device still exports a usable backup', async () => {
  const backup = await buildBackup();
  assert.equal(backup.licenses.length, 0);
  assert.equal(backup.work.length, 0);
  assert.equal(validateBackup(backup).ok, true);
});

/* ------------------------------------------------------------------ *
 * The round trip
 * ------------------------------------------------------------------ */

test('export, wipe, import: everything comes back', async () => {
  const { bundleCode, productionCode } = await seedDevice();

  const before = {
    backup: await buildBackup(),
    licenses: listLicenses(),
    unlocked: [...unlockedSlugs()].sort(),
    presets: await scopedStorage('pattern-generator-studio').get('presets'),
    sizes: await scopedStorage('production-studio').get('exportSizes')
  };

  await wipeDevice();

  assert.equal(listLicenses().length, 0, 'the device should be empty');
  assert.equal(unlockedSlugs().size, 0);
  assert.equal(await scopedStorage('pattern-generator-studio').get('presets'), undefined);

  const result = await restoreBackup(before.backup);

  assert.equal(result.ok, true, result.reason);
  assert.equal(result.licenses, 2, 'both licenses should be added back');
  assert.equal(result.work, 3, 'all three saved items should be restored');

  assert.deepEqual([...unlockedSlugs()].sort(), before.unlocked);
  assert.equal(listLicenses().length, 2);

  const restoredBundle = listLicenses().find((l) => l.code === bundleCode);
  assert.ok(restoredBundle, 'the bundle license should be back');
  assert.equal(restoredBundle.licensee, 'Juniper Lane Studio');
  assert.equal(restoredBundle.orderRef, 'cs_test_bundle');
  assert.equal(restoredBundle.issuedAt, before.licenses.find((l) => l.code === bundleCode).issuedAt);

  assert.ok(listLicenses().some((l) => l.code === productionCode));

  assert.deepEqual(await scopedStorage('pattern-generator-studio').get('presets'), before.presets);
  assert.equal(await scopedStorage('pattern-generator-studio').get('lastOpened'), 'Warm gray');
  assert.deepEqual(await scopedStorage('production-studio').get('exportSizes'), before.sizes);

  assert.equal(getSettings().theme, 'dark');
  assert.equal(getSettings().scale, 'large');
});

test('the bundle still unlocks all five Collections after a restore', async () => {
  activate(generateCode(bundle));
  const backup = await buildBackup();
  await wipeDevice();
  await restoreBackup(backup);

  for (const slug of bundle.grants) {
    assert.ok(isUnlocked(slug), slug + ' should be unlocked again');
  }
  assert.equal(listLicenses().length, 1, 'one code is still one license');
});

test('a restored license still produces its certificate', async () => {
  const { certificateBytes } = await import('../js/certificate.js');

  activate(generateCode(production, { orderId: 'cs_test_cert' }), { orderRef: 'cs_test_cert' });
  const original = certificateBytes(listLicenses()[0]);

  const backup = await buildBackup();
  await wipeDevice();
  await restoreBackup(backup);

  assert.deepEqual(certificateBytes(listLicenses()[0]), original);
});

/* ------------------------------------------------------------------ *
 * Importing adds, it does not replace
 * ------------------------------------------------------------------ */

test('importing adds to what is on the device rather than replacing it', async () => {
  activate(generateCode(production, { orderId: 'old' }));
  const backup = await buildBackup();

  // A license bought after the backup was taken must survive the restore.
  clearLicenses();
  const newer = generateCode(generator, { orderId: 'new' });
  activate(newer);

  const result = await restoreBackup(backup);

  assert.equal(result.ok, true);
  assert.equal(listLicenses().length, 2, 'the newer license must not be lost');
  assert.ok(isUnlocked('pattern-generator-studio'));
  assert.ok(isUnlocked('production-studio'));
});

test('importing the same backup twice changes nothing the second time', async () => {
  await seedDevice();
  const backup = await buildBackup();

  const first = await restoreBackup(backup);
  const licensesAfterFirst = listLicenses().length;
  const second = await restoreBackup(backup);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.licenses, 0, 'nothing new to add the second time');
  assert.equal(listLicenses().length, licensesAfterFirst);
});

test('a licensee name set after the backup is not overwritten by the restore', async () => {
  const code = generateCode(production, { orderId: 'cs_test_name' });
  activate(code);
  const backup = await buildBackup();

  setLicensee(code, 'Added Later');
  await restoreBackup(backup);

  assert.equal(listLicenses()[0].licensee, 'Added Later');
});

/* ------------------------------------------------------------------ *
 * Rejecting things that are not backups
 * ------------------------------------------------------------------ */

test('files that are not backups are refused with a reason', async () => {
  const cases = [
    null,
    undefined,
    'a string',
    42,
    {},
    { format: 'something-else', version: 1, licenses: [] },
    { format: BACKUP_FORMAT, version: BACKUP_VERSION + 5, licenses: [] },
    { format: BACKUP_FORMAT, version: BACKUP_VERSION },
    { format: BACKUP_FORMAT, version: BACKUP_VERSION, licenses: 'not an array' }
  ];

  for (const value of cases) {
    const check = validateBackup(value);
    assert.equal(check.ok, false, JSON.stringify(value) + ' should be refused');
    assert.ok(check.reason.length > 10, 'the refusal should explain itself');

    const restored = await restoreBackup(value);
    assert.equal(restored.ok, false);
    assert.equal(listLicenses().length, 0, 'nothing should have been written');
  }
});

test('an older backup version is still accepted', () => {
  const check = validateBackup({ format: BACKUP_FORMAT, version: 1, licenses: [] });
  assert.equal(check.ok, true);
});

test('invalid licenses inside a backup are skipped, and the good ones still load', async () => {
  const good = generateCode(production, { orderId: 'good' });

  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    licenses: [
      { code: good, slug: 'production-studio', issuedAt: '2026-11-12T00:00:00.000Z' },
      { code: 'TILE-GMTR-K7N4PXBM-22' }, // a bad checksum
      { code: 'not a code at all' },
      { code: 'TILE-ZZZZ-K7N4PXBM-WC' }, // a product that does not exist
      { nonsense: true },
      null
    ],
    work: []
  };

  const result = await restoreBackup(backup);

  assert.equal(result.ok, true);
  assert.equal(result.licenses, 1, 'only the valid license should load');
  assert.equal(listLicenses().length, 1);
  assert.equal(listLicenses()[0].code, good);
});

test('a backup cannot be used to smuggle in a license for an unknown product', async () => {
  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    licenses: [
      {
        code: 'TILE-ZZZZ-K7N4PXBM-WC',
        slug: 'secret-product',
        productName: 'Secret Product',
        grants: ['production-studio', 'repeat-builder']
      }
    ],
    work: []
  };

  await restoreBackup(backup);

  assert.equal(listLicenses().length, 0);
  assert.equal(unlockedSlugs().size, 0, 'nothing may be unlocked by an invalid code');
});

test('a backup cannot widen what a real license grants', async () => {
  const code = generateCode(production, { orderId: 'cs_test_widen' });

  await restoreBackup({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    licenses: [
      {
        code,
        slug: 'production-studio',
        // A tampered backup claiming the Production Studio code unlocks more.
        grants: ['production-studio', 'repeat-builder', 'essentials-bundle']
      }
    ],
    work: []
  });

  assert.deepEqual([...unlockedSlugs()], ['production-studio']);
});

test('settings in a backup cannot set anything the Studio does not offer', async () => {
  await restoreBackup({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    licenses: [],
    settings: { theme: 'dark', somethingElse: 'should be ignored' },
    work: []
  });

  const settings = getSettings();
  assert.equal(settings.theme, 'dark');
  assert.equal(settings.somethingElse, undefined);
});

/* ------------------------------------------------------------------ *
 * Saved work
 * ------------------------------------------------------------------ */

test('saved work is scoped to its own product', async () => {
  const a = scopedStorage('pattern-generator-studio');
  const b = scopedStorage('repeat-builder');

  await a.set('settings', { value: 'a' });
  await b.set('settings', { value: 'b' });

  assert.deepEqual(await a.get('settings'), { value: 'a' });
  assert.deepEqual(await b.get('settings'), { value: 'b' });
  assert.deepEqual(await a.keys(), ['settings']);

  await a.clear();

  assert.equal(await a.get('settings'), undefined);
  assert.deepEqual(await b.get('settings'), { value: 'b' }, 'clearing one must not touch the other');
});

test('saved work keeps its shape through a backup', async () => {
  const store = scopedStorage('repeat-builder');
  const layout = {
    name: 'Leaf tile',
    repeat: 'half-drop',
    offset: 0.5,
    motifs: [
      { id: 1, x: 0.25, y: 0.75, scale: 1.4, rotation: -12 },
      { id: 2, x: 0.8, y: 0.2, scale: 0.9, rotation: 33 }
    ],
    updated: '2026-11-12T12:00:00.000Z'
  };

  await store.set('layout', layout);
  const backup = await buildBackup();
  await store.clear();
  await restoreBackup(backup);

  assert.deepEqual(await store.get('layout'), layout);
});

test('the work in a backup records which product each item belongs to', async () => {
  await scopedStorage('production-studio').set('presets', [1, 2, 3]);
  const rows = await exportAll();

  assert.equal(rows.length, 1);
  assert.equal(rows[0].slug, 'production-studio');
  assert.equal(rows[0].key, 'presets');
  assert.equal(rows[0].id, 'production-studio:presets');
  assert.deepEqual(rows[0].value, [1, 2, 3]);
  assert.ok(!Number.isNaN(Date.parse(rows[0].updatedAt)));
});
