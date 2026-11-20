const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';

const app = require('../src/app');
const { initDatabase, runMigrations, runSeeds } = require('../src/shared/config/database');
const { generateToken } = require('../src/shared/middlewares/auth-role-guard');
const { OverpassPlacesService } = require('../src/modules/places/overpass-places-service');
const { GooglePlacesClient } = require('../src/shared/clients/google-places-client');
const { PetFriendlyRestaurantsService } = require('../src/modules/places/pet-friendly-restaurants-service');
const placesRepository = require('../src/modules/places/places-repository');

function executeMockRequest(method, url, { headers = {}, body = null } = {}) {
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      originalUrl: url,
      headers: { ...headers },
      body: body || {},
      query: {},
      params: {},
      socket: { remoteAddress: '127.0.0.1' },
    };

    const [pathOnly, queryString] = url.split('?');
    req.path = pathOnly;
    if (queryString) {
      const q = new URLSearchParams(queryString);
      for (const [k, v] of q.entries()) req.query[k] = v;
    }

    let statusCode = 200;
    const responseHeaders = {};
    let responseBody = null;

    const res = {
      statusCode: 200,
      setHeader: (k, v) => { responseHeaders[k.toLowerCase()] = v; },
      getHeader: (k) => responseHeaders[k.toLowerCase()],
      status: (code) => { statusCode = code; res.statusCode = code; return res; },
      json: (data) => { responseBody = data; resolve({ status: statusCode, body: responseBody, headers: responseHeaders }); return res; },
      send: (data) => { responseBody = data; resolve({ status: statusCode, body: responseBody, headers: responseHeaders }); return res; },
    };

    app(req, res, (err) => {
      resolve({ status: err?.status || 500, body: { ok: false, error: err?.message }, headers: responseHeaders });
    });
  });
}

test('Suite Búsqueda Real Pet-Friendly, Google Places, Verificación y Automatización n8n', async (suite) => {
  await initDatabase();
  await runMigrations();
  await runSeeds();

  const adminToken = generateToken({ id: 'usr_admin_1', email: 'admin@ejemplo.cr', role: 'admin', name: 'Admin' });
  const clientToken = generateToken({ id: 'usr_client_1', email: 'client@ejemplo.cr', role: 'client', name: 'Cliente' });

  await suite.test('1. Coordenadas inválidas y vacías son rechazadas con 400', async () => {
    const emptyLat = await executeMockRequest('GET', '/api/places/nearby-real?lat=&lng=-84.06');
    assert.equal(emptyLat.status, 400);

    const outOfRange = await executeMockRequest('GET', '/api/places/pet-friendly/search?lat=95&lng=-84.06');
    assert.equal(outOfRange.status, 400);

    const badLng = await executeMockRequest('GET', '/api/places/pet-friendly/search?lat=9.93&lng=-200');
    assert.equal(badLng.status, 400);

    const nonNum = await executeMockRequest('GET', '/api/places/pet-friendly/search?lat=abc&lng=-84.06');
    assert.equal(nonNum.status, 400);
  });

  await suite.test('2. Conector OSM aplica radio exacto, preserva null en ausentes y distingue vacío vs fallo', async () => {
    const svc = new OverpassPlacesService();

    // Mock con 1 restaurante dentro de 1000m (sin outdoor_seating) y 1 fuera (a ~5km)
    const mockFetchOk = async (url) => {
      if (url.includes('nominatim')) {
        return {
          ok: true,
          json: async () => [
            {
              osm_type: 'node',
              osm_id: 101,
              name: 'Café Cercano',
              type: 'cafe',
              lat: '9.9355',
              lon: '-84.0652',
              address: { road: 'Calle 33', city: 'San José' },
              extratags: {},
            },
            {
              osm_type: 'node',
              osm_id: 102,
              name: 'Restaurante Lejano',
              type: 'restaurant',
              lat: '9.9850',
              lon: '-84.0652',
              address: { road: 'Heredia' },
              extratags: { dog: 'yes' },
            },
          ],
        };
      }
      return { ok: true, json: async () => ({ features: [] }) };
    };

    const resOk = await svc.findNearbyRestaurants({
      lat: 9.9352,
      lng: -84.0695,
      radius: 1000,
      fetchImpl: mockFetchOk,
    });
    assert.equal(resOk.degraded, false);
    assert.equal(resOk.restaurants.length, 1);
    assert.equal(resOk.restaurants[0].name, 'Café Cercano');
    assert.equal(resOk.restaurants[0].outdoor_seating, null); // Nunca false si falta
    assert.equal(resOk.restaurants[0].pet_access_status, 'unknown');

    // Respuesta vacía válida -> degraded: false, provider_status: 'empty'
    const resEmpty = await svc.findNearbyRestaurants({
      lat: 9.9352,
      lng: -84.0695,
      radius: 1000,
      fetchImpl: async () => ({ ok: true, json: async () => [] }),
    });
    assert.equal(resEmpty.degraded, false);
    assert.equal(resEmpty.provider_status, 'empty');

    // Fallo de red/timeout -> degraded: true
    const resFail = await svc.findNearbyRestaurants({
      lat: 9.9352,
      lng: -84.0695,
      radius: 1000,
      fetchImpl: async () => {
        const err = new Error('timeout');
        err.name = 'TimeoutError';
        throw err;
      },
    });
    assert.equal(resFail.degraded, true);
    assert.equal(resFail.provider_status, 'timeout');
  });

  await suite.test('3. Duplicados en misma ubicación se unifican, pero sucursales distintas se conservan', async () => {
    const svc = new PetFriendlyRestaurantsService();
    const mockOsm = {
      findNearbyRestaurants: async () => ({
        provider_status: 'ok',
        degraded: false,
        restaurants: [
          {
            id: 'osm_n_1',
            external_id: '1',
            name: 'Soda La Esquina',
            category: 'restaurant',
            lat: 9.9352,
            lng: -84.0695,
            address: 'Escalante',
            pet_access_status: 'unknown',
          },
          {
            id: 'osm_n_2',
            external_id: '2',
            name: 'Soda La Esquina', // misma sucursal a 5m
            category: 'restaurant',
            lat: 9.93522,
            lng: -84.06952,
            address: 'Escalante',
            pet_access_status: 'unknown',
          },
          {
            id: 'osm_n_3',
            external_id: '3',
            name: 'Soda La Esquina', // sucursal distinta a ~600m
            category: 'restaurant',
            lat: 9.9405,
            lng: -84.0695,
            address: 'Barrio Amón',
            pet_access_status: 'unknown',
          },
        ],
      }),
    };

    const result = await svc.search(
      { lat: 9.9352, lng: -84.0695, radius: 2000 },
      {
        osmService: mockOsm,
        googleClient: new GooglePlacesClient({ apiKey: '' }),
        placesRepo: { findAll: async () => [] },
        loadEvidence: async () => new Map(),
      }
    );

    const sucursales = result.needs_confirmation.filter((r) => r.name === 'Soda La Esquina');
    assert.equal(sucursales.length, 2);
  });

  await suite.test('4, 5, 6, 7 y 8. Reglas de compatibilidad: desconocida, prohibida, solo terraza, perros sin máximo y gatos', async () => {
    const svc = new PetFriendlyRestaurantsService();

    const places = [
      {
        id: 'plc_unknown',
        name: 'Bistró Sin Datos',
        category: 'restaurant',
        lat: 9.9351,
        lng: -84.0691,
        verified_by_admin: false,
        attributes_metadata: {},
      },
      {
        id: 'plc_banned',
        name: 'Restaurante Prohibido',
        category: 'restaurant',
        lat: 9.9352,
        lng: -84.0692,
        verified_by_admin: true,
        attributes_metadata: {
          pet_policy: {
            access_status: 'not_allowed',
            source_type: 'business_confirmation',
            checked_at: '2026-11-10T10:00:00Z',
          },
        },
      },
      {
        id: 'plc_outdoor_only',
        name: 'Terraza Jardín',
        category: 'restaurant',
        lat: 9.9353,
        lng: -84.0693,
        verified_by_admin: true,
        attributes_metadata: {
          pet_policy: {
            access_status: 'allowed',
            source_type: 'business_confirmation',
            species_allowed: ['dog'],
            max_pets: null, // Se desconoce el máximo
            seating_access: 'outdoor',
            checked_at: '2026-11-10T10:00:00Z',
            expires_at: '2027-05-01T00:00:00Z',
          },
        },
      },
    ];

    const deps = {
      osmService: { findNearbyRestaurants: async () => ({ provider_status: 'empty', degraded: false, restaurants: [] }) },
      googleClient: new GooglePlacesClient({ apiKey: '' }),
      placesRepo: { findAll: async () => places },
      loadEvidence: async () => new Map(),
      now: new Date('2026-11-19T12:00:00Z'),
    };

    // Caso A: 1 perro en terraza -> Terraza Jardín es compatible, Prohibido incompatible, Sin Datos needs_confirmation
    const res1DogOutdoor = await svc.search(
      { lat: 9.9352, lng: -84.0695, radius: 1500, species: 'dog', pet_count: 1, seating: 'outdoor', verification: 'include_unconfirmed' },
      deps
    );
    assert.equal(res1DogOutdoor.compatible[0].id, 'plc_outdoor_only');
    assert.equal(res1DogOutdoor.incompatible[0].id, 'plc_banned');
    assert.equal(res1DogOutdoor.needs_confirmation[0].id, 'plc_unknown');

    // Caso B: 1 perro en interior -> Terraza Jardín pasa a incompatible (solo terraza)
    const resIndoor = await svc.search(
      { lat: 9.9352, lng: -84.0695, radius: 1500, species: 'dog', pet_count: 1, seating: 'indoor' },
      deps
    );
    assert.ok(resIndoor.incompatible.some((p) => p.id === 'plc_outdoor_only'));

    // Caso C: 2 perros cuando se desconoce max_pets -> NO es compatible, pasa a needs_confirmation
    const res2Dogs = await svc.search(
      { lat: 9.9352, lng: -84.0695, radius: 1500, species: 'dog', pet_count: 2, seating: 'outdoor' },
      deps
    );
    assert.equal(res2Dogs.compatible.length, 0);
    assert.ok(res2Dogs.needs_confirmation.some((p) => p.id === 'plc_outdoor_only'));

    // Caso D: Gato -> no atribuye política solo-perros a gatos
    const resCat = await svc.search(
      { lat: 9.9352, lng: -84.0695, radius: 1500, species: 'cat', pet_count: 1, seating: 'outdoor', verification: 'confirmed' },
      deps
    );
    assert.equal(resCat.compatible.length, 0);
    assert.ok(resCat.incompatible.some((p) => p.id === 'plc_outdoor_only'));
  });

  await suite.test('9. Información contradictoria o vencida requiere revisión y no se confirma', async () => {
    const svc = new PetFriendlyRestaurantsService();

    const places = [
      {
        id: 'plc_conflict',
        name: 'Café Contradictorio',
        category: 'cafe',
        lat: 9.9352,
        lng: -84.0695,
        verified_by_admin: true,
        attributes_metadata: {
          pet_policy: {
            access_status: 'not_allowed',
            source_type: 'business_confirmation',
            checked_at: '2026-11-10T10:00:00Z',
          },
        },
      },
      {
        id: 'plc_expired',
        name: 'Café Vencido',
        category: 'cafe',
        lat: 9.9354,
        lng: -84.0696,
        verified_by_admin: true,
        attributes_metadata: {
          pet_policy: {
            access_status: 'allowed',
            source_type: 'business_confirmation',
            species_allowed: ['dog'],
            checked_at: '2025-01-01T00:00:00Z',
            expires_at: '2026-01-01T00:00:00Z', // Vencida
          },
        },
      },
    ];

    const osmConflict = {
      findNearbyRestaurants: async () => ({
        provider_status: 'ok',
        degraded: false,
        restaurants: [
          {
            id: 'osm_c_1',
            external_id: 'c_1',
            name: 'Café Contradictorio',
            category: 'cafe',
            lat: 9.9352,
            lng: -84.0695,
            pet_access_status: 'allowed', // Contradice not_allowed del negocio
          },
        ],
      }),
    };

    const res = await svc.search(
      { lat: 9.9352, lng: -84.0695, radius: 1500, verification: 'include_unconfirmed' },
      {
        osmService: osmConflict,
        googleClient: new GooglePlacesClient({ apiKey: '' }),
        placesRepo: { findAll: async () => places },
        loadEvidence: async () => new Map(),
        now: new Date('2026-11-19T12:00:00Z'),
      }
    );

    const conflictItem = res.needs_confirmation.find((p) => p.id === 'plc_conflict');
    assert.equal(conflictItem.access_status, 'conflicting');
    assert.equal(conflictItem.requires_review, true);

    const expiredItem = res.needs_confirmation.find((p) => p.id === 'plc_expired');
    assert.equal(expiredItem.is_expired, true);
    assert.equal(expiredItem.is_confirmed, false);
  });

  await suite.test('11, 12, 13 y 14. Google Places: clave ausente, timeout, cuota 429, sin foto, atribuciones y cero secretos', async () => {
    const secretKey = 'AIzaSyFakeSecretTestKeyForCheck123';
    const noKeyClient = new GooglePlacesClient({ apiKey: '' });
    assert.equal(noKeyClient.isConfigured(), false);
    await assert.rejects(
      () => noKeyClient.searchNearbyRestaurants({ lat: 9.93, lng: -84.06 }),
      (err) => err.code === 'GOOGLE_PLACES_NOT_CONFIGURED' && err.status === 503
    );

    // Timeout
    const timeoutClient = new GooglePlacesClient({ apiKey: secretKey, timeoutMs: 50 });
    await assert.rejects(
      () => timeoutClient.searchNearbyRestaurants({
        lat: 9.93,
        lng: -84.06,
        fetchImpl: async () => {
          const e = new Error('timeout');
          e.name = 'TimeoutError';
          throw e;
        },
      }),
      (err) => err.code === 'GOOGLE_PLACES_TIMEOUT' && !err.message.includes(secretKey)
    );

    // Cuota agotada 429
    await assert.rejects(
      () => timeoutClient.searchNearbyRestaurants({
        lat: 9.93,
        lng: -84.06,
        fetchImpl: async () => ({ ok: false, status: 429 }),
      }),
      (err) => err.code === 'GOOGLE_PLACES_QUOTA_EXCEEDED' && err.status === 429
    );

    // Respuesta con 1 lugar con allowsDogs + foto con atribuciones, y 1 sin foto; nunca expone secretKey
    const okClient = new GooglePlacesClient({ apiKey: secretKey, includeAtmosphereFields: true });
    const searchRes = await okClient.searchNearbyRestaurants({
      lat: 9.9352,
      lng: -84.0695,
      radius: 1500,
      fetchImpl: async (url, opts) => {
        assert.equal(opts.headers['X-Goog-Api-Key'], secretKey);
        assert.ok(opts.headers['X-Goog-FieldMask'].includes('places.allowsDogs'));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            places: [
              {
                id: 'gp_1',
                displayName: { text: 'Restaurante Google Uno' },
                formattedAddress: 'Escalante, San José',
                location: { latitude: 9.9353, longitude: -84.0694 },
                googleMapsUri: 'https://maps.google.com/?cid=1',
                allowsDogs: true,
                photos: [
                  {
                    name: 'places/gp_1/photos/ph_1',
                    authorAttributions: [{ displayName: 'Juan Pérez', uri: 'https://maps.google.com/u/1' }],
                  },
                ],
              },
              {
                id: 'gp_2',
                displayName: { text: 'Restaurante Sin Foto' },
                formattedAddress: 'San José',
                location: { latitude: 9.9354, longitude: -84.0693 },
              },
            ],
          }),
        };
      },
    });

    assert.equal(searchRes.places.length, 2);
    assert.equal(searchRes.places[0].photo_ref.author_attributions[0].displayName, 'Juan Pérez');
    assert.equal(searchRes.places[1].photo_ref, null);
    assert.equal(JSON.stringify(searchRes).includes(secretKey), false);

    // Resolución de foto bajo demanda
    const photoRes = await okClient.getPhotoMedia({
      photoName: 'places/gp_1/photos/ph_1',
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ name: 'places/gp_1/photos/ph_1/media', photoUri: 'https://lh3.googleusercontent.com/demo' }),
      }),
    });
    assert.equal(photoRes.photo_uri, 'https://lh3.googleusercontent.com/demo');
    assert.equal(JSON.stringify(photoRes).includes(secretKey), false);
  });

  await suite.test('10 y 15. Endpoints admin protegidos, modificación pet-policy, retiro y eventos n8n idempotentes', async () => {
    const place = await placesRepository.create({
      id: 'plc_test_pet_verify',
      name: 'Café Verificación Test',
      category: 'cafe',
      lat: 9.9355,
      lng: -84.0655,
      address: 'Escalante',
    });

    // Sin permisos -> 401 / 403
    const noAuth = await executeMockRequest('PUT', `/api/admin/places/${place.id}/pet-policy`, {
      body: { access_status: 'allowed' },
    });
    assert.equal(noAuth.status, 401);

    const clientForbidden = await executeMockRequest('PUT', `/api/admin/places/${place.id}/pet-policy`, {
      headers: { authorization: `Bearer ${clientToken}` },
      body: { access_status: 'allowed' },
    });
    assert.equal(clientForbidden.status, 403);

    // Admin registra política y confirma
    const adminUpsert = await executeMockRequest('PUT', `/api/admin/places/${place.id}/pet-policy`, {
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        access_status: 'allowed',
        source_type: 'business_confirmation',
        species_allowed: ['dog', 'cat'],
        max_pets: 2,
        seating_access: 'both',
        leash_required: true,
        evidence_ref: 'acta_verificacion_01',
      },
    });
    assert.equal(adminUpsert.status, 200);
    assert.equal(adminUpsert.body.data.place.verified_by_admin, true);

    // Confirmación desde flujo n8n con idempotency_key repetido no duplica
    const n8nKey = `n8n_conf_${Date.now()}`;
    const n8nFirst = await executeMockRequest('POST', '/api/admin/pet-automation/confirmations', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        idempotency_key: n8nKey,
        place_id: place.id,
        access_status: 'allowed',
        conditions: { species_allowed: ['dog'], max_pets: 1, seating_access: 'outdoor' },
      },
    });
    assert.equal(n8nFirst.status, 200);
    assert.equal(n8nFirst.body.data.idempotent_replay, false);

    const n8nReplay = await executeMockRequest('POST', '/api/admin/pet-automation/confirmations', {
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        idempotency_key: n8nKey,
        place_id: place.id,
        access_status: 'allowed',
      },
    });
    assert.equal(n8nReplay.status, 200);
    assert.equal(n8nReplay.body.data.idempotent_replay, true);

    // Retirar confirmación
    const withdrawRes = await executeMockRequest('DELETE', `/api/admin/places/${place.id}/pet-confirm`, {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { reason: 'Cambio de administración' },
    });
    assert.equal(withdrawRes.status, 200);
    assert.equal(withdrawRes.body.data.status, 'retracted');
    assert.equal(withdrawRes.body.data.place.verified_by_admin, false);

    // Escaneo de eventos n8n idempotente (2da llamada no duplica los mismos eventos del día)
    const scan1 = await executeMockRequest('GET', '/api/admin/pet-automation/events', {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(scan1.status, 200);
    assert.ok(scan1.body.data.emitted_count >= 1);

    const scan2 = await executeMockRequest('GET', '/api/admin/pet-automation/events', {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(scan2.status, 200);
    assert.equal(scan2.body.data.emitted_count, 0);
  });
});
