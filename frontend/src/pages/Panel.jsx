import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutPanel } from '../layouts/LayoutPanel';
import { PageWrapper } from '../components/PageWrapper';
import { LOCALES as LOCALES_DATA } from '../data/locales';
import { UNIDADES_FLOTA } from '../data/flota';
import { ConsolaIA } from '../components/ConsolaIA';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabla, Tr, Td } from '../components/ui/Tabla';
import { ModeracionFotosPanel } from '../features/admin/ModeracionFotosPanel';
import { AnimacionCierreSesion } from '../components/AnimacionCierreSesion';
import { ModalConfirmarCierre } from '../components/ModalConfirmarCierre';
import { useTelemetria } from '../hooks/useTelemetria';
import { useSesion } from '../hooks/useSesion';
import { useTema } from '../context/TemaContext';
import {
  Activity,
  Building2,
  Ambulance,
  Sliders,
  Search,
  ArrowUpDown,
  ShieldCheck,
  Thermometer,
  Volume2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Battery,
  PhoneCall,
  Save,
  LogOut,
  UserCheck,
  Clock,
  Lock,
  Filter,
  Check,
  XCircle,
  FileText,
  Radio,
  Sparkles,
  Camera
} from 'lucide-react';

// Datos iniciales de usuarios administrativos
const USUARIOS_INICIALES = [
  { id: "usr-001", nombre: "Mariana Rojas", email: "mariana.rojas@gotox.cr", rol: "Administrador General", estado: "Activo", sesion: "En línea" },
  { id: "usr-002", nombre: "Ing. Carlos Brenes", email: "carlos.brenes@gotox.cr", rol: "Inspector Ambiental", estado: "Activo", sesion: "En terreno" },
  { id: "usr-003", nombre: "Dra. Valeria Mora", email: "valeria.mora@gotox.cr", rol: "Coordinadora Veterinaria", estado: "Activo", sesion: "En guardia" },
  { id: "usr-004", nombre: "Tutor Demostración", email: "invitado.gam@gotox.cr", rol: "Tutor Certificado", estado: "Activo", sesion: "Desconectado" }
];

// Incidencias activas del sistema GAM
const INCIDENCIAS_INICIALES = [
  {
    id: "INC-2026-089",
    tipo: "Sobrecupo Canino",
    local: "Kalu Café & Galería",
    zona: "Barrio Escalante",
    severidad: "Alta",
    estado: "Pendiente",
    descripcion: "Aforo canino superó el 85% de capacidad segura (6/7 plazas ocupadas).",
    reportado: "Hace 15 min"
  },
  {
    id: "INC-2026-088",
    tipo: "Contaminación Acústica",
    local: "La Bodega de Chema",
    zona: "Los Yoses",
    severidad: "Media",
    estado: "En investigación",
    descripcion: "Sensor de ruido registró pico sostenido de 64 dB en terraza exterior.",
    reportado: "Hace 42 min"
  },
  {
    id: "INC-2026-085",
    tipo: "Asfalto Elevado",
    local: "Paso Peatonal Calle 33",
    zona: "Barrio Escalante",
    severidad: "Baja",
    estado: "Resuelta",
    descripcion: "Temperatura de calzada bajó a 23.6 °C tras nubosidad vespertina.",
    reportado: "Hace 2 horas"
  }
];

// Pista inmutable de auditoría
const AUDITORIA_INICIAL = [
  { id: "AUD-9912", fecha: "2026-11-16 23:15:02", operador: "Mariana Rojas", accion: "Verificación Aprobada", entidad: "Franco Café (LOC-001)", hash: "e3b0c44298fc1c149afbf4c8996fb924" },
  { id: "AUD-9911", fecha: "2026-11-16 22:45:18", operador: "Carlos Brenes", accion: "Inspección Acústica", entidad: "Apotecario (LOC-003)", hash: "ca978112ca1bbdcafac231b39a23dc4b" },
  { id: "AUD-9910", fecha: "2026-11-16 21:30:00", operador: "Sistema GAM", accion: "Alerta Térmica Disparada", entidad: "Sensor Escalante Este", hash: "4a7d1ed414474e4033ac29ccb8653d9b" },
  { id: "AUD-9909", fecha: "2026-11-16 20:10:55", operador: "Valeria Mora", accion: "Ajuste de Aforo Máximo", entidad: "El Árbol de Seda (LOC-002)", hash: "b2f5ff47436671b6e533d8dc3614845d" }
];

export function Panel() {
  const navigate = useNavigate();
  const { esClaro, esMorado, esOscuro } = useTema();
  const [tabActiva, setTabActiva] = useState('vitals');
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);
  const telemetria = useTelemetria();
  const { ajustes, actualizarAjustes, usuario, cerrarSesion, isLoggedIn } = useSesion();

  // Estados interactivos administrativos
  const [locales, setLocales] = useState(LOCALES_DATA);
  const [usuarios, setUsuarios] = useState(USUARIOS_INICIALES);
  const [incidencias, setIncidencias] = useState(INCIDENCIAS_INICIALES);
  const [auditoria, setAuditoria] = useState(AUDITORIA_INICIAL);

  // Filtros de locales
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const [filtroEstadoLocal, setFiltroEstadoLocal] = useState('todos');
  const [ordenCampo, setOrdenCampo] = useState('decibelios');
  const [ordenAsc, setOrdenAsc] = useState(true);

  // Estado para ajustes
  const [ajustesLocales, setAjustesLocales] = useState(ajustes);
  const [guardadoAjustes, setGuardadoAjustes] = useState(false);

  // Redirección si la sesión no está activa
  React.useEffect(() => {
    if (!isLoggedIn) {
      navigate('/acceso', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const handleSolicitarCierre = () => setModalConfirmacionAbierto(true);
  const handleConfirmarSalida = () => {
    setModalConfirmacionAbierto(false);
    setAnimandoSalida(true);
  };
  const handleCompletarSalida = () => {
    cerrarSesion();
    setAnimandoSalida(false);
    navigate('/acceso');
  };

  const tabsConfig = [
    { id: 'vitals', label: 'Resumen & Vitals', icon: Activity, badge: 'En vivo' },
    { id: 'locales', label: 'Establecimientos', icon: Building2, badge: `${locales.length}` },
    { id: 'fotos', label: 'Fotos & Storage', icon: Camera, badge: 'Moderación' },
    { id: 'usuarios', label: 'Usuarios & Roles', icon: Users, badge: `${usuarios.length}` },
    { id: 'incidencias', label: 'Alertas & Incidencias', icon: AlertTriangle, badge: `${incidencias.filter(i => i.estado !== 'Resuelta').length}` },
    { id: 'auditoria', label: 'Pista de Auditoría', icon: ShieldCheck, badge: 'Inmutable' },
    { id: 'flota', label: 'Flota SOS GAM', icon: Ambulance, badge: '3 Unidades' },
    { id: 'ajustes', label: 'Ajustes & Umbrales', icon: Sliders }
  ];

  // Cálculo de KPIs globales
  const totalPerrosEnRed = useMemo(() => locales.reduce((acc, l) => acc + l.aforoActual, 0), [locales]);
  const capacidadMaximaRed = useMemo(() => locales.reduce((acc, l) => acc + l.aforoMax, 0), [locales]);
  const promedioDecibelios = useMemo(() => Math.round(locales.reduce((acc, l) => acc + l.decibelios, 0) / locales.length), [locales]);

  // Filtrado de locales
  const localesProcesados = useMemo(() => {
    return locales.filter(l => {
      if (filtroEstadoLocal !== 'todos' && l.estado !== filtroEstadoLocal) return false;
      if (busquedaLocal.trim()) {
        const q = busquedaLocal.toLowerCase();
        return l.nombre.toLowerCase().includes(q) || l.zona.toLowerCase().includes(q) || l.categoria.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => {
      let valA = a[ordenCampo];
      let valB = b[ordenCampo];
      if (typeof valA === 'string') {
        return ordenAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return ordenAsc ? valA - valB : valB - valA;
    });
  }, [locales, busquedaLocal, filtroEstadoLocal, ordenCampo, ordenAsc]);

  const toggleOrden = (campo) => {
    if (ordenCampo === campo) {
      setOrdenAsc(!ordenAsc);
    } else {
      setOrdenCampo(campo);
      setOrdenAsc(true);
    }
  };

  // Acciones Administrativas Interactivas
  const cambiarEstadoLocal = (id, nuevoEstado) => {
    setLocales(prev => prev.map(l => l.id === id ? { ...l, estado: nuevoEstado } : l));
    const entrada = {
      id: `AUD-${Math.floor(Math.random() * 9000 + 1000)}`,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
      operador: usuario?.nombre || "Mariana Rojas",
      accion: `Cambio de Estado: ${nuevoEstado}`,
      entidad: `Local ${id}`,
      hash: Math.random().toString(16).substring(2, 34)
    };
    setAuditoria(a => [entrada, ...a]);
  };

  const cambiarRolUsuario = (userId, nuevoRol) => {
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, rol: nuevoRol } : u));
  };

  const alternarEstadoUsuario = (userId) => {
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, estado: u.estado === 'Activo' ? 'Suspendido' : 'Activo' } : u));
  };

  const cambiarEstadoIncidencia = (incId, nuevoEstado) => {
    setIncidencias(prev => prev.map(i => i.id === incId ? { ...i, estado: nuevoEstado } : i));
  };

  const handleGuardarAjustes = (e) => {
    e.preventDefault();
    actualizarAjustes(ajustesLocales);
    setGuardadoAjustes(true);
    setTimeout(() => setGuardadoAjustes(false), 2000);
  };

  return (
    <PageWrapper>
      <LayoutPanel tabs={tabsConfig} tabActiva={tabActiva} onTabChange={setTabActiva}>
        <ModalConfirmarCierre
          isOpen={modalConfirmacionAbierto}
          onClose={() => setModalConfirmacionAbierto(false)}
          onConfirmar={handleConfirmarSalida}
          nombreUsuario={usuario?.nombre}
        />

        <AnimacionCierreSesion
          visible={animandoSalida}
          nombreUsuario={usuario?.nombre}
          onCompletado={handleCompletarSalida}
        />

        <div className="space-y-6">
          {/* Banner Superior del Módulo Activo */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#111827] dark:text-white tracking-tight">
                {tabActiva === 'vitals' && 'Resumen Ejecutivo & Signos Vitales GAM'}
                {tabActiva === 'locales' && 'Gestión de Establecimientos & Auditoría'}
                {tabActiva === 'fotos' && 'Moderación de Fotografías en Supabase Storage'}
                {tabActiva === 'usuarios' && 'Gestión de Usuarios, Operadores y Roles'}
                {tabActiva === 'incidencias' && 'Bandeja de Incidencias & Triage Urbano'}
                {tabActiva === 'auditoria' && 'Pista Criptográfica Inmutable (Ledger)'}
                {tabActiva === 'flota' && 'Flota de Ambulancias SOS GAM'}
                {tabActiva === 'ajustes' && 'Ajustes de Umbrales & Sistema'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                Centro de Mando GoToX &bull; Red de Monitoreo Ambiental y Bienestar Animal en Tiempo Real.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 gotox-radar-dot" />
              <span>Sensores GAM En Línea</span>
            </div>
          </div>

          {/* ============================================================
              PESTAÑA 1: RESUMEN EJECUTIVO & VITALS
              ============================================================ */}
          {tabActiva === 'vitals' && (
            <div className="space-y-6">
              {/* KPIs Globales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111827] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="uppercase font-semibold tracking-wider">Aforo Global Canino</span>
                    <Users className="w-4 h-4 text-[#501228] dark:text-[#F27B91]" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif font-black text-3xl text-[#111827] dark:text-white tabular-nums">
                      {totalPerrosEnRed}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      de {capacidadMaximaRed} plazas ({Math.round((totalPerrosEnRed / capacidadMaximaRed) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-1.5 overflow-hidden mt-2">
                    <div
                      className="bg-[#501228] dark:bg-[#F27B91] h-full rounded-full transition-all duration-500"
                      style={{ width: `${(totalPerrosEnRed / capacidadMaximaRed) * 100}%` }}
                    />
                  </div>
                </Card>

                <Card className="p-4 border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111827] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="uppercase font-semibold tracking-wider">Temperatura Asfalto</span>
                    <Thermometer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif font-black text-3xl text-[#111827] dark:text-white tabular-nums">
                      {telemetria.temperaturaAsfalto} °C
                    </span>
                    <Badge variant="success" className="text-[10px]">Almohadillas Seguras</Badge>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Sensor Escalante Este &bull; {telemetria.temperaturaAmbiente} °C aire
                  </span>
                </Card>

                <Card className="p-4 border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111827] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="uppercase font-semibold tracking-wider">Ruido Urbano Promedio</span>
                    <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif font-black text-3xl text-[#111827] dark:text-white tabular-nums">
                      {promedioDecibelios} dB
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-medium">
                      Confort A+
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Cero detonaciones en radio de 4 km
                  </span>
                </Card>

                <Card className="p-4 border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111827] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="uppercase font-semibold tracking-wider">Flota SOS Activa</span>
                    <Ambulance className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif font-black text-3xl text-[#111827] dark:text-white tabular-nums">
                      3 / 3
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unidades en GAM</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                    Tiempo medio de triage: 4.8 min
                  </span>
                </Card>
              </div>

              {/* Consola IA Urbana */}
              <ConsolaIA />

              {/* Registro de Actividad Reciente */}
              <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
                esClaro ? 'bg-white border-slate-200' : 'bg-[#111827] border-white/10'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-current/10">
                  <span className="font-serif font-bold text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#F27B91]" />
                    <span>Actividad Administrativa Reciente</span>
                  </span>
                  <span className="text-xs opacity-60">Últimos eventos registrados en el Centro de Mando</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {auditoria.slice(0, 4).map(a => (
                    <div key={a.id} className="p-3 rounded-xl bg-current/5 border border-current/10 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold">{a.accion} &bull; <span className="opacity-70">{a.entidad}</span></span>
                        <p className="text-[11px] opacity-60">Operador: {a.operador} &bull; {a.fecha}</p>
                      </div>
                      <span className="font-mono text-[10px] opacity-50 bg-current/5 px-2 py-0.5 rounded">
                        {a.id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              PESTAÑA 2: GESTIÓN DE ESTABLECIMIENTOS
              ============================================================ */}
          {tabActiva === 'locales' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold opacity-60 mr-1">Filtrar por estado:</span>
                  {['todos', 'Óptimo', 'Moderado', 'Alerta Aforo', 'Ruido Elevado'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFiltroEstadoLocal(st)}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${
                        filtroEstadoLocal === st
                          ? 'bg-[#501228] text-white font-bold border-[#F27B91]/40'
                          : 'opacity-70 hover:opacity-100 border-current/15'
                      }`}
                    >
                      {st === 'todos' ? 'Todos' : st}
                    </button>
                  ))}
                </div>

                <div className="w-full sm:w-72">
                  <Input
                    icon={Search}
                    placeholder="Buscar local o zona..."
                    value={busquedaLocal}
                    onChange={(e) => setBusquedaLocal(e.target.value)}
                  />
                </div>
              </div>

              {/* Tabla de Locales con Acciones Administrativas */}
              <Tabla
                headers={[
                  'Local & Categoría',
                  'Zona GAM',
                  'Aforo Canino Actual',
                  'Acústica',
                  'Estado Operativo',
                  'Acciones Rápidas'
                ]}
              >
                {localesProcesados.map((local) => {
                  const porcentaje = Math.round((local.aforoActual / local.aforoMax) * 100);
                  return (
                    <Tr key={local.id}>
                      <Td>
                        <div>
                          <span className="font-bold text-[#111827] dark:text-white block">{local.nombre}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{local.categoria}</span>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{local.zona}</span>
                      </Td>
                      <Td>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span>{local.aforoActual} / {local.aforoMax} plazas</span>
                            <span className="text-[10px] opacity-60">{porcentaje}%</span>
                          </div>
                          <div className="w-24 bg-slate-100 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${porcentaje > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-[#501228] dark:text-[#F27B91]" />
                          <span className="font-bold text-xs tabular-nums text-slate-800 dark:text-slate-200">{local.decibelios} dB</span>
                        </div>
                      </Td>
                      <Td>
                        <Badge
                          variant={
                            local.estado === 'Óptimo' ? 'success' : local.estado === 'Alerta Aforo' ? 'warning' : 'danger'
                          }
                        >
                          {local.estado}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => cambiarEstadoLocal(local.id, 'Óptimo')}
                            title="Aprobar / Marcar como Óptimo"
                            className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => cambiarEstadoLocal(local.id, 'Alerta Aforo')}
                            title="Declarar Alerta de Aforo"
                            className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/30 transition-colors"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => cambiarEstadoLocal(local.id, 'Ruido Elevado')}
                            title="Reportar Ruido Elevado"
                            className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </Tabla>
            </div>
          )}

          {/* ============================================================
              PESTAÑA 3: GESTIÓN DE USUARIOS Y ROLES
              ============================================================ */}
          {tabActiva === 'usuarios' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-current/5 border border-current/10 text-xs flex items-center justify-between">
                <span>Total de operadores registrados en el Centro de Mando: <strong>{usuarios.length} cuentas autorizadas</strong>.</span>
                <span className="text-emerald-500 font-semibold">&bull; Cuentas protegidas por PBKDF2</span>
              </div>

              <Tabla headers={['Usuario', 'Correo Electrónico', 'Rol Asignado', 'Estado', 'Sesión Activa', 'Gestión']}>
                {usuarios.map(u => (
                  <Tr key={u.id}>
                    <Td>
                      <span className="font-bold block">{u.nombre}</span>
                      <span className="text-[10px] opacity-60 font-mono">{u.id}</span>
                    </Td>
                    <Td>
                      <span className="text-xs">{u.email}</span>
                    </Td>
                    <Td>
                      <select
                        value={u.rol}
                        onChange={(e) => cambiarRolUsuario(u.id, e.target.value)}
                        className="text-xs p-1.5 rounded-lg border border-current/20 bg-transparent outline-none font-semibold"
                      >
                        <option value="Administrador General">Administrador General</option>
                        <option value="Inspector Ambiental">Inspector Ambiental</option>
                        <option value="Coordinadora Veterinaria">Coordinadora Veterinaria</option>
                        <option value="Tutor Certificado">Tutor Certificado</option>
                      </select>
                    </Td>
                    <Td>
                      <Badge variant={u.estado === 'Activo' ? 'success' : 'danger'}>
                        {u.estado}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="text-xs opacity-80">{u.sesion}</span>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => alternarEstadoUsuario(u.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          u.estado === 'Activo'
                            ? 'text-rose-400 border-rose-500/30 hover:bg-rose-500/10'
                            : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                        }`}
                      >
                        {u.estado === 'Activo' ? 'Suspender' : 'Reactivar'}
                      </button>
                    </Td>
                  </Tr>
                ))}
              </Tabla>
            </div>
          )}

          {/* ============================================================
              PESTAÑA 4: BANDEJA DE INCIDENCIAS & ALERTAS
              ============================================================ */}
          {tabActiva === 'incidencias' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-serif font-bold text-xl">Bandeja de Triage & Incidencias Urbanas</h2>
                <p className="text-xs opacity-60">Supervisión en tiempo real de sobrecupo, estrés acústico y alertas térmicas.</p>
              </div>

              <div className="space-y-3">
                {incidencias.map(inc => (
                  <div
                    key={inc.id}
                    className={`p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      esClaro ? 'bg-white border-slate-200' : 'bg-[#111827] border-white/10'
                    }`}
                  >
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-current/10">
                          {inc.id}
                        </span>
                        <span className="text-xs font-bold text-[#F27B91]">{inc.tipo}</span>
                        <span className="text-[11px] opacity-60">&bull; {inc.reportado}</span>
                      </div>
                      <h3 className="font-bold text-sm">{inc.local} ({inc.zona})</h3>
                      <p className="text-xs opacity-75">{inc.descripcion}</p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <select
                        value={inc.estado}
                        onChange={(e) => cambiarEstadoIncidencia(inc.id, e.target.value)}
                        className={`text-xs p-2 rounded-xl font-bold border outline-none ${
                          inc.estado === 'Resuelta'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : inc.estado === 'En investigación'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="En investigación">En investigación</option>
                        <option value="Resuelta">Resuelta</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================
              PESTAÑA 5: PISTA CRIPTOGRÁFICA DE AUDITORÍA
              ============================================================ */}
          {tabActiva === 'auditoria' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-current/5 border border-current/10 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  <span>Cadena de bloques inmutable (Hash Chain Ledger) verificada localmente.</span>
                </div>
                <span className="font-mono text-[11px] opacity-60">SHA-256 Enabled</span>
              </div>

              <Tabla headers={['ID Evento', 'Fecha & Hora', 'Operador Responsable', 'Acción Ejecutada', 'Entidad Afectada', 'Hash Criptográfico']}>
                {auditoria.map(a => (
                  <Tr key={a.id}>
                    <Td><span className="font-mono text-xs font-bold text-[#F27B91]">{a.id}</span></Td>
                    <Td><span className="text-xs opacity-80">{a.fecha}</span></Td>
                    <Td><span className="text-xs font-semibold">{a.operador}</span></Td>
                    <Td><span className="text-xs font-bold">{a.accion}</span></Td>
                    <Td><span className="text-xs">{a.entidad}</span></Td>
                    <Td><span className="font-mono text-[10px] opacity-60 truncate max-w-[120px] block">{a.hash}</span></Td>
                  </Tr>
                ))}
              </Tabla>
            </div>
          )}

          {/* ============================================================
              PESTAÑA 6: FLOTA SOS GAM
              ============================================================ */}
          {tabActiva === 'flota' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-serif font-bold text-2xl text-[#111827] dark:text-white">
                  Unidades Móviles de Rescate y Triage Canino
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cobertura de urgencias podales, golpe de calor y estabilización en el Gran Área Metropolitana.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {UNIDADES_FLOTA.map((u) => (
                  <Card key={u.id} className="p-6 border-slate-200/80 dark:border-white/10 space-y-4 bg-white dark:bg-[#111827] shadow-sm flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-[#501228] dark:text-[#F27B91] block uppercase">
                            {u.id}
                          </span>
                          <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white">
                            {u.nombre}
                          </h3>
                        </div>
                        <Badge variant="success">{u.estado}</Badge>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400">{u.tipo}</p>

                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex justify-between">
                          <span>Base de guardia:</span>
                          <strong className="text-slate-800 dark:text-white">{u.base}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Tiempo respuesta estimado:</span>
                          <strong className="text-[#501228] dark:text-[#F27B91]">{u.tiempoRespuestaEst}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Batería vehículo:</span>
                          <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <Battery className="w-3.5 h-3.5" />
                            <span>{u.bateria}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 pt-2">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">Equipamiento Activo</span>
                        <div className="flex flex-wrap gap-1">
                          {u.equipamiento.map((eq, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                              {eq}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Médico: {u.veterinario}</span>
                      <Button size="sm" variant="secondary" icon={PhoneCall}>
                        Despachar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================
              PESTAÑA 7: AJUSTES & UMBRALES
              ============================================================ */}
          {tabActiva === 'ajustes' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="space-y-1">
                <h2 className="font-serif font-bold text-2xl text-[#111827] dark:text-white">
                  Ajustes de Alertas y Sensores Urbanos
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configura los umbrales de seguridad para las notificaciones del Copiloto Bruno y el carnet digital.
                </p>
              </div>

              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-5 bg-white dark:bg-[#111827] shadow-sm">
                <form onSubmit={handleGuardarAjustes} className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                    <div className="space-y-0.5">
                      <span className="text-sm font-semibold text-slate-800 dark:text-white block">
                        Alerta Sonora de Asfalto Caliente
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Notificar cuando el sensor de calzada supere el límite seguro para almohadillas.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={ajustesLocales.alertasAsfaltoCaliente}
                      onChange={(e) => setAjustesLocales({ ...ajustesLocales, alertasAsfaltoCaliente: e.target.checked })}
                      className="w-4 h-4 accent-[#501228] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Umbral máximo de temperatura de calzada:</span>
                      <span className="font-bold text-[#501228] dark:text-[#F27B91]">{ajustesLocales.umbralTemperaturaAsfalto} °C</span>
                    </div>
                    <input
                      type="range"
                      min="24"
                      max="35"
                      step="1"
                      value={ajustesLocales.umbralTemperaturaAsfalto}
                      onChange={(e) => setAjustesLocales({ ...ajustesLocales, umbralTemperaturaAsfalto: Number(e.target.value) })}
                      className="w-full accent-[#501228] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                    <div className="space-y-0.5">
                      <span className="text-sm font-semibold text-slate-800 dark:text-white block">
                        Aviso de Aforo en Terrazas de Escalante
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Recibir advertencia cuando un local supere el 85% de capacidad canina.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={ajustesLocales.notificarAforoTerrazas}
                      onChange={(e) => setAjustesLocales({ ...ajustesLocales, notificarAforoTerrazas: e.target.checked })}
                      className="w-4 h-4 accent-[#501228] cursor-pointer"
                    />
                  </div>

                  {guardadoAjustes && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800/40">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Ajustes guardados con éxito en la memoria local.</span>
                    </div>
                  )}

                  <Button type="submit" variant="primary" icon={Save}>
                    Guardar Preferencias
                  </Button>
                </form>
              </Card>

              {/* Gestión de Sesión */}
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4 bg-white dark:bg-[#111827] shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white block">
                      Sesión del Operador
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Autenticado como <strong>{usuario?.nombre || 'Operador'}</strong> ({usuario?.correo || 'mariana.rojas@gotox.cr'}).
                    </span>
                  </div>
                  <Badge variant="success">Activo</Badge>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cierra tu sesión si estás en una terminal compartida del centro de monitoreo o si deseas cambiar de cuenta.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={LogOut}
                    onClick={handleSolicitarCierre}
                    className="shrink-0"
                  >
                    Cerrar Sesión Activa
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {tabActiva === 'fotos' && <ModeracionFotosPanel />}
        </div>
      </LayoutPanel>
    </PageWrapper>
  );
}
export default Panel;
