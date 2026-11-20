/**
 * Adaptador de lugares para el prototipo de mapa GoToX Pet OS.
 *
 * Reglas estrictas:
 * - Conserva la diferencia entre permitido, no_permitido y desconocido.
 * - Nunca convierte false o "no" en "pendiente".
 * - Nunca convierte una señal de proveedor externo o dato demo en confirmación del establecimiento.
 * - Deja terraza y tranquilidad como "desconocido" cuando no exista evidencia explícita.
 */

export function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  if (
    !Number.isFinite(Number(lat1)) ||
    !Number.isFinite(Number(lng1)) ||
    !Number.isFinite(Number(lat2)) ||
    !Number.isFinite(Number(lng2))
  ) {
    return null;
  }
  const rad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = rad(Number(lat2) - Number(lat1));
  const dLng = rad(Number(lng2) - Number(lng1));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(Number(lat1))) *
      Math.cos(rad(Number(lat2))) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Normaliza valores heterogéneos de pet_friendly ("si", "no", "consultar", booleanos, null/undefined).
 * @returns {'permitido' | 'no_permitido' | 'desconocido'}
 */
export function normalizarEstadoMascota(valor) {
  if (valor === true) return 'permitido';
  if (valor === false) return 'no_permitido';

  if (typeof valor === 'string') {
    const limpio = valor.trim().toLowerCase();
    if (['si', 'sí', 'yes', 'true', 'allowed', 'permitido', '1'].includes(limpio)) {
      return 'permitido';
    }
    if (['no', 'false', 'not_allowed', 'no_permitido', 'prohibido', '0'].includes(limpio)) {
      return 'no_permitido';
    }
    if (['consultar', 'unknown', 'desconocido', 'pendiente', ''].includes(limpio)) {
      return 'desconocido';
    }
  }

  return 'desconocido';
}

export function etiquetaEstadoMascota(estado) {
  if (estado === 'permitido') return 'Mascotas: Permitido';
  if (estado === 'no_permitido') return 'Mascotas: No permitido';
  return 'Mascotas: Desconocido';
}

export function etiquetaTerraza(estado) {
  if (estado === 'disponible') return 'Terraza disponible';
  if (estado === 'no_disponible') return 'Sin terraza';
  return 'Terraza: Desconocida';
}

export function etiquetaTranquilidad(estado, decibelios = null) {
  if (estado === 'silencioso') {
    return Number.isFinite(decibelios) ? `Tranquilo (${decibelios} dB demo)` : 'Ambiente tranquilo';
  }
  if (estado === 'moderado') {
    return Number.isFinite(decibelios) ? `Ruido moderado (${decibelios} dB demo)` : 'Ruido moderado';
  }
  return 'Tranquilidad: Desconocida';
}

/**
 * Adapta una terraza estática de demostración (TERRAZAS) sin presentarla como verificación real.
 */
export function adaptarTerrazaDemo(terraza, coord, ubicacionUsuario = null) {
  const lat = Number(coord?.lat);
  const lng = Number(coord?.lng);
  const distanciaKm = ubicacionUsuario
    ? calcularDistanciaKm(ubicacionUsuario.lat, ubicacionUsuario.lng, lat, lng)
    : null;

  const tieneDb = Number.isFinite(Number(terraza.decibelios));
  const tranquilidad = !tieneDb
    ? 'desconocido'
    : Number(terraza.decibelios) <= 48
    ? 'silencioso'
    : 'moderado';

  return {
    id: `demo-${terraza.id}`,
    rawId: terraza.id,
    tipoCapa: 'terraza_demo',
    nombre: terraza.nombre,
    categoria: terraza.categoria || 'Cafetería & Terraza',
    zona: terraza.zona || coord?.barrio || 'San José, GAM',
    direccion: terraza.zona || coord?.barrio || 'Área Metropolitana (Demo)',
    lat,
    lng,
    distanciaKm,
    petStatus: 'permitido',
    terraza: 'disponible',
    tranquilidad,
    decibelios: tieneDb ? Number(terraza.decibelios) : null,
    temperaturaPiso: terraza.temperaturaPiso || null,
    condicionesMascotas: terraza.condicionesMascotas || null,
    horarioRecomendado: terraza.horarioRecomendado || null,
    servicios: Array.isArray(terraza.servicios) ? terraza.servicios : [],
    imagen: terraza.imagen || null,
    descripcion: terraza.descripcion || null,
    esDemo: true,
    confirmadoPorEstablecimiento: false,
    etiquetaProcedencia: 'Datos de demostración (no verificados oficialmente)',
    fuente: 'Catálogo Demo GoToX Pet OS',
  };
}

/**
 * Adapta un lugar proveniente de un proveedor externo o respuesta compatible con /api/places/nearby-real.
 */
export function adaptarLugarExterno(item, ubicacionUsuario = null) {
  const lat = Number(item.lat);
  const lng = Number(item.lng);
  const distanciaKm = ubicacionUsuario
    ? calcularDistanciaKm(ubicacionUsuario.lat, ubicacionUsuario.lng, lat, lng)
    : Number.isFinite(Number(item.distance_km))
    ? Number(item.distance_km)
    : null;

  const petStatus = normalizarEstadoMascota(
    item.pet_friendly ?? item.allows_dogs_signal ?? item.access_status
  );

  let terraza = 'desconocido';
  const seatingAccess = item.known_conditions?.seating_access;
  if (
    item.outdoor_seating === true ||
    item.outdoor_seating === 'yes' ||
    item.outdoor_seating === 'si' ||
    seatingAccess === 'outdoor' ||
    seatingAccess === 'both'
  ) {
    terraza = 'disponible';
  } else if (
    item.outdoor_seating === false ||
    item.outdoor_seating === 'no' ||
    seatingAccess === 'indoor'
  ) {
    terraza = 'no_disponible';
  }

  let tranquilidad = 'desconocido';
  const db = Number(item.decibelios);
  if (Number.isFinite(db)) {
    tranquilidad = db <= 48 ? 'silencioso' : 'moderado';
  } else if (item.tranquilidad === 'silencioso' || item.tranquilidad === 'moderado') {
    tranquilidad = item.tranquilidad;
  }

  const confirmado =
    item.verification_level === 'business_confirmation' ||
    item.verification_level === 'admin_review';

  const fotoUrl = item.photo?.url || item.imagen || null;
  const fotoCredito = item.photo?.author
    ? `${item.photo.author}${item.photo.license ? ` (${item.photo.license})` : ''}`
    : null;

  return {
    id: `ext-${item.id || item.external_id || `${lat}-${lng}`}`,
    rawId: item.id || item.external_id || null,
    tipoCapa: 'restaurante',
    nombre: item.name || item.nombre || 'Establecimiento sin nombre',
    categoria:
      item.category === 'cafe'
        ? 'Cafetería'
        : item.category === 'bar'
        ? 'Bar & Gastro'
        : item.cuisine || 'Restaurante',
    zona: item.address || 'Zona cercana',
    direccion: item.address || 'Dirección no especificada',
    lat,
    lng,
    distanciaKm,
    petStatus,
    terraza,
    tranquilidad,
    decibelios: Number.isFinite(db) ? db : null,
    telefono: item.phone || null,
    horarioRecomendado: item.opening_hours || null,
    cuisine: item.cuisine || null,
    imagen: fotoUrl,
    fotoCredito,
    condicionesMascotas: item.explanation || item.known_conditions?.notes || null,
    esDemo: false,
    confirmadoPorEstablecimiento: confirmado,
    etiquetaProcedencia: confirmado
      ? 'Verificado por evidencia administrativa / confirmación del local'
      : 'Señal de proveedor externo (sin confirmación del local)',
    fuente: item.source_attribution?.primary_provider || item.provider || 'Coordinador Multi-fuente',
  };
}

/**
 * Filtra lugares por búsqueda y filtros de compatibilidad/comodidad.
 */
export function filtrarLugares(
  lugares,
  {
    capaActiva = 'todas',
    busqueda = '',
    soloPermitidos = false,
    conTerraza = false,
    soloTranquilos = false,
    incluirDesconocidos = true
  } = {}
) {
  const q = busqueda.trim().toLowerCase();

  return lugares.filter((lugar) => {
    if (capaActiva === 'restaurantes' && lugar.tipoCapa !== 'restaurante') {
      return false;
    }
    if (capaActiva === 'silencioso' && lugar.tranquilidad !== 'silencioso') {
      return false;
    }
    if ((capaActiva === 'permitidos' || soloPermitidos) && lugar.petStatus !== 'permitido') {
      return false;
    }
    if (conTerraza && lugar.terraza !== 'disponible') {
      return false;
    }
    if (soloTranquilos && lugar.tranquilidad !== 'silencioso') {
      return false;
    }
    if (!incluirDesconocidos && lugar.petStatus === 'desconocido') {
      return false;
    }
    if (!q) return true;

    return (
      lugar.nombre.toLowerCase().includes(q) ||
      lugar.categoria.toLowerCase().includes(q) ||
      lugar.zona.toLowerCase().includes(q) ||
      lugar.direccion.toLowerCase().includes(q)
    );
  });
}

/**
 * Ordena lugares según el criterio seleccionado por el usuario.
 */
export function ordenarLugares(lugares, orden = 'relevancia') {
  const copia = [...lugares];

  if (orden === 'nombre') {
    return copia.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  if (orden === 'distancia') {
    return copia.sort((a, b) => {
      const da = a.distanciaKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanciaKm ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
  }

  if (orden === 'tranquilidad') {
    const pesoTranquilidad = { silencioso: 0, moderado: 1, desconocido: 2 };
    return copia.sort((a, b) => {
      const pa = pesoTranquilidad[a.tranquilidad] ?? 2;
      const pb = pesoTranquilidad[b.tranquilidad] ?? 2;
      if (pa !== pb) return pa - pb;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
  }

  // 'relevancia': permitido primero, luego desconocido, luego no_permitido
  const pesoPet = { permitido: 0, desconocido: 1, no_permitido: 2 };
  return copia.sort((a, b) => {
    const pa = pesoPet[a.petStatus] ?? 1;
    const pb = pesoPet[b.petStatus] ?? 1;
    if (pa !== pb) return pa - pb;
    const da = a.distanciaKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanciaKm ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}
