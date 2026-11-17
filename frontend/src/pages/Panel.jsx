import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutPanel } from '../layouts/LayoutPanel';
import { PageWrapper } from '../components/PageWrapper';
import { LOCALES } from '../data/locales';
import { UNIDADES_FLOTA } from '../data/flota';
import { ConsolaIA } from '../components/ConsolaIA';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabla, Tr, Td } from '../components/ui/Tabla';
import { AnimacionCierreSesion } from '../components/AnimacionCierreSesion';
import { ModalConfirmarCierre } from '../components/ModalConfirmarCierre';
import { useTelemetria } from '../hooks/useTelemetria';
import { useSesion } from '../hooks/useSesion';
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
  UserCheck
} from 'lucide-react';

export function Panel() {
  const navigate = useNavigate();
  const [tabActiva, setTabActiva] = useState('vitals');
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);
  const telemetria = useTelemetria();
  const { ajustes, actualizarAjustes, usuario, cerrarSesion, isLoggedIn } = useSesion();

  // Protección de ruta: Si la sesión está cerrada, redirigir al login
  React.useEffect(() => {
    if (!isLoggedIn) {
      navigate('/acceso', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const handleSolicitarCierre = () => {
    setModalConfirmacionAbierto(true);
  };

  const handleConfirmarSalida = () => {
    setModalConfirmacionAbierto(false);
    setAnimandoSalida(true);
  };

  const handleCompletarSalida = () => {
    cerrarSesion();
    setAnimandoSalida(false);
    navigate('/acceso');
  };

  // Estado para la tabla de locales
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const [ordenCampo, setOrdenCampo] = useState('decibelios');
  const [ordenAsc, setOrdenAsc] = useState(true);

  // Estado para ajustes
  const [ajustesLocales, setAjustesLocales] = useState(ajustes);
  const [guardadoAjustes, setGuardadoAjustes] = useState(false);

  const tabsConfig = [
    { id: 'vitals', label: 'Telemetría & Vitals', icon: Activity, badge: 'En vivo' },
    { id: 'locales', label: 'Locales & Aforo', icon: Building2, badge: `${LOCALES.length}` },
    { id: 'flota', label: 'Flota SOS GAM', icon: Ambulance, badge: '3 Unidades' },
    { id: 'ajustes', label: 'Ajustes IA', icon: Sliders }
  ];

  // Cálculo de KPIs globales
  const totalPerrosEnRed = useMemo(() => LOCALES.reduce((acc, l) => acc + l.aforoActual, 0), []);
  const capacidadMaximaRed = useMemo(() => LOCALES.reduce((acc, l) => acc + l.aforoMax, 0), []);
  const promedioDecibelios = useMemo(() => Math.round(LOCALES.reduce((acc, l) => acc + l.decibelios, 0) / LOCALES.length), []);

  // Filtrado y ordenamiento de locales
  const localesProcesados = useMemo(() => {
    return LOCALES.filter(l => 
      l.nombre.toLowerCase().includes(busquedaLocal.toLowerCase()) ||
      l.zona.toLowerCase().includes(busquedaLocal.toLowerCase()) ||
      l.categoria.toLowerCase().includes(busquedaLocal.toLowerCase())
    ).sort((a, b) => {
      let valA = a[ordenCampo];
      let valB = b[ordenCampo];
      if (typeof valA === 'string') {
        return ordenAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return ordenAsc ? valA - valB : valB - valA;
    });
  }, [busquedaLocal, ordenCampo, ordenAsc]);

  const toggleOrden = (campo) => {
    if (ordenCampo === campo) {
      setOrdenAsc(!ordenAsc);
    } else {
      setOrdenCampo(campo);
      setOrdenAsc(true);
    }
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
      {/* Modal de confirmación y advertencia */}
      <ModalConfirmarCierre
        isOpen={modalConfirmacionAbierto}
        onClose={() => setModalConfirmacionAbierto(false)}
        onConfirmar={handleConfirmarSalida}
        nombreUsuario={usuario?.nombre}
      />

      {/* Animación de cierre de sesión hacia /acceso */}
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
              {tabActiva === 'vitals' && 'Telemetría Urbana & Signos Vitales GAM'}
              {tabActiva === 'locales' && 'Directorio de Terrazas & Aforo'}
              {tabActiva === 'flota' && 'Flota de Ambulancias SOS GAM'}
              {tabActiva === 'ajustes' && 'Ajustes de Inteligencia Artificial'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-sans mt-0.5">
              Supervisión de sensores, aforos caninos y protocolos de bienestar animal en tiempo real.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 gotox-radar-dot" />
            <span>Sensores GAM En Línea</span>
          </div>
        </div>

        {/* PESTAÑA 1: TELEMETRÍA & VITALS */}
        {tabActiva === 'vitals' && (
          <div className="space-y-6">
            {/* KPIs Globales del GAM */}
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

            {/* Consola IA de Lenguaje Natural */}
            <ConsolaIA />
          </div>
        )}

        {/* PESTAÑA 2: LOCALES & TABLA DE AFORO */}
        {tabActiva === 'locales' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif font-bold text-2xl text-[#111827] dark:text-white">
                  Registro de Locales & Inspección Acústica
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monitoreo continuo de terrazas, calidad de aire y protocolos de sombra.
                </p>
              </div>

              {/* Búsqueda */}
              <div className="w-full sm:w-72">
                <Input
                  icon={Search}
                  placeholder="Buscar local o zona..."
                  value={busquedaLocal}
                  onChange={(e) => setBusquedaLocal(e.target.value)}
                />
              </div>
            </div>

            {/* Tabla Completa */}
            <Tabla
              headers={[
                'Local & Categoría',
                'Zona GAM',
                <button key="aforo" type="button" onClick={() => toggleOrden('aforoActual')} className="inline-flex items-center gap-1 font-semibold">
                  <span>Aforo Canino</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>,
                <button key="db" type="button" onClick={() => toggleOrden('decibelios')} className="inline-flex items-center gap-1 font-semibold">
                  <span>Decibelios</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>,
                'Estado Operativo',
                'Inspector Responsable'
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
                          <span>{local.aforoActual} / {local.aforoMax}</span>
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
                      <div className="text-[11px]">
                        <span className="text-slate-800 dark:text-slate-200 font-medium block">{local.inspector}</span>
                        <span className="text-slate-400 dark:text-slate-500">{local.ultimaInspeccion}</span>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Tabla>
          </div>
        )}

        {/* PESTAÑA 3: FLOTA SOS */}
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

        {/* PESTAÑA 4: AJUSTES */}
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

                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-slate-800 block">
                      Aviso de Aforo en Terrazas de Escalante
                    </span>
                    <span className="text-xs text-slate-500">
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
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Ajustes guardados con éxito en la memoria local.</span>
                  </div>
                )}

                <Button type="submit" variant="primary" icon={Save}>
                  Guardar Preferencias
                </Button>
              </form>
            </Card>

            {/* Gestión de Sesión y Cuenta */}
            <Card className="p-6 border-slate-200/80 space-y-4 bg-white shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-slate-800 block">
                    Sesión del Operador
                  </span>
                  <span className="text-xs text-slate-500">
                    Autenticado como <strong>{usuario?.nombre || 'Operador'}</strong> ({usuario?.correo || 'mariana.rojas@gotox.cr'}).
                  </span>
                </div>
                <Badge variant="success">Activo</Badge>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <p className="text-xs text-slate-500">
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
      </div>
    </LayoutPanel>
    </PageWrapper>
  );
}

