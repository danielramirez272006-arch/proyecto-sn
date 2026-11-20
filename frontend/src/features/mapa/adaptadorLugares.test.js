import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarEstadoMascota,
  etiquetaEstadoMascota,
  adaptarTerrazaDemo,
  adaptarLugarExterno,
  filtrarLugares,
  ordenarLugares,
} from './adaptadorLugares.js';

test('normalizarEstadoMascota distingue permitido, no_permitido y desconocido', () => {
  assert.equal(normalizarEstadoMascota('si'), 'permitido');
  assert.equal(normalizarEstadoMascota('sí'), 'permitido');
  assert.equal(normalizarEstadoMascota(true), 'permitido');

  assert.equal(normalizarEstadoMascota('no'), 'no_permitido');
  assert.equal(normalizarEstadoMascota(false), 'no_permitido');

  assert.equal(normalizarEstadoMascota('consultar'), 'desconocido');
  assert.equal(normalizarEstadoMascota(null), 'desconocido');
  assert.equal(normalizarEstadoMascota(undefined), 'desconocido');

  assert.notEqual(etiquetaEstadoMascota(normalizarEstadoMascota('no')), 'Mascotas: Pendiente');
  assert.equal(etiquetaEstadoMascota('no_permitido'), 'Mascotas: No permitido');
});

test('adaptarLugarExterno conserva señales sin confirmar y deja terraza/tranquilidad desconocidas sin evidencia', () => {
  const lugar = adaptarLugarExterno({
    id: 'osm-123',
    name: 'Café Central',
    lat: 9.935,
    lng: -84.07,
    pet_friendly: 'si',
  });

  assert.equal(lugar.petStatus, 'permitido');
  assert.equal(lugar.confirmadoPorEstablecimiento, false);
  assert.equal(lugar.terraza, 'desconocido');
  assert.equal(lugar.tranquilidad, 'desconocido');
  assert.match(lugar.etiquetaProcedencia, /sin confirmación/i);
});

test('adaptarLugarExterno no convierte pet_friendly="no" en pendiente ni desconocido', () => {
  const lugar = adaptarLugarExterno({
    id: 'osm-456',
    name: 'Restaurante Estricto',
    lat: 9.936,
    lng: -84.071,
    pet_friendly: 'no',
    outdoor_seating: false,
  });

  assert.equal(lugar.petStatus, 'no_permitido');
  assert.equal(lugar.terraza, 'no_disponible');
  assert.equal(lugar.tranquilidad, 'desconocido');
});

test('adaptarTerrazaDemo mantiene visible etiqueta de demostración', () => {
  const demo = adaptarTerrazaDemo(
    {
      id: 'franco-cafe',
      nombre: 'Franco Café',
      decibelios: 46,
      zona: 'Escalante',
    },
    { lat: 9.9355, lng: -84.0652 }
  );

  assert.equal(demo.esDemo, true);
  assert.equal(demo.confirmadoPorEstablecimiento, false);
  assert.match(demo.etiquetaProcedencia, /demostración/i);
  assert.equal(demo.tranquilidad, 'silencioso');
});

test('filtrarLugares y ordenarLugares filtran y ordenan de forma determinista', () => {
  const items = [
    adaptarLugarExterno({ id: '1', name: 'Beta', lat: 9.93, lng: -84.07, pet_friendly: 'no' }),
    adaptarLugarExterno({ id: '2', name: 'Alfa', lat: 9.93, lng: -84.07, pet_friendly: 'si' }),
    adaptarLugarExterno({ id: '3', name: 'Gamma', lat: 9.93, lng: -84.07, pet_friendly: 'consultar' }),
  ];

  const soloPermitidos = filtrarLugares(items, { soloPermitidos: true });
  assert.equal(soloPermitidos.length, 1);
  assert.equal(soloPermitidos[0].nombre, 'Alfa');

  const sinDesconocidos = filtrarLugares(items, { incluirDesconocidos: false });
  assert.equal(sinDesconocidos.length, 2);
  assert.equal(sinDesconocidos.some((x) => x.petStatus === 'desconocido'), false);

  const porNombre = ordenarLugares(items, 'nombre');
  assert.deepEqual(
    porNombre.map((x) => x.nombre),
    ['Alfa', 'Beta', 'Gamma']
  );

  const porRelevancia = ordenarLugares(items, 'relevancia');
  assert.deepEqual(
    porRelevancia.map((x) => x.petStatus),
    ['permitido', 'desconocido', 'no_permitido']
  );
});

test('adaptarLugarExterno integra datos del coordinador multifuente (foto aprobada, condiciones y verificación)', () => {
  const lugar = adaptarLugarExterno({
    id: 'LOC-001',
    name: 'Franco Café',
    lat: 9.9355,
    lng: -84.0652,
    access_status: 'allowed',
    verification_level: 'business_confirmation',
    explanation: 'Confirmado por el establecimiento: terraza cubierta.',
    known_conditions: {
      seating_access: 'outdoor',
      notes: 'Agua fresca disponible',
    },
    photo: {
      url: 'https://cdn.gotox.cr/public/places/LOC-001/cover.jpg',
      author: 'Prensa Franco',
      license: 'CC BY 4.0',
    },
  });

  assert.equal(lugar.petStatus, 'permitido');
  assert.equal(lugar.terraza, 'disponible');
  assert.equal(lugar.confirmadoPorEstablecimiento, true);
  assert.equal(lugar.imagen, 'https://cdn.gotox.cr/public/places/LOC-001/cover.jpg');
  assert.equal(lugar.fotoCredito, 'Prensa Franco (CC BY 4.0)');
  assert.match(lugar.condicionesMascotas, /Confirmado por el establecimiento/);
});
