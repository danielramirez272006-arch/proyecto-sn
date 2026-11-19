import test from 'node:test';
import assert from 'node:assert/strict';
import { construirPayloadLugar, aplicarFotoResueltaALugar } from './place-photos-service.js';

test('construirPayloadLugar extrae id, nombre, dirección y coordenadas para verificar sucursal', () => {
  const payload = construirPayloadLugar({
    id: 'franco-cafe',
    nombre: 'Franco Café',
    direccion: 'Calle 33, Barrio Escalante',
    zona: 'Barrio Escalante',
    lat: 9.9352,
    lng: -84.0628
  });

  assert.deepEqual(payload, {
    id: 'franco-cafe',
    name: 'Franco Café',
    address: 'Calle 33, Barrio Escalante',
    zone: 'Barrio Escalante',
    lat: 9.9352,
    lng: -84.0628
  });
});

test('aplicarFotoResueltaALugar conecta photo_url y atribuciones reales con la tarjeta', () => {
  const base = { id: 'franco-cafe', nombre: 'Franco Café', imagen: null, galeria: [] };
  const actualizado = aplicarFotoResueltaALugar(base, {
    internal_id: 'franco-cafe',
    external_id: 'ChIJ123',
    provider: 'google_places',
    status: 'resolved',
    photo_url: 'https://lh3.googleusercontent.com/places/real-photo',
    gallery: [{ url: 'https://lh3.googleusercontent.com/places/real-photo', attributions: [] }],
    attributions: [{ displayName: 'Autor Real', uri: 'https://maps.google.com/u/1' }],
    source_url: 'https://maps.google.com/?cid=123'
  });

  assert.equal(actualizado.imagen, 'https://lh3.googleusercontent.com/places/real-photo');
  assert.deepEqual(actualizado.galeria, ['https://lh3.googleusercontent.com/places/real-photo']);
  assert.equal(actualizado.photoMeta.externalId, 'ChIJ123');
  assert.equal(actualizado.photoMeta.provider, 'google_places');
  assert.equal(actualizado.photoMeta.attributions[0].displayName, 'Autor Real');
});

test('aplicarFotoResueltaALugar deja imagen=null cuando status es no_photos, ambiguous o error', () => {
  const base = { id: 'apotecario', nombre: 'Apotecario', imagen: null, galeria: [] };

  for (const status of ['no_photos', 'ambiguous', 'error', 'not_configured']) {
    const res = aplicarFotoResueltaALugar(base, {
      internal_id: 'apotecario',
      status,
      photo_url: null,
      gallery: [],
      attributions: [],
      reason: 'Sin foto'
    });
    assert.equal(res.imagen, null);
    assert.deepEqual(res.galeria, []);
    assert.equal(res.photoMeta.status, status);
  }
});
