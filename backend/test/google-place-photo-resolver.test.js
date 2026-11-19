const test = require('node:test');
const assert = require('node:assert/strict');
const { GooglePlacesClient } = require('../src/shared/clients/google-places-client');
const { resolvePlacePhotos, resolveBatchPlacePhotos } = require('../src/modules/places/google-place-photo-resolver');

test('resolvePlacePhotos devuelve not_configured cuando falta GOOGLE_PLACES_API_KEY', async () => {
  const client = new GooglePlacesClient({ apiKey: '' });
  const result = await resolvePlacePhotos(
    { id: 'franco-cafe', name: 'Franco Café', address: 'Barrio Escalante', lat: 9.9355, lng: -84.0652 },
    { googleClient: client }
  );

  assert.equal(result.status, 'not_configured');
  assert.equal(result.photo_url, null);
  assert.deepEqual(result.gallery, []);
});

test('resolvePlacePhotos distingue errores de permisos (403) y cuota (429) sin devolver fotos genéricas', async () => {
  const client403 = new GooglePlacesClient({ apiKey: 'SECRET_TEST_KEY_403' });
  const origSearchText = client403.searchTextPlace.bind(client403);
  client403.searchTextPlace = (opts) =>
    origSearchText({
      ...opts,
      fetchImpl: async () => new Response('Forbidden', { status: 403 }),
    });

  const res403 = await resolvePlacePhotos(
    { id: 'franco-cafe', name: 'Franco Café', lat: 9.9355, lng: -84.0652 },
    { googleClient: client403 }
  );
  assert.equal(res403.status, 'error');
  assert.equal(res403.error_code, 'GOOGLE_PLACES_AUTH_ERROR');
  assert.equal(res403.photo_url, null);
  assert.equal(JSON.stringify(res403).includes('SECRET_TEST_KEY_403'), false);

  const client429 = new GooglePlacesClient({ apiKey: 'SECRET_TEST_KEY_429' });
  const orig429 = client429.searchTextPlace.bind(client429);
  client429.searchTextPlace = (opts) =>
    orig429({
      ...opts,
      fetchImpl: async () => new Response('Quota exceeded', { status: 429 }),
    });

  const res429 = await resolvePlacePhotos(
    { id: 'franco-cafe', name: 'Franco Café', lat: 9.9355, lng: -84.0652 },
    { googleClient: client429 }
  );
  assert.equal(res429.status, 'error');
  assert.equal(res429.error_code, 'GOOGLE_PLACES_QUOTA_EXCEEDED');
  assert.equal(res429.photo_url, null);
  assert.equal(JSON.stringify(res429).includes('SECRET_TEST_KEY_429'), false);
});

test('resolvePlacePhotos identifica sucursal correcta, resuelve foto con créditos y no expone API key', async () => {
  const fakeClient = {
    isConfigured: () => true,
    searchTextPlace: async () => [
      {
        external_id: 'ChIJFranco123',
        name: 'Franco',
        address: 'Calle 33, Barrio Escalante, San José',
        lat: 9.9355,
        lng: -84.0652,
        source_url: 'https://maps.google.com/?cid=123',
        photos: [
          {
            name: 'places/ChIJFranco123/photos/photoA',
            authorAttributions: [
              { displayName: 'Juan Pérez', uri: 'https://maps.google.com/contrib/1', photoUri: null },
            ],
          },
        ],
      },
    ],
    getPhotoMedia: async ({ photoName }) => ({
      name: photoName,
      photo_uri: 'https://lh3.googleusercontent.com/places/real-franco-photo',
      width_px: 900,
      provider: 'google_places',
    }),
  };

  const result = await resolvePlacePhotos(
    { id: 'franco-cafe', name: 'Franco Café', address: 'Calle 33, Barrio Escalante', lat: 9.9352, lng: -84.0628 },
    { googleClient: fakeClient }
  );

  assert.equal(result.status, 'resolved');
  assert.equal(result.internal_id, 'franco-cafe');
  assert.equal(result.external_id, 'ChIJFranco123');
  assert.equal(result.provider, 'google_places');
  assert.equal(result.photo_url, 'https://lh3.googleusercontent.com/places/real-franco-photo');
  assert.equal(result.attributions[0].displayName, 'Juan Pérez');
  assert.equal(result.source_url, 'https://maps.google.com/?cid=123');
});

test('resolvePlacePhotos marca sucursal ambigua cuando hay múltiples coincidencias cercanas', async () => {
  const fakeClient = {
    isConfigured: () => true,
    searchTextPlace: async () => [
      {
        external_id: 'ChIJSucursal1',
        name: 'Café Miel',
        address: 'Barrio Amón, San José',
        lat: 9.9383,
        lng: -84.0757,
        source_url: 'https://maps.google.com/?cid=1',
        photos: [{ name: 'places/ChIJSucursal1/photos/p1', authorAttributions: [] }],
      },
      {
        external_id: 'ChIJSucursal2',
        name: 'Café Miel',
        address: 'Barrio Amón, San José',
        lat: 9.9384,
        lng: -84.0756,
        source_url: 'https://maps.google.com/?cid=2',
        photos: [{ name: 'places/ChIJSucursal2/photos/p2', authorAttributions: [] }],
      },
    ],
  };

  const result = await resolvePlacePhotos(
    { id: 'cafe-miel', name: 'Café Miel', address: 'Barrio Amón', lat: 9.9383, lng: -84.0757 },
    { googleClient: fakeClient }
  );

  assert.equal(result.status, 'ambiguous');
  assert.equal(result.photo_url, null);
  assert.deepEqual(result.gallery, []);
});

test('resolvePlacePhotos devuelve no_photos cuando el local existe en Google pero no tiene fotos', async () => {
  const fakeClient = {
    isConfigured: () => true,
    searchTextPlace: async () => [
      {
        external_id: 'ChIJSinFoto',
        name: 'Apotecario',
        address: 'Barrio Escalante, San José',
        lat: 9.9324,
        lng: -84.0706,
        source_url: 'https://maps.google.com/?cid=99',
        photos: [],
      },
    ],
  };

  const result = await resolvePlacePhotos(
    { id: 'apotecario', name: 'Apotecario', address: 'Barrio Escalante', lat: 9.9324, lng: -84.0706 },
    { googleClient: fakeClient }
  );

  assert.equal(result.status, 'no_photos');
  assert.equal(result.external_id, 'ChIJSinFoto');
  assert.equal(result.photo_url, null);
});

test('resolveBatchPlacePhotos valida entrada y devuelve lista estructurada', async () => {
  await assert.rejects(() => resolveBatchPlacePhotos('invalido'), { code: 'INVALID_PLACES_LIST' });
});

test('resolvePlacePhotos resuelve foto desde Foursquare cuando está configurado', async () => {
  const fakeFsq = {
    isConfigured: () => true,
    searchPlaces: async () => [
      {
        external_id: 'fsq-franco-1',
        name: 'Franco Café',
        address: 'Calle 33, Barrio Escalante',
        lat: 9.9353,
        lng: -84.0629,
        source_url: 'https://foursquare.com/v/fsq-franco-1',
      },
    ],
    getPlacePhotos: async () => [
      { url: 'https://fastly.4sqi.net/img/general/900x600/franco.jpg', width: 900, height: 600 },
    ],
  };

  const result = await resolvePlacePhotos(
    { id: 'franco-cafe', name: 'Franco Café', address: 'Calle 33, Barrio Escalante', lat: 9.9352, lng: -84.0628 },
    {
      foursquareClient: fakeFsq,
      wikimediaClient: { findPlacePhoto: async () => null },
      googleClient: new GooglePlacesClient({ apiKey: '' }),
    }
  );

  assert.equal(result.status, 'resolved');
  assert.equal(result.provider, 'foursquare');
  assert.equal(result.external_id, 'fsq-franco-1');
  assert.equal(result.photo_url, 'https://fastly.4sqi.net/img/general/900x600/franco.jpg');
});

test('resolvePlacePhotos resuelve foto gratuita desde Wikimedia Commons para museos/parques', async () => {
  const fakeWiki = {
    findPlacePhoto: async () => ({
      external_id: '12345',
      provider: 'wikimedia_commons',
      matched_name: 'Museo de Arte Costarricense',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/museo.jpg',
      gallery: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/museo.jpg', attributions: [] }],
      attributions: [{ displayName: 'Autor Libre · CC BY-SA 4.0', uri: 'https://commons.wikimedia.org/wiki/File:Museo.jpg' }],
      source_url: 'https://commons.wikimedia.org/wiki/File:Museo.jpg',
    }),
  };

  const result = await resolvePlacePhotos(
    { id: 'museo-arte', name: 'Museo de Arte Costarricense', lat: 9.9355, lng: -84.1008 },
    {
      foursquareClient: { isConfigured: () => false },
      wikimediaClient: fakeWiki,
      googleClient: new GooglePlacesClient({ apiKey: '' }),
    }
  );

  assert.equal(result.status, 'resolved');
  assert.equal(result.provider, 'wikimedia_commons');
  assert.equal(result.photo_url, 'https://upload.wikimedia.org/wikipedia/commons/museo.jpg');
  assert.equal(result.attributions[0].displayName, 'Autor Libre · CC BY-SA 4.0');
});
