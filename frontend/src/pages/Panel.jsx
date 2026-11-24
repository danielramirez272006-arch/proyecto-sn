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
import { ModalPoliticaPetAdmin } from '../features/admin/ModalPoliticaPetAdmin';
import { AnimacionCierreSesion } from '../components/AnimacionCierreSesion';
import { ModalConfirmarCierre } from '../components/ModalConfirmarCierre';
import { useTelemetria } from '../hooks/useTelemetria';
import { useSesion } from '../hooks/useSesion';
import { useTema } from '../context/TemaContext';
import { useIdioma } from '../context/IdiomaContext';
import { api } from '../shared/services/api-client';
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

// Datos iniciales mientras se cargan usuarios reales desde el backend
const USUARIOS_INICIALES = [
  { id: "usr_admin_gotox", nombre: "Administrador GoToX", email: "admin@gotox.cr", rol: "Administrador General", estado: "Activo", sesion: "En línea" },
  { id: "usr_client_mariana", nombre: "Mariana Rojas", email: "mariana.rojas@gotox.cr", rol: "Usuario GoToX", estado: "Activo", sesion: "Registrado" },
  { id: "usr_client_1", nombre: "Carlos Alvarado", email: "carlos@ejemplo.cr", rol: "Usuario GoToX", estado: "Activo", sesion: "Registrado" }
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
  const { t } = useIdioma();
  const [tabActiva, setTabActiva] = useState('vitals');
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);
  const telemetria = useTelemetria();
  const { ajustes, actualizarAjustes, usuario, cerrarSesion, isLoggedIn, esAdmin } = useSesion();

  // Estados interactivos administrativos
  const [locales, setLocales] = useState(LOCALES_DATA);
  const [localEditandoPolitica, setLocalEditandoPolitica] = useState(null);
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

  // Protección estricta: solo cuentas exclusivas con role === 'admin'
  React.useEffect(() => {
    if (!isLoggedIn) {
      navigate('/acceso', { replace: true });
    } else if (!esAdmin) {
      navigate('/usuario?tab=cuenta', { replace: true, state: { accesoDenegadoAdmin: true } });
    }
  }, [isLoggedIn, esAdmin, navigate]);

  // Cargar usuarios reales del backend si la sesión es administrativa
  React.useEffect(() => {
    if (!esAdmin) return;
    let activo = true;
    api
      .get('/admin/users')
      .then((list) => {
        if (!activo || !Array.isArray(list) || list.length === 0) return;
        setUsuarios(
          list.map((u) => ({
            id: u.id,
            nombre: u.name,
            email: u.email,
            rol: u.role === 'admin' ? 'Administrador General' : 'Usuario GoToX',
            estado: 'Activo',
            sesion: u.id === usuario?.id ? 'En línea' : 'Registrado'
          }))
        );
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [esAdmin, usuario?.id]);

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
    { id: 'vitals', label: t('panel.vitals'), icon: Activity, badge: t('panelExt.enVivo') },
    { id: 'locales', label: t('panel.locales'), icon: Building2, badge: `${locales.length}` },
    { id: 'fotos', label: t('panel.fotos'), icon: Camera, badge: t('panelExt.moderacionBadge') },
    { id: 'usuarios', label: t('panel.usuarios'), icon: Users, badge: `${usuarios.length}` },
    { id: 'incidencias', label: t('panel.incidencias'), icon: AlertTriangle, badge: `${incidencias.filter(i => i.estado !== 'Resuelta').length}` },
    { id: 'auditoria', label: t('panel.auditoria'), icon: ShieldCheck, badge: t('panelExt.inmutableBadge') },
    { id: 'flota', label: t('panel.flota'), icon: Ambulance, badge: t('panelExt.unidadesBadge') },
    { id: 'ajustes', label: t('panel.ajustes'), icon: Sliders }
  ];

  const registrarAuditoria = (accion, entidad) => {
    const entrada = {
      id: `AUD-${Math.floor(Math.random() * 9000 + 1000)}`,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
      operador: usuario?.nombre || 'Mariana Rojas',
      accion,
      entidad,
      hash: Math.random().toString(16).substring(2, 34)
    };
    setAuditoria((a) => [entrada, ...a]);
  };

  const traducirEstadoLocal = (estado) => t(`panelExt.estadoNombres.${estado}`) || estado;
  const traducirRolUsuario = (rol) => {
    if (rol === 'Administrador General') return t('panelExt.rolesLista.admin');
    if (rol === 'Usuario GoToX') return t('panelExt.rolesLista.usuario');
    if (rol === 'Inspector Ambiental') return t('panelExt.rolesLista.inspector');
    if (rol === 'Coordinadora Veterinaria') return t('panelExt.rolesLista.vet');
    if (rol === 'Tutor Certificado') return t('panelExt.rolesLista.tutor');
    return rol;
  };

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
    registrarAuditoria(
      t('panelExt.auditEstadoAccion', { estado: traducirEstadoLocal(nuevoEstado) }),
      t('panelExt.auditLocalEntidad', { id })
    );
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
                {tabActiva === 'vitals' && t('panelExt.tabTitulos.vitals')}
                {tabActiva === 'locales' && t('panelExt.tabTitulos.locales')}
                {tabActiva === 'fotos' && t('panelExt.tabTitulos.fotos')}
                {tabActiva === 'usuarios' && t('panelExt.tabTitulos.usuarios')}
                {tabActiva === 'incidencias' && t('panelExt.tabTitulos.incidencias')}
                {tabActiva === 'auditoria' && t('panelExt.tabTitulos.auditoria')}
                {tabActiva === 'flota' && t('panelExt.tabTitulos.flota')}
                {tabActiva === 'ajustes' && t('panelExt.tabTitulos.ajustes')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                {t('panelExt.centroMandoTag')}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 gotox-radar-dot" />
              <span>{t('panelExt.sensoresLinea')}</span>
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
                    <span className="uppercase font-semibold tracking-wider">{t('panelExt.kpiAforo')}</span>
                    <Users className="w-4 h-4 text-[#501228] dark:text-[#F27B91]" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif font-black text-3xl text-[#111827] dark:text-white tabular-nums">
                      {totalPerrosEnRed}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('panelExt.kpiAforoSub', {
                        max: capacidadMaximaRed,
                        pct: Math.round((totalPerrosEnRed / capacidadMaximaRed) * 100)
                      })}
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
                    <span className="uppercase font-semibold tracking-wider">{t('panelExt.kpiAsfalto')}</span>
                    <Thermometer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif font-black text-3xl text-[#111827] dark:text-white tabular-nums">
                      {telemetria.temperaturaAsfalto} °C
                    </span>
                    <Badge variant="success" className="text-[10px]">{t('panelExt.kpiAlmohadillasSeguras')}</Badge>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {t('panelExt.kpiSensorSub', { temp: telemetria.temperaturaAmbiente })}
                  </span>
                </Card>

                <Card className="p-4 border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111827] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="uppercase font-semibold tracking-wider">{t('panelExt.kpiRuido')}</span>
                    <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif font-black text-3xl text-[#111827] dark:text-white tabular-nums">
                      {promedioDecibelios} dB
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-medium">
                      {t('panelExt.kpiConfort')}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {t('panelExt.kpiCeroDet')}
                  </span>
                </Card>

                <Card className="p-4 border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111827] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="uppercase font-semibold tracking-wider">{t('panelExt.kpiFlota')}</span>
                    <Ambulance className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif font-black text-3xl text-[#111827] dark:text-white tabular-nums">
                      3 / 3
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('panelExt.kpiUnidadesGam')}</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                    {t('panelExt.kpiTriageSub')}
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
                    <span>{t('panelExt.actividadTitulo')}</span>
                  </span>
                  <span className="text-xs opacity-60">{t('panelExt.actividadSub')}</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {auditoria.slice(0, 4).map(a => (
                    <div key={a.id} className="p-3 rounded-xl bg-current/5 border border-current/10 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold">{a.accion} &bull; <span className="opacity-70">{a.entidad}</span></span>
                        <p className="text-[11px] opacity-60">{t('panelExt.operadorLabel')} {a.operador} &bull; {a.fecha}</p>
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
                  <span className="text-xs font-semibold opacity-60 mr-1">{t('panelExt.filtrarPorEstado')}</span>
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
                      {st === 'todos' ? t('panelExt.filtroTodos') : traducirEstadoLocal(st)}
                    </button>
                  ))}
                </div>

                <div className="w-full sm:w-72">
                  <Input
                    icon={Search}
                    placeholder={t('panelExt.buscarLocalPh')}
                    value={busquedaLocal}
                    onChange={(e) => setBusquedaLocal(e.target.value)}
                  />
                </div>
              </div>

              {/* Tabla de Locales con Acciones Administrativas */}
              <Tabla
                headers={[
                  t('panelExt.thLocalCat'),
                  t('panelExt.thZonaGam'),
                  t('panelExt.thAforoActual'),
                  t('panelExt.thAcustica'),
                  t('panelExt.thEstadoOp'),
                  t('panelExt.thAccionesRapidas')
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
                            <span>{t('panelExt.plazasTxt', { actual: local.aforoActual, max: local.aforoMax })}</span>
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
                          {traducirEstadoLocal(local.estado)}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => cambiarEstadoLocal(local.id, 'Óptimo')}
                            title={t('panelExt.titleOptimo')}
                            className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => cambiarEstadoLocal(local.id, 'Alerta Aforo')}
                            title={t('panelExt.titleAlertaAforo')}
                            className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/30 transition-colors"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => cambiarEstadoLocal(local.id, 'Ruido Elevado')}
                            title={t('panelExt.titleRuido')}
                            className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setLocalEditandoPolitica(local)}
                            title={t('panelExt.titlePolitica')}
                            className="px-2 py-1 rounded-lg bg-[#501228]/20 text-[#F27B91] hover:bg-[#501228]/40 text-[11px] font-bold transition-colors flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{t('panelExt.btnPoliticaPet')}</span>
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </Tabla>

              {localEditandoPolitica && (
                <ModalPoliticaPetAdmin
                  local={localEditandoPolitica}
                  onCerrar={() => setLocalEditandoPolitica(null)}
                  onActualizado={(placeId) => {
                    registrarAuditoria(t('panelExt.auditPoliticaAccion'), `${localEditandoPolitica.nombre} (${placeId})`);
                  }}
                />
              )}
            </div>
          )}

          {/* ============================================================
              PESTAÑA 3: GESTIÓN DE USUARIOS Y ROLES
              ============================================================ */}
          {tabActiva === 'usuarios' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-current/5 border border-current/10 text-xs flex items-center justify-between">
                <span>
                  {t('panelExt.operadoresTotalTxt')} <strong>{t('panelExt.cuentasAutorizadas', { n: usuarios.length })}</strong>.
                </span>
                <span className="text-emerald-500 font-semibold">{t('panelExt.cuentasPbkdf2')}</span>
              </div>

              <Tabla
                headers={[
                  t('panelExt.thUsuario'),
                  t('panelExt.thCorreo'),
                  t('panelExt.thRol'),
                  t('panelExt.thEstadoUser'),
                  t('panelExt.thSesionActiva'),
                  t('panelExt.thGestion')
                ]}
              >
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
                        aria-label={t('panelExt.thRol')}
                        onChange={(e) => cambiarRolUsuario(u.id, e.target.value)}
                        className="text-xs p-1.5 rounded-lg border border-current/20 bg-transparent outline-none font-semibold"
                      >
                        <option value="Administrador General">{t('panelExt.rolesLista.admin')}</option>
                        <option value="Usuario GoToX">{t('panelExt.rolesLista.usuario')}</option>
                        <option value="Inspector Ambiental">{t('panelExt.rolesLista.inspector')}</option>
                        <option value="Coordinadora Veterinaria">{t('panelExt.rolesLista.vet')}</option>
                        <option value="Tutor Certificado">{t('panelExt.rolesLista.tutor')}</option>
                      </select>
                    </Td>
                    <Td>
                      <Badge variant={u.estado === 'Activo' ? 'success' : 'danger'}>
                        {u.estado === 'Activo' ? t('panelExt.estadoActivo') : t('panelExt.estadoSuspendido')}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="text-xs opacity-80">
                        {u.sesion === 'En línea'
                          ? t('panelExt.sesionEnLinea')
                          : u.sesion === 'Registrado'
                          ? t('panelExt.sesionRegistrado')
                          : traducirRolUsuario(u.sesion)}
                      </span>
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
                        {u.estado === 'Activo' ? t('panelExt.btnSuspender') : t('panelExt.btnReactivar')}
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
                <h2 className="font-serif font-bold text-xl">{t('panelExt.incidenciasTitulo')}</h2>
                <p className="text-xs opacity-60">{t('panelExt.incidenciasSub')}</p>
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
                        aria-label={inc.id}
                        onChange={(e) => cambiarEstadoIncidencia(inc.id, e.target.value)}
                        className={`text-xs p-2 rounded-xl font-bold border outline-none ${
                          inc.estado === 'Resuelta'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : inc.estado === 'En investigación'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        <option value="Pendiente">{t('panelExt.incPendiente')}</option>
                        <option value="En investigación">{t('panelExt.incInvestigacion')}</option>
                        <option value="Resuelta">{t('panelExt.incResuelta')}</option>
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
                  <span>{t('panelExt.auditoriaBanner')}</span>
                </div>
                <span className="font-mono text-[11px] opacity-60">SHA-256 Enabled</span>
              </div>

              <Tabla
                headers={[
                  t('panelExt.thIdEvento'),
                  t('panelExt.thFechaHora'),
                  t('panelExt.thOpResp'),
                  t('panelExt.thAccionEjec'),
                  t('panelExt.thEntidadAfec'),
                  t('panelExt.thHash')
                ]}
              >
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
                  {t('panelExt.flotaTitulo')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('panelExt.flotaSub')}
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
                          <span>{t('panelExt.flotaBase')}</span>
                          <strong className="text-slate-800 dark:text-white">{u.base}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('panelExt.flotaRespuesta')}</span>
                          <strong className="text-[#501228] dark:text-[#F27B91]">{u.tiempoRespuestaEst}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>{t('panelExt.flotaBateria')}</span>
                          <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <Battery className="w-3.5 h-3.5" />
                            <span>{u.bateria}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 pt-2">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">{t('panelExt.flotaEquip')}</span>
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
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('panelExt.flotaMedico')} {u.veterinario}</span>
                      <Button size="sm" variant="secondary" icon={PhoneCall}>
                        {t('panelExt.flotaDespachar')}
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
                  {t('panelExt.ajustesTitulo')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('panelExt.ajustesSub')}
                </p>
              </div>

              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-5 bg-white dark:bg-[#111827] shadow-sm">
                <form onSubmit={handleGuardarAjustes} className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                    <div className="space-y-0.5">
                      <span className="text-sm font-semibold text-slate-800 dark:text-white block">
                        {t('panelExt.alertaAsfaltoTitulo')}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t('panelExt.alertaAsfaltoDesc')}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      aria-label={t('panelExt.alertaAsfaltoTitulo')}
                      checked={ajustesLocales.alertasAsfaltoCaliente}
                      onChange={(e) => setAjustesLocales({ ...ajustesLocales, alertasAsfaltoCaliente: e.target.checked })}
                      className="w-4 h-4 accent-[#501228] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{t('panelExt.umbralMaxLabel')}</span>
                      <span className="font-bold text-[#501228] dark:text-[#F27B91]">{ajustesLocales.umbralTemperaturaAsfalto} °C</span>
                    </div>
                    <input
                      type="range"
                      aria-label={t('panelExt.umbralMaxLabel')}
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
                        {t('panelExt.avisoAforoTitulo')}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t('panelExt.avisoAforoDesc')}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      aria-label={t('panelExt.avisoAforoTitulo')}
                      checked={ajustesLocales.notificarAforoTerrazas}
                      onChange={(e) => setAjustesLocales({ ...ajustesLocales, notificarAforoTerrazas: e.target.checked })}
                      className="w-4 h-4 accent-[#501228] cursor-pointer"
                    />
                  </div>

                  {guardadoAjustes && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800/40">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t('panelExt.msgAjustesOk')}</span>
                    </div>
                  )}

                  <Button type="submit" variant="primary" icon={Save}>
                    {t('panelExt.btnGuardarPrefs')}
                  </Button>
                </form>
              </Card>

              {/* Gestión de Sesión */}
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4 bg-white dark:bg-[#111827] shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white block">
                      {t('panelExt.sesionOpTitulo')}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('panelExt.autenticadoComo', {
                        nombre: usuario?.nombre || t('panelExt.rolesLista.admin'),
                        email: usuario?.correo || 'mariana.rojas@gotox.cr'
                      })}
                    </span>
                  </div>
                  <Badge variant="success">{t('panelExt.estadoActivo')}</Badge>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('panelExt.sesionNotaTerminal')}
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={LogOut}
                    onClick={handleSolicitarCierre}
                    className="shrink-0"
                  >
                    {t('panelExt.btnCerrarSesion')}
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
