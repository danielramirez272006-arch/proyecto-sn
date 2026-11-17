/**
 * Servicio Cliente de Almacenamiento Persistente — GoToX
 * Gestiona Favoritos y Mis Planes en localStorage sin necesidad de tocar el backend.
 */

const CLAVE_FAVORITOS = 'gotox_favoritos_v1';
const CLAVE_PLANES = 'gotox_planes_v1';

// Evento custom para sincronización instantánea entre componentes
const emitirCambio = (tipo) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`gotox:${tipo}`));
  }
};

/* ============================================================
   1. GESTIÓN DE FAVORITOS
   ============================================================ */
export const obtenerFavoritosIds = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CLAVE_FAVORITOS);
    return raw ? JSON.parse(raw) : ['franco-cafe', 'el-arbol-de-seda'];
  } catch {
    return ['franco-cafe', 'el-arbol-de-seda'];
  }
};

export const esFavorito = (lugarId) => {
  const favs = obtenerFavoritosIds();
  return favs.includes(lugarId);
};

export const alternarFavorito = (lugarId) => {
  const favs = obtenerFavoritosIds();
  let nuevos;
  if (favs.includes(lugarId)) {
    nuevos = favs.filter(id => id !== lugarId);
  } else {
    nuevos = [...favs, lugarId];
  }
  try {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(nuevos));
    emitirCambio('favoritos');
  } catch (e) {
    console.error('Error al guardar favorito:', e);
  }
  return nuevos;
};

/* ============================================================
   2. GESTIÓN DE MIS PLANES / ITINERARIOS
   ============================================================ */
const PLANES_INICIALES = [
  {
    id: "plan-demo-escalante",
    titulo: "Sábado Gastronómico & Paseo en Escalante",
    fecha: "2026-11-21",
    descripcion: "Café botánico por la mañana, caminata relajada y cena vegetal bajo pérgola sombreada.",
    conMascota: true,
    paradas: [
      {
        lugarId: "franco-cafe",
        horaEstimada: "09:30 AM",
        duracionMinutos: 90,
        nota: "Desayuno en terraza con bowl de agua para Bruno."
      },
      {
        lugarId: "el-arbol-de-seda",
        horaEstimada: "12:30 PM",
        duracionMinutos: 120,
        nota: "Almuerzo vegetal en jardín interior acústico."
      }
    ]
  },
  {
    id: "plan-lluvia-cultural",
    titulo: "Tarde Cultural Bajo Techo (San José Centro)",
    fecha: "2026-11-22",
    descripcion: "Recorrido artístico en el Museo de Arte y merienda fina en el Café del Teatro Nacional.",
    conMascota: false,
    paradas: [
      {
        lugarId: "museo-arte-costarricense",
        horaEstimada: "02:00 PM",
        duracionMinutos: 90,
        nota: "Visita al Salón Dorado y salas históricas."
      },
      {
        lugarId: "teatro-nacional-bistro",
        horaEstimada: "04:30 PM",
        duracionMinutos: 75,
        nota: "Café de Tarrazú y repostería artesanal."
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
  
  const indice = planes.findIndex(p => p.id === id);
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
  const actualizados = planes.filter(p => p.id !== planId);
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
  const plan = planes.find(p => p.id === planId);
  if (!plan) return null;

  plan.paradas = [...(plan.paradas || []), parada];
  guardarPlan(plan);
  return plan;
};
