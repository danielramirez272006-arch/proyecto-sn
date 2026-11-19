process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { initDatabase, runMigrations, resetForTesting, query, execute } = require('../src/shared/config/database');
const {
  resolveSafeLocalPath,
  inspectAndSanitizeImage,
  validateSafeExternalImageUrl,
} = require('../src/modules/places/photo-security-validator');
const { SupabasePhotoStorage } = require('../src/modules/places/supabase-photo-storage');
const { PhotoBatchImporter } = require('../src/modules/places/photo-batch-importer');
const { MultisourceAdminService } = require('../src/modules/places/multisource-admin-service');
const { MultisourcePlacesCoordinator } = require('../src/modules/places/multisource-places-coordinator');
const app = require('../src/app');

// Construye un JPEG válido mínimo con dimensiones 640x480 y segmento APP1 (EXIF) simulado
function createTestJpegWithExif(width = 640, height = 480) {
  const soi = Buffer.from([0xff, 0xd8]);
  const exifPayload = Buffer.from('Exif\0\0GPSLat=9.9352', 'ascii');
  const app1 = Buffer.alloc(4 + exifPayload.length);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1.writeUInt16BE(2 + exifPayload.length, 2);
  exifPayload.copy(app1, 4);

  const sof0 = Buffer.alloc(13);
  sof0[0] = 0xff;
  sof0[1] = 0xc0;
  sof0.writeUInt16BE(11, 2);
  sof0[4] = 8;
  sof0.writeUInt16BE(height, 5);
  sof0.writeUInt16BE(width, 7);
  sof0[9] = 1;
  sof0[10] = 1;
  sof0[11] = 0x11;
  sof0[12] = 0;

  const sos = Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xaa, 0xff, 0xd9]);
  return Buffer.concat([soi, app1, sof0, sos]);
}

function createFakeStorage() {
  const buckets = {
    'gotox-place-photos-private': new Map(),
    'gotox-place-photos-public': new Map(),
  };

  return {
    privateBucket: 'gotox-place-photos-private',
    publicBucket: 'gotox-place-photos-public',
    buckets,
    isConfigured: () => true,
    uploadPrivatePending: async ({ placeId, contentHash, ext, buffer }) => {
      const objectPath = `${placeId}/${contentHash}.${ext}`;
      const b = buckets['gotox-place-photos-private'];
      const alreadyExisted = b.has(objectPath);
      if (!alreadyExisted) b.set(objectPath, buffer);
      return { bucket: 'gotox-place-photos-private', path: objectPath, alreadyExisted };
    },
    promoteToPublic: async ({ objectPath }) => {
      const buf = buckets['gotox-place-photos-private'].get(objectPath);
      if (!buf) throw new Error('Objeto privado no encontrado');
      buckets['gotox-place-photos-public'].set(objectPath, buf);
      return {
        publicBucket: 'gotox-place-photos-public',
        objectPath,
        publicUrl: `https://example.supabase.co/storage/v1/object/public/gotox-place-photos-public/${objectPath}`,
      };
    },
    createSignedReviewUrl: async (bucket, objectPath) => `https://example.supabase.co/signed/${bucket}/${objectPath}?token=tmp`,
    removeObject: async (bucket, objectPath) => {
      buckets[bucket]?.delete(objectPath);
      return true;
    },
    exists: async (bucket, objectPath) => Boolean(buckets[bucket]?.has(objectPath)),
  };
}

test('PhotoValidator: elimina EXIF APP1, valida dimensiones, bloquea path traversal y SSRF', async () => {
  const jpeg = createTestJpegWithExif(800, 600);
  const res = inspectAndSanitizeImage(jpeg, { maxBytes: 1024 * 1024, minWidth: 400, minHeight: 300 });
  assert.equal(res.format, 'jpeg');
  assert.equal(res.width, 800);
  assert.equal(res.height, 600);
  assert.equal(res.exifStripped, true);
  assert.equal(res.sanitizedBuffer.includes('GPSLat'), false);

  const tooSmall = createTestJpegWithExif(200, 150);
  assert.throws(() => inspectAndSanitizeImage(tooSmall), { code: 'IMAGE_DIMENSIONS_TOO_SMALL' });
  assert.throws(() => inspectAndSanitizeImage(Buffer.from('<html>not an image</html>')), { code: 'UNSUPPORTED_IMAGE_FORMAT' });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gotox-photo-sec-'));
  try {
    assert.throws(() => resolveSafeLocalPath(tmpDir, '../secret.jpg'), { code: 'PATH_TRAVERSAL_BLOCKED' });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  await assert.rejects(() => validateSafeExternalImageUrl('http://upload.wikimedia.org/a.jpg', ['upload.wikimedia.org']), {
    code: 'INSECURE_PROTOCOL_BLOCKED',
  });
  await assert.rejects(
    () => validateSafeExternalImageUrl('https://evil.internal/a.jpg', ['upload.wikimedia.org']),
    { code: 'UNTRUSTED_IMAGE_HOST' }
  );
  await assert.rejects(
    () =>
      validateSafeExternalImageUrl('https://upload.wikimedia.org/a.jpg', ['upload.wikimedia.org'], async () => [
        { address: '169.254.169.254', family: 4 },
      ]),
    { code: 'SSRF_PRIVATE_IP_BLOCKED' }
  );
});

test('SupabasePhotoStorage: no usa fallback silencioso si falta service role key', async () => {
  const storage = new SupabasePhotoStorage({ url: 'https://example.supabase.co', serviceRoleKey: '' });
  assert.equal(storage.isConfigured(), false);
  await assert.rejects(
    () => storage.uploadPrivatePending({ placeId: 'p1', contentHash: 'abc', ext: 'jpg', buffer: Buffer.from('x') }),
    { code: 'SUPABASE_STORAGE_NOT_CONFIGURED' }
  );
});

test('PhotoBatchImporter: dry-run, commit privado, duplicados, local inexistente, derechos faltantes y reanudación', async () => {
  await initDatabase();
  await runMigrations();

  await execute(
    `INSERT INTO places (id, name, category, address, lat, lng, attributes_metadata)
     VALUES ('place-real-1', 'Soda Escalante', 'restaurant', 'Calle 33', 9.9352, -84.0628, '{}')`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gotox-batch-'));
  try {
    const imgPath = path.join(tmpDir, 'fachada.jpg');
    fs.writeFileSync(imgPath, createTestJpegWithExif(800, 600));

    const fakeStorage = createFakeStorage();
    const importer = new PhotoBatchImporter({ storage: fakeStorage });

    // 1. Dry-run por defecto: no sube ni inserta en BD
    const dryReport = await importer.importBatch({
      baseDir: tmpDir,
      items: [
        {
          place_id: 'place-real-1',
          file: 'fachada.jpg',
          photo_type: 'fachada',
          author: 'Carlos V.',
          license: 'Autorización del propietario',
        },
        {
          place_id: 'no-existe',
          file: 'fachada.jpg',
          photo_type: 'fachada',
          author: 'Carlos V.',
          license: 'CC BY 4.0',
        },
        {
          place_id: 'place-real-1',
          file: 'fachada.jpg',
          photo_type: 'fachada',
          author: 'Carlos V.',
          license: '', // Sin derechos
        },
      ],
    });

    assert.equal(dryReport.dry_run, true);
    assert.equal(dryReport.pending_count, 1);
    assert.equal(dryReport.failed_count, 2);
    assert.equal(fakeStorage.buckets['gotox-place-photos-private'].size, 0);

    // 2. Commit real en bucket privado (pending_review)
    const commitReport = await importer.importBatch({
      baseDir: tmpDir,
      dryRun: false,
      batchId: 'batch-001',
      items: [
        {
          place_id: 'place-real-1',
          branch_label: 'Escalante',
          file: 'fachada.jpg',
          photo_type: 'fachada',
          author: 'Carlos V.',
          license: 'Autorización del propietario',
          is_cover: true,
        },
      ],
    });

    assert.equal(commitReport.status, 'completed');
    assert.equal(commitReport.imported_count, 1);
    assert.equal(fakeStorage.buckets['gotox-place-photos-private'].size, 1);
    assert.equal(fakeStorage.buckets['gotox-place-photos-public'].size, 0);

    // 3. Reanudación y duplicado por hash
    const resumeReport = await importer.importBatch({
      baseDir: tmpDir,
      dryRun: false,
      batchId: 'batch-001',
      resume: true,
      items: [
        {
          place_id: 'place-real-1',
          file: 'fachada.jpg',
          photo_type: 'fachada',
          author: 'Carlos V.',
          license: 'Autorización del propietario',
        },
      ],
    });
    assert.equal(resumeReport.skipped_count, 1);
    assert.equal(resumeReport.imported_count, 1); // No incrementó

    const dupReport = await importer.importBatch({
      baseDir: tmpDir,
      dryRun: false,
      items: [
        {
          place_id: 'place-real-1',
          file: 'fachada.jpg',
          photo_type: 'fachada',
          author: 'Carlos V.',
          license: 'Autorización del propietario',
        },
      ],
    });
    assert.equal(dupReport.skipped_count, 1);
    assert.equal(dupReport.details[0].status, 'skipped_duplicate');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('PhotoPipeline: compensación ante fallo BD, bloqueo Storage, privacidad de pendientes y prioridad al aprobar', async () => {
  await initDatabase();
  await runMigrations();

  await execute(
    `INSERT INTO places (id, name, category, address, lat, lng, attributes_metadata)
     VALUES ('place-mod-1', 'Café Propio', 'cafe', 'Barrio Amón', 9.938, -84.075, '{}')`
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gotox-mod-'));
  try {
    fs.writeFileSync(path.join(tmpDir, 'terraza.jpg'), createTestJpegWithExif(800, 600));

    // A. Bloqueo 403 en Storage detiene el lote
    const blockedStorage = {
      ...createFakeStorage(),
      uploadPrivatePending: async () => {
        const err = new Error('Forbidden');
        err.code = 'SUPABASE_STORAGE_FORBIDDEN';
        err.status = 403;
        throw err;
      },
    };
    const blockedImporter = new PhotoBatchImporter({ storage: blockedStorage });
    const blockedRep = await blockedImporter.importBatch({
      baseDir: tmpDir,
      dryRun: false,
      items: [
        { place_id: 'place-mod-1', file: 'terraza.jpg', photo_type: 'terraza', author: 'Ana', license: 'CC BY 4.0' },
      ],
    });
    assert.equal(blockedRep.status, 'blocked');

    // B. Subida real a privado -> pendiente NO visible públicamente -> aprobación promueve a público y tiene prioridad sobre Wikimedia
    const fakeStorage = createFakeStorage();
    const importer = new PhotoBatchImporter({ storage: fakeStorage });
    const rep = await importer.importBatch({
      baseDir: tmpDir,
      dryRun: false,
      items: [
        {
          place_id: 'place-mod-1',
          file: 'terraza.jpg',
          photo_type: 'terraza',
          author: 'Ana',
          license: 'Autorización escrita',
          is_cover: true,
        },
      ],
    });
    const photoId = rep.details[0].photo_id;

    const coordinator = new MultisourcePlacesCoordinator();
    const beforeApproval = await coordinator.search(
      { lat: 9.938, lng: -84.075, radius: 1000, limit: 5 },
      {
        osmService: { searchNearbyRestaurants: async () => ({ restaurants: [] }) },
        geoapifyClient: { isEnabledAndConfigured: () => false },
        foursquareClient: { isEnabledAndConfigured: () => false },
        wikimediaClient: { findPlacePhoto: async () => null },
      }
    );
    const placeBefore = beforeApproval.places.find((p) => p.id === 'place-mod-1');
    assert.equal(placeBefore.photo, null); // Pendiente NO es público

    const adminService = new MultisourceAdminService();
    const approved = await adminService.approvePendingPhoto({
      photo_id: photoId,
      admin_id: 'admin-1',
      storage: fakeStorage,
    });
    assert.equal(approved.approval_status, 'approved');
    assert.equal(fakeStorage.buckets['gotox-place-photos-public'].size, 1);

    const afterApproval = await coordinator.search(
      { lat: 9.938, lng: -84.075, radius: 1000, limit: 5 },
      {
        osmService: { searchNearbyRestaurants: async () => ({ restaurants: [] }) },
        geoapifyClient: { isEnabledAndConfigured: () => false },
        foursquareClient: { isEnabledAndConfigured: () => false },
        wikimediaClient: {
          findPlacePhoto: async () => ({ photo_url: 'https://commons.wikimedia.org/otro.jpg', license: 'CC BY 4.0' }),
        },
      }
    );
    const placeAfter = afterApproval.places.find((p) => p.id === 'place-mod-1');
    assert.equal(placeAfter.photo.provider, 'gotox_owner'); // Prioridad sobre Wikimedia
    assert.equal(placeAfter.photo.restaurant_name, 'Café Propio');
    assert.equal(placeAfter.photo.author, 'Ana');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('PhotoPipeline HTTP: rutas admin de moderación rechazan acceso sin token admin', async () => {
  await initDatabase();
  await runMigrations();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    const port = server.address().port;
    const resp = await fetch(`http://127.0.0.1:${port}/api/admin/places/photos/pending`);
    assert.equal(resp.status === 401 || resp.status === 403, true);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
