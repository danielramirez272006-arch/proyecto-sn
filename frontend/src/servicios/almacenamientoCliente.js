/**
 * Servicio Cliente de Almacenamiento Persistente — Synodos (Σύνοδος)
 * Gestiona Favoritos, Mis Planes, Check-ins Comunitarios, Alertas SOS y
 * Recordatorios Médicos / Eventos en localStorage y sincroniza con el backend.
 */

const CLAVE_FAVORITOS = 'gotox_favoritos_v1';
const CLAVE_FAVORITOS_DATA = 'gotox_favoritos_data_v1';
const CLAVE_PLANES = 'gotox_planes_v1';
const CLAVE_CHECKINS = 'synodos_checkins_v1';
const CLAVE_ALERTAS_SOS = 'synodos_alertas_sos_v1';
const CLAVE_RECORDATORIOS = 'synodos_recordatorios_v1';
const CLAVE_EVENTOS_AGENDADOS = 'synodos_eventos_agendados_v1';

// Evento custom para sincronización instantánea entre componentes
const emitirCambio = (tipo) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`gotox:${tipo}`));
  }
};

/* ============================================================
   1. GESTIÓN DE FAVORITOS (SOPORTA LUGARES LOCALES Y DE SUPABASE DB)
   ============================================================ */
export const obtenerFavoritosIds = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CLAVE_FAVORITOS);
    const parsed = raw ? JSON.parse(raw) : ['franco-cafe', 'el-arbol-de-seda'];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return ['franco-cafe', 'el-arbol-de-seda'];
  }
};

export const obtenerFavoritosGuardadosMap = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CLAVE_FAVORITOS_DATA);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const esFavorito = (lugarId) => {
  if (!lugarId) return false;
  const favs = obtenerFavoritosIds();
  return favs.includes(String(lugarId));
};

export const alternarFavorito = (lugarOrId, lugarSnapshot = null) => {
  const esObj = lugarOrId && typeof lugarOrId === 'object';
  const lugarId = String(esObj ? lugarOrId.id : lugarOrId || '').trim();
  const datosLugar = esObj ? lugarOrId : lugarSnapshot;
  if (!lugarId) return obtenerFavoritosIds();

  const favs = obtenerFavoritosIds();
  const mapaDatos = obtenerFavoritosGuardadosMap();
  let nuevos;

  if (favs.includes(lugarId)) {
    nuevos = favs.filter((id) => id !== lugarId);
  } else {
    nuevos = [...favs, lugarId];
    if (datosLugar && typeof datosLugar === 'object') {
      mapaDatos[lugarId] = {
        ...datosLugar,
        id: lugarId
      };
    }
  }

  try {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(nuevos));
    localStorage.setItem(CLAVE_FAVORITOS_DATA, JSON.stringify(mapaDatos));
    emitirCambio('favoritos');
  } catch (e) {
    console.error('Error al guardar favorito:', e);
  }
  return nuevos;
};

/* ============================================================
   2. GESTIÓN DE MIS PLANES / ITINERARIOS (SYNODOS)
   ============================================================ */
const PLANES_INICIALES = [
  {
    id: 'plan-demo-escalante',
    titulo: 'Sábado Gastronómico & Paseo en Escalante',
    fecha: '2026-11-21',
    descripcion: 'Café botánico por la mañana, caminata relajada y cena vegetal bajo pérgola sombreada.',
    conMascota: true,
    paradas: [
      {
        lugarId: 'franco-cafe',
        horaEstimada: '09:30 AM',
        duracionMinutos: 90,
        nota: 'Desayuno en terraza con bowl de agua fresca.'
      },
      {
        lugarId: 'el-arbol-de-seda',
        horaEstimada: '12:30 PM',
        duracionMinutos: 120,
        nota: 'Almuerzo vegetal en jardín interior acústico.'
      }
    ]
  },
  {
    id: 'plan-lluvia-cultural',
    titulo: 'Tarde Cultural Bajo Techo (San José Centro)',
    fecha: '2026-11-22',
    descripcion: 'Recorrido artístico en el Museo de Arte y merienda fina en el Café del Teatro Nacional.',
    conMascota: false,
    paradas: [
      {
        lugarId: 'museo-arte-costarricense',
        horaEstimada: '02:00 PM',
        duracionMinutos: 90,
        nota: 'Visita al Salón Dorado y salas históricas.'
      },
      {
        lugarId: 'teatro-nacional-bistro',
        horaEstimada: '04:30 PM',
        duracionMinutos: 75,
        nota: 'Café de Tarrazú y repostería artesanal.'
      }
    ]
  }
];

export const obtenerPlanes = () => {
  if (typeof window === 'undefined') return PLANES_INICIALES;
  try {
    const raw = localStorage.getItem(CLAVE_PLANES);
    if (!raw) {
      localStorage.setItem(CLAVE_PLANES, JSON.stringify(PLANES_INICIALES));
      return PLANES_INICIALES;
    }
    return JSON.parse(raw);
  } catch {
    return PLANES_INICIALES;
  }
};

export const guardarPlan = (nuevoPlan) => {
  const planes = obtenerPlanes();
  const id = nuevoPlan.id || `plan-${Date.now()}`;
  const planConId = { ...nuevoPlan, id };

  const indice = planes.findIndex((p) => p.id === id);
  let actualizados;
  if (indice >= 0) {
    actualizados = [...planes];
    actualizados[indice] = planConId;
  } else {
    actualizados = [planConId, ...planes];
  }

  try {
    localStorage.setItem(CLAVE_PLANES, JSON.stringify(actualizados));
    emitirCambio('planes');
  } catch (e) {
    console.error('Error al guardar plan:', e);
  }
  return planConId;
};

export const eliminarPlan = (planId) => {
  const planes = obtenerPlanes();
  const actualizados = planes.filter((p) => p.id !== planId);
  try {
    localStorage.setItem(CLAVE_PLANES, JSON.stringify(actualizados));
    emitirCambio('planes');
  } catch (e) {
    console.error('Error al eliminar plan:', e);
  }
  return actualizados;
};

export const agregarParadaAPlan = (planId, parada) => {
  const planes = obtenerPlanes();
  const plan = planes.find((p) => p.id === planId);
  if (!plan) return null;

  plan.paradas = [...(plan.paradas || []), parada];
  guardarPlan(plan);
  return plan;
};

/* ============================================================
   3. CHECK-INS COMUNITARIOS EN VIVO EN TERRAZAS Y LUGARES
   ============================================================ */
const CHECKINS_INICIALES = {
  'franco-cafe': [
    {
      id: 'chk-1',
      autor: 'Mariana Rojas',
      mascota: 'Bruno (Golden Retriever)',
      fecha: 'Hace 25 min',
      aguaFresca: true,
      ruidoCalmo: true,
      sombraSegura: true,
      comentario: 'Excelente ambiente hoy, trajeron bowl con agua filtrada apenas llegamos y el piso está súper fresco.'
    }
  ],
  'el-arbol-de-seda': [
    {
      id: 'chk-2',
      autor: 'Carlos Alvarado',
      mascota: 'Max (Beagle)',
      fecha: 'Hace 1 hora',
      aguaFresca: true,
      ruidoCalmo: true,
      sombraSegura: true,
      comentario: 'El jardín trasero está en 42 dB reales, ideal para perros sensibles al ruido.'
    }
  ]
};

export const obtenerCheckinsLugar = (lugarId) => {
  if (typeof window === 'undefined') return CHECKINS_INICIALES[lugarId] || [];
  try {
    const raw = localStorage.getItem(CLAVE_CHECKINS);
    const mapa = raw ? JSON.parse(raw) : CHECKINS_INICIALES;
    return Array.isArray(mapa[lugarId]) ? mapa[lugarId] : CHECKINS_INICIALES[lugarId] || [];
  } catch {
    return CHECKINS_INICIALES[lugarId] || [];
  }
};

export const registrarCheckinLugar = (lugarId, checkin) => {
  if (typeof window === 'undefined' || !lugarId) return [];
  try {
    const raw = localStorage.getItem(CLAVE_CHECKINS);
    const mapa = raw ? JSON.parse(raw) : { ...CHECKINS_INICIALES };
    const actuales = Array.isArray(mapa[lugarId]) ? mapa[lugarId] : [];
    const nuevo = {
      id: `chk_${Date.now()}`,
      autor: checkin.autor || 'Tutor Synodos',
      mascota: checkin.mascota || 'Compañero Canino',
      fecha: 'Justo ahora',
      aguaFresca: Boolean(checkin.aguaFresca),
      ruidoCalmo: Boolean(checkin.ruidoCalmo),
      sombraSegura: Boolean(checkin.sombraSegura),
      comentario: String(checkin.comentario || '').trim() || 'Check-in verificado en el local.'
    };
    mapa[lugarId] = [nuevo, ...actuales];
    localStorage.setItem(CLAVE_CHECKINS, JSON.stringify(mapa));
    emitirCambio('checkins');
    return mapa[lugarId];
  } catch {
    return [];
  }
};

/* ============================================================
   4. RED SOS DE MASCOTAS EXTRAVIADAS & REPORTES COMUNITARIOS GAM
   ============================================================ */
const ALERTAS_SOS_INICIALES = [
  {
    id: 'sos-gam-01',
    tipo: 'extraviada', // 'extraviada' | 'avistada'
    nombreMascota: 'Toby',
    raza: 'Beagle',
    colorManto: 'Tricolor (Blanco, Negro y Miel)',
    zona: 'Parque Francia, Barrio Escalante',
    fechaHora: 'Hoy, 07:40 AM',
    contacto: '+506 8844-1920',
    tutor: 'Andrea Solís',
    microchip: 'CRC-756-118-402',
    descripcion: 'Lleva collar rojo con placa QR Synodos. Muy sociable, responde a su nombre.',
    foto: 'https://images.dog.ceo/breeds/beagle/n02088364_16635.jpg',
    estado: 'Activa'
  },
  {
    id: 'sos-gam-02',
    tipo: 'avistada',
    nombreMascota: 'Perrito Mestizo con pañuelo azul',
    raza: 'Mestizo / Zaguate Costarricense',
    colorManto: 'Miel claro',
    zona: 'Sabana Norte (Frente al Estadio Nacional)',
    fechaHora: 'Hoy, 08:15 AM',
    contacto: '+506 8712-3390',
    tutor: 'Reporte Comunitario',
    microchip: 'Por escanear',
    descripcion: 'Visto caminando tranquilo cerca de la laguna de La Sabana, buen estado general.',
    foto: 'https://images.dog.ceo/breeds/mix/noah01.jpg',
    estado: 'En verificación'
  }
];

export const obtenerAlertasSos = () => {
  if (typeof window === 'undefined') return ALERTAS_SOS_INICIALES;
  try {
    const raw = localStorage.getItem(CLAVE_ALERTAS_SOS);
    if (!raw) {
      localStorage.setItem(CLAVE_ALERTAS_SOS, JSON.stringify(ALERTAS_SOS_INICIALES));
      return ALERTAS_SOS_INICIALES;
    }
    return JSON.parse(raw);
  } catch {
    return ALERTAS_SOS_INICIALES;
  }
};

export const publicarAlertaSos = (alerta) => {
  const actuales = obtenerAlertasSos();
  const nueva = {
    id: `sos-${Date.now()}`,
    tipo: alerta.tipo || 'extraviada',
    nombreMascota: alerta.nombreMascota || 'Mascota Reportada',
    raza: alerta.raza || 'Mestizo',
    colorManto: alerta.colorManto || 'Variado',
    zona: alerta.zona || 'San José, GAM',
    fechaHora: 'Hace unos instantes',
    contacto: alerta.contacto || '+506 8000-0000',
    tutor: alerta.tutor || 'Tutor Synodos',
    microchip: alerta.microchip || 'En trámite',
    descripcion: alerta.descripcion || 'Alerta comunitaria activada desde Synodos.',
    foto: alerta.foto || '/imagenes/copiloto-bruno.jpg',
    estado: 'Activa'
  };
  const lista = [nueva, ...actuales];
  try {
    localStorage.setItem(CLAVE_ALERTAS_SOS, JSON.stringify(lista));
    emitirCambio('sos');
  } catch {}
  return lista;
};

export const marcarAlertaSosResuelta = (id) => {
  const actuales = obtenerAlertasSos().map((a) =>
    a.id === id ? { ...a, estado: a.estado === 'Resuelta' ? 'Activa' : 'Resuelta' } : a
  );
  try {
    localStorage.setItem(CLAVE_ALERTAS_SOS, JSON.stringify(actuales));
    emitirCambio('sos');
  } catch {}
  return actuales;
};

/* ============================================================
   5. RECORDATORIOS DE CUIDADO, VACUNACIÓN Y AGENDA DE EVENTOS GAM
   ============================================================ */
const RECORDATORIOS_INICIALES = [
  {
    id: 'rec-vac-sextuple',
    titulo: 'Refuerzo Anual Vacuna Séxtuple (DHPPi+L)',
    categoria: 'Vacunación',
    fecha: '2026-12-05',
    hora: '10:00 AM',
    lugar: 'Clínica Veterinaria Escalante Pet Care',
    completado: false
  },
  {
    id: 'rec-desparasitacion',
    titulo: 'Desparasitación Interna y Externa Mensual',
    categoria: 'Prevención',
    fecha: '2026-11-28',
    hora: '08:30 AM',
    lugar: 'En casa (Comprimido masticable)',
    completado: true
  },
  {
    id: 'rec-peluqueria',
    titulo: 'Baño Hipoalergénico, Corte de Uñas y Revisión Podal',
    categoria: 'Higiene & Podología',
    fecha: '2026-12-12',
    hora: '02:00 PM',
    lugar: 'Estética Canina Los Yoses',
    completado: false
  }
];

export const EVENTOS_GAM_CATALOGO = [
  {
    id: 'evt-feria-verde',
    titulo: 'Feria Verde de Aranjuez & Encuentro Pet-Friendly',
    fecha: '2026-11-28',
    hora: '08:00 AM - 01:00 PM',
    zona: 'Polideportivo Aranjuez, San José',
    categoria: 'Aire Libre & Orgánico',
    acustica: '49 dB (Ambiente Calmo)',
    descripcion: 'Mercado gastronómico local, música acústica suave, sombra de árboles centenarios y puntos de hidratación para mascotas.'
  },
  {
    id: 'evt-caminata-sabana',
    titulo: 'Caminata Guiada Synodos & Revisión Podal Gratuita',
    fecha: '2026-11-29',
    hora: '07:30 AM - 10:30 AM',
    zona: 'Parque Metropolitano La Sabana (Sector Lago)',
    categoria: 'Salud & Comunidad',
    acustica: '44 dB (Naturaleza)',
    descripcion: 'Recorrido matutino sobre césped fresco con veterinarios invitados, escaneo de microchip y socialización supervisada.'
  },
  {
    id: 'evt-tarde-acustica-escalante',
    titulo: 'Tarde de Café & Jazz Suave (< 52 dB) para Tutores y Perros',
    fecha: '2026-12-04',
    hora: '04:00 PM - 07:00 PM',
    zona: 'Calle 33, Barrio Escalante',
    categoria: 'Gastronomía & Cultura',
    acustica: '50 dB (Certificado)',
    descripcion: 'Encuentro grupal Synodos con menú de degustación, galletas artesanales hipoalergénicas para perros y terraza techada.'
  }
];

export const obtenerRecordatorios = () => {
  if (typeof window === 'undefined') return RECORDATORIOS_INICIALES;
  try {
    const raw = localStorage.getItem(CLAVE_RECORDATORIOS);
    if (!raw) {
      localStorage.setItem(CLAVE_RECORDATORIOS, JSON.stringify(RECORDATORIOS_INICIALES));
      return RECORDATORIOS_INICIALES;
    }
    return JSON.parse(raw);
  } catch {
    return RECORDATORIOS_INICIALES;
  }
};

export const agregarRecordatorio = (rec) => {
  const actuales = obtenerRecordatorios();
  const nuevo = {
    id: `rec-${Date.now()}`,
    titulo: rec.titulo || 'Recordatorio de Mascota',
    categoria: rec.categoria || 'Salud',
    fecha: rec.fecha || '2026-12-01',
    hora: rec.hora || '09:00 AM',
    lugar: rec.lugar || 'San José, GAM',
    completado: false
  };
  const lista = [nuevo, ...actuales];
  try {
    localStorage.setItem(CLAVE_RECORDATORIOS, JSON.stringify(lista));
    emitirCambio('recordatorios');
  } catch {}
  return lista;
};

export const alternarRecordatorioCompletado = (id) => {
  const actuales = obtenerRecordatorios().map((r) =>
    r.id === id ? { ...r, completado: !r.completado } : r
  );
  try {
    localStorage.setItem(CLAVE_RECORDATORIOS, JSON.stringify(actuales));
    emitirCambio('recordatorios');
  } catch {}
  return actuales;
};

export const eliminarRecordatorio = (id) => {
  const actuales = obtenerRecordatorios().filter((r) => r.id !== id);
  try {
    localStorage.setItem(CLAVE_RECORDATORIOS, JSON.stringify(actuales));
    emitirCambio('recordatorios');
  } catch {}
  return actuales;
};

export const obtenerEventosAgendadosIds = () => {
  if (typeof window === 'undefined') return ['evt-feria-verde'];
  try {
    const raw = localStorage.getItem(CLAVE_EVENTOS_AGENDADOS);
    return raw ? JSON.parse(raw) : ['evt-feria-verde'];
  } catch {
    return ['evt-feria-verde'];
  }
};

export const alternarEventoAgendado = (eventoId) => {
  const actuales = obtenerEventosAgendadosIds();
  const nuevos = actuales.includes(eventoId)
    ? actuales.filter((id) => id !== eventoId)
    : [...actuales, eventoId];
  try {
    localStorage.setItem(CLAVE_EVENTOS_AGENDADOS, JSON.stringify(nuevos));
    emitirCambio('eventos');
  } catch {}
  return nuevos;
};

/**
 * Genera y descarga un archivo estándar iCalendar (.ics) para abrir en Google Calendar, Apple Calendar o Outlook.
 */
export const descargarEventoIcs = ({ titulo, fecha, hora = '09:00', ubicacion = 'San José, Costa Rica', descripcion = '' }) => {
  if (typeof window === 'undefined') return;
  const fechaLimpia = String(fecha || '2026-12-01').replace(/-/g, '');
  const dtStart = `${fechaLimpia}T090000`;
  const dtEnd = `${fechaLimpia}T110000`;
  const contenido = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Synodos Pet OS//GAM Costa Rica//ES',
    'BEGIN:VEVENT',
    `UID:synodos-${Date.now()}@synodos.cr`,
    `DTSTAMP:${fechaLimpia}T080000Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${titulo}`,
    `LOCATION:${ubicacion}`,
    `DESCRIPTION:${descripcion} (${hora}) - Generado por Synodos & Copiloto Argos`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([contenido], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${String(titulo || 'evento-synodos').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
