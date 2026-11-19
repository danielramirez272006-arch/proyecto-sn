process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MultisourcePlacesCoordinator } = require('../src/modules/places/multisource-places-coordinator');
const { FoursquarePlacesClient } = require('../src/shared/clients/foursquare-places-client');
const { GeoapifyPlacesClient } = require('../src/shared/clients/geoapify-places-client');
const googlePlacesClient = require('../src/shared/clients/google-places-client');
const app = require('../src/app');
const { initDatabase, runMigrations, resetForTesting } = require('../src/shared/config/database');

async function startTestServer() {
  resetForTesting();
  await initDatabase();
  await runMigrations();
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

test('Multisource: valida coordenadas, radio y límites', async () => {
  const coordinator = new MultisourcePlacesCoordinator();
  await assert.rejects(() => coordinator.search({ lat: '', lng: -84.08 }), { code: 'INVALID_COORDINATES' });
  await assert.rejects(() => coordinator.search({ lat: 95, lng: -84.08 }), { code: 'INVALID_COORDINATES' });
  await assert.rejects(() => coordinator.search({ lat: 9.93, lng: -84.08, radius: 50 }), { code: 'INVALID_RADIUS' });
  await assert.rejects(() => coordinator.search({ lat: 9.93, lng: -84.08, limit: 200 }), { code: 'INVALID_LIMIT' });
});

test('Multisource: maneja cuota agotada, proveedor no configurado y caída parcial sin llamar a Google ni pagos', async () => {
  let googleCalled = false;
  const origNearby = googlePlacesClient.searchNearbyRestaurants;
  const origText = googlePlacesClient.searchTextPlace;
  googlePlacesClient.searchNearbyRestaurants = async () => {
    googleCalled = true;
    throw new Error('Google no debe llamarse');
  };
  googlePlacesClient.searchTextPlace = async () => {
    googleCalled = true;
    throw new Error('Google no debe llamarse');
  };

  try {
    const coordinator = new MultisourcePlacesCoordinator();
    const fsq = new FoursquarePlacesClient({ enabled: true, allowPaidOperations: false, apiKey: 'FSQ_TEST_KEY' });
    await assert.rejects(() => fsq.getPlacePhotos({ fsqId: '123' }), { code: 'FOURSQUARE_PAID_OPERATION_DISABLED' });

    const res = await coordinator.search(
      { lat: 9.9352, lng: -84.0628, radius: 2000, limit: 10 },
      {
        placesRepo: { findAll: async () => [] },
        loadEvidence: async () => new Map(),
        loadPhotos: async () => new Map(),
        loadExternalLinks: async () => new Map(),
        osmService: {
          searchNearbyRestaurants: async () => {
            const err = new Error('OSM down');
            err.status = 502;
            throw err;
          },
        },
        geoapifyClient: new GeoapifyPlacesClient({ enabled: false, apiKey: '' }),
        foursquareClient: {
          isEnabledAndConfigured: () => true,
          searchPlaces: async () => [
            {
              external_id: 'fsq-ok-1',
              name: 'Café Resiliente',
              address: 'Barrio Escalante',
              lat: 9.9353,
              lng: -84.0629,
              source_url: 'https://foursquare.com/v/fsq-ok-1',
            },
          ],
        },
        wikimediaClient: { findPlacePhoto: async () => null },
      }
    );

    assert.equal(googleCalled, false);
    assert.equal(res.partial_result, true);
    assert.equal(res.providers_status.openstreetmap.status, 'error');
    assert.equal(res.providers_status.geoapify.status, 'not_configured');
    assert.equal(res.providers_status.foursquare.paid_operations, 'disabled');
    assert.equal(res.places.length, 1);
    assert.equal(res.places[0].name, 'Café Resiliente');
    assert.equal(res.places[0].photo, null);
    assert.match(res.places[0].photo_reason, /Sin fotografía/i);
  } finally {
    googlePlacesClient.searchNearbyRestaurants = origNearby;
    googlePlacesClient.searchTextPlace = origText;
  }
});

test('Multisource: unifica duplicados con origen compartido OSM+Geoapify sin doble confirmación y separa sucursales distintas', async () => {
  const coordinator = new MultisourcePlacesCoordinator();
  const res = await coordinator.search(
    { lat: 9.9352, lng: -84.0628, radius: 3000, limit: 10 },
    {
      placesRepo: { findAll: async () => [] },
      loadEvidence: async () => new Map(),
      loadPhotos: async () => new Map(),
      loadExternalLinks: async () => new Map(),
      osmService: {
        searchNearbyRestaurants: async () => ({
          restaurants: [
            {
              external_id: '1001',
              name: 'Cadena Café',
              address: 'Escalante',
              category: 'cafe',
              lat: 9.9352,
              lng: -84.0628,
              pet_access_status: 'allowed',
              source_url: 'https://www.openstreetmap.org/node/1001',
            },
            {
              external_id: '1002',
              name: 'Cadena Café',
              address: 'Sabana (otra sucursal)',
              category: 'cafe',
              lat: 9.936,
              lng: -84.085,
              pet_access_status: 'not_allowed',
              source_url: 'https://www.openstreetmap.org/node/1002',
            },
          ],
        }),
      },
      geoapifyClient: {
        isEnabledAndConfigured: () => true,
        searchRestaurants: async () => ({
          places: [
            {
              provider: 'geoapify',
              external_id: 'geo-1001',
              osm_id: '1001',
              shared_origin: 'openstreetmap',
              name: 'Cadena Café',
              address: 'Escalante',
              category: 'cafe',
              lat: 9.93521,
              lng: -84.06281,
              pet_access_status: 'allowed',
              queried_at: new Date().toISOString(),
            },
          ],
        }),
      },
      foursquareClient: { isEnabledAndConfigured: () => false },
      wikimediaClient: { findPlacePhoto: async () => null },
    }
  );

  // Dos sucursales separadas (> 2km), y la de Escalante unificada con shared_origin_detected=true y 1 sola evidencia OSM
  assert.equal(res.places.length, 2);
  const escalante = res.places.find((p) => p.address.includes('Escalante'));
  assert.equal(escalante.shared_origin_detected, true);
  assert.equal(escalante.evidence.length, 1);
  assert.equal(escalante.verification_level, 'external_provider');
});

test('Multisource: detecta condiciones contradictorias y exige licencia en Wikimedia Commons conservando créditos', async () => {
  const coordinator = new MultisourcePlacesCoordinator();
  const res = await coordinator.search(
    { lat: 9.9352, lng: -84.0628, radius: 2000, limit: 10 },
    {
      placesRepo: {
        findAll: async () => [
          {
            id: 'p-conflict',
            name: 'Bistro Mixto',
            category: 'restaurant',
            address: 'Escalante',
            lat: 9.9352,
            lng: -84.0628,
            attributes_metadata: {
              pet_policy: { access_status: 'not_allowed', source_type: 'admin_review', provider_name: 'gotox_admin' },
            },
          },
          {
            id: 'p-wiki-ok',
            name: 'Museo Cultural',
            category: 'cafe',
            address: 'La Sabana',
            lat: 9.9355,
            lng: -84.064,
            attributes_metadata: {},
          },
        ],
      },
      loadEvidence: async () => new Map(),
      loadPhotos: async () => new Map(),
      loadExternalLinks: async () => new Map(),
      osmService: {
        searchNearbyRestaurants: async () => ({
          restaurants: [
            {
              external_id: '2001',
              name: 'Bistro Mixto',
              lat: 9.9352,
              lng: -84.0628,
              pet_access_status: 'allowed',
            },
          ],
        }),
      },
      geoapifyClient: { isEnabledAndConfigured: () => false },
      foursquareClient: { isEnabledAndConfigured: () => false },
      wikimediaClient: {
        findPlacePhoto: async ({ name }) => {
          if (name === 'Bistro Mixto') {
            // Sin licencia -> debe rechazarse y quedar en photo: null
            return { photo_url: 'https://commons.wikimedia.org/sin-licencia.jpg', license: null, source_url: 'https://commons.wikimedia.org/x' };
          }
          return {
            photo_url: 'https://commons.wikimedia.org/museo.jpg',
            author: 'Ana CR',
            license: 'CC BY-SA 4.0',
            source_url: 'https://commons.wikimedia.org/wiki/File:Museo.jpg',
          };
        },
      },
    }
  );

  const bistro = res.places.find((p) => p.id === 'p-conflict');
  assert.equal(bistro.access_status, 'conflicting');
  assert.equal(bistro.photo, null);
  assert.match(bistro.photo_reason, /sin licencia/i);

  const museo = res.places.find((p) => p.id === 'p-wiki-ok');
  assert.equal(museo.photo.provider, 'wikimedia_commons');
  assert.equal(museo.photo.author, 'Ana CR');
  assert.equal(museo.photo.license, 'CC BY-SA 4.0');
});

test('Multisource Admin HTTP: rutas protegidas rechazan acceso sin permisos y permiten flujos autorizados', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const unauth = await fetch(`${baseUrl}/api/admin/places/multisource/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_id: 'p1', photo_url: 'https://example.com/a.jpg', license: 'CC BY 4.0' }),
    });
    assert.equal(unauth.status === 401 || unauth.status === 403, true);

    const eventsUnauth = await fetch(`${baseUrl}/api/admin/places/multisource/automation-events`);
    assert.equal(eventsUnauth.status === 401 || eventsUnauth.status === 403, true);

    const invalidSearch = await fetch(`${baseUrl}/api/places/multisource/search?lat=&lng=-84`);
    assert.equal(invalidSearch.status, 400);
    const invalidJson = await invalidSearch.json();
    assert.equal(invalidJson.ok, false);
    assert.equal(invalidJson.error.details.code, 'INVALID_COORDINATES');
  } finally {
    await new Promise((r) => server.close(r));
  }
});
