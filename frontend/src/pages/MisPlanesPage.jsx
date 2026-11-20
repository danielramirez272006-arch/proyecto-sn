import React, { useState, useEffect } from 'react';
import { PageWrapper } from '../components/PageWrapper';
import { LUGARES_GOTOX } from '../data/lugaresGoToX';
import {
  obtenerPlanes,
  guardarPlan,
  eliminarPlan,
  EVENTOS_GAM_CATALOGO,
  obtenerEventosAgendadosIds,
  alternarEventoAgendado,
  descargarEventoIcs
} from '../servicios/almacenamientoCliente';
import { ModalDetalleLugar } from '../components/ModalDetalleLugar';
import { useTema } from '../context/TemaContext';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Navigation,
  Compass,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Dog,
  ExternalLink,
  CalendarPlus,
  Volume2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function MisPlanesPage() {
  const { esClaro, esMorado, esOscuro } = useTema();
  const [planes, setPlanes] = useState(obtenerPlanes);
  const [eventosAgendados, setEventosAgendados] = useState(obtenerEventosAgendadosIds);
  const [modalNuevoPlan, setModalNuevoPlan] = useState(false);
  const [lugarParaVer, setLugarParaVer] = useState(null);

  // Formulario de nuevo plan
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState('2026-11-25');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [conMascota, setConMascota] = useState(true);
  const [lugarSeleccionadoId, setLugarSeleccionadoId] = useState('franco-cafe');

  useEffect(() => {
    const handleActualizacion = () => setPlanes(obtenerPlanes());
    window.addEventListener('gotox:planes', handleActualizacion);
    return () => window.removeEventListener('gotox:planes', handleActualizacion);
  }, []);

  const handleCrearPlan = (e) => {
    e.preventDefault();
    if (!nuevoTitulo.trim()) return;

    guardarPlan({
      titulo: nuevoTitulo,
      fecha: nuevaFecha,
      descripcion: nuevaDescripcion || 'Salida organizada con GoToX',
      conMascota,
      paradas: [
        {
          lugarId: lugarSeleccionadoId,
          horaEstimada: "10:00 AM",
          duracionMinutos: 90,
          nota: "Punto de partida del itinerario"
        }
      ]
    });

    setNuevoTitulo('');
    setNuevaDescripcion('');
    setModalNuevoPlan(false);
  };

  const handleEliminar = (id) => {
    if (confirm('¿Deseas eliminar este itinerario de tus planes?')) {
      eliminarPlan(id);
    }
  };

  const getLugarPorId = (id) => LUGARES_GOTOX.find(l => l.id === id);

  return (
    <PageWrapper className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-current/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#501228] text-white border border-[#F27B91]/30 mb-2">
            <Calendar className="w-3.5 h-3.5 text-[#F27B91]" />
            <span>Itinerarios & Rutas Urbanas</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            Mis Planes
          </h1>
          <p className="text-sm opacity-75 mt-1 font-sans">
            Organiza tus salidas, define horarios y calcula la duración de tus recorridos en el GAM.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalNuevoPlan(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/30 transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#F27B91]" />
          <span>Crear Nuevo Plan</span>
        </button>
      </div>

      {/* Lista de Planes */}
      <div className="space-y-6">
        {planes.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-current/10 space-y-4">
            <Calendar className="w-12 h-12 opacity-30 mx-auto" />
            <h3 className="font-serif font-bold text-lg">Aún no has creado ningún plan</h3>
            <p className="text-xs opacity-60 max-w-sm mx-auto">
              Diseña tu primera salida añadiendo paradas, restaurantes, terrazas y parques.
            </p>
            <button
              type="button"
              onClick={() => setModalNuevoPlan(true)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#501228] text-white"
            >
              Crear mi primer itinerario
            </button>
          </div>
        ) : (
          planes.map((plan) => {
            const duracionTotal = plan.paradas?.reduce((acc, p) => acc + (p.duracionMinutos || 60), 0) || 0;
            const horas = Math.floor(duracionTotal / 60);
            const minutos = duracionTotal % 60;

            return (
              <div
                key={plan.id}
                className={`p-6 sm:p-8 rounded-3xl border shadow-sm space-y-6 transition-colors ${
                  esClaro
                    ? 'bg-white border-slate-200'
                    : esMorado
                    ? 'bg-[#180A14] border-[#F27B91]/25'
                    : 'bg-[#111827] border-white/10'
                }`}
              >
                {/* Cabecera del Plan */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-current/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F27B91] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{plan.fecha}</span>
                      </span>
                      {plan.conMascota && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Dog className="w-3 h-3" />
                          <span>Paseo Canino</span>
                        </span>
                      )}
                    </div>
                    <h2 className="font-serif font-bold text-xl sm:text-2xl tracking-tight">
                      {plan.titulo}
                    </h2>
                    <p className="text-xs opacity-75">{plan.descripcion}</p>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="text-right text-xs">
                      <span className="opacity-60 block">Duración Estimada</span>
                      <strong className="text-sm">
                        {horas > 0 ? `${horas}h ` : ''}{minutos > 0 ? `${minutos}min` : ''}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEliminar(plan.id)}
                      title="Eliminar este plan"
                      className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Paradas del Itinerario */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-60 block">
                    Paradas del Recorrido ({plan.paradas?.length || 0})
                  </span>

                  <div className="space-y-3 relative before:absolute before:top-4 before:bottom-4 before:left-5 before:w-0.5 before:bg-current/10">
                    {plan.paradas?.map((parada, idx) => {
                      const lugar = getLugarPorId(parada.lugarId);
                      if (!lugar) return null;

                      return (
                        <div
                          key={idx}
                          className="relative flex items-start gap-4 p-4 rounded-2xl bg-current/5 border border-current/10 ml-2"
                        >
                          <div className="w-7 h-7 rounded-full bg-[#501228] text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-xs border border-[#F27B91]/40">
                            {idx + 1}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <h4
                                onClick={() => setLugarParaVer(lugar)}
                                className="font-serif font-bold text-sm hover:text-[#F27B91] cursor-pointer truncate"
                              >
                                {lugar.nombre}
                              </h4>
                              <span className="text-[11px] font-mono text-[#F27B91] shrink-0">
                                {parada.horaEstimada} &bull; {parada.duracionMinutos} min
                              </span>
                            </div>

                            <p className="text-xs opacity-60 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-500" />
                              <span>{lugar.zona} &bull; {lugar.categoria}</span>
                            </p>

                            {parada.nota && (
                              <p className="text-xs italic opacity-80 pt-1">
                                &ldquo;{parada.nota}&rdquo;
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setLugarParaVer(lugar)}
                            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-current/10 text-xs shrink-0"
                            title="Ver ficha del lugar"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Acciones del Plan */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <Link
                    to="/explorar"
                    className="text-[#F27B91] hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir más paradas desde el catálogo</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AGENDA DE EVENTOS COMUNITARIOS SYNODOS & ENCUENTROS PET-FRIENDLY GAM */}
      <div className="space-y-4 pt-6 border-t border-current/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F27B91] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Encuentros Synodos (Σύνοδος) &bull; Caminar Juntos</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              Agendar Eventos Pet-Friendly & Culturales en el GAM
            </h2>
            <p className="text-xs opacity-70">
              Inscríbete a los encuentros grupales del fin de semana o descárgalos directamente a Google / Apple Calendar (.ics).
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#501228] text-white border border-[#F27B91]/35 self-start sm:self-auto">
            {eventosAgendados.length} eventos agendados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {EVENTOS_GAM_CATALOGO.map((evt) => {
            const agendado = eventosAgendados.includes(evt.id);
            return (
              <div
                key={evt.id}
                className={`p-5 rounded-3xl border shadow-sm flex flex-col justify-between gap-4 transition-all ${
                  agendado
                    ? 'border-[#F27B91] bg-[#501228]/15 shadow-md'
                    : esClaro
                    ? 'bg-white border-slate-200'
                    : esMorado
                    ? 'bg-[#180A14] border-[#F27B91]/20'
                    : 'bg-[#111827] border-white/10'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#501228] text-[#F27B91] border border-[#F27B91]/30">
                      {evt.categoria}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      {evt.acustica}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-lg leading-snug">{evt.titulo}</h3>

                  <p className="text-xs opacity-80 leading-relaxed">{evt.descripcion}</p>

                  <div className="pt-1 space-y-1 text-[11px] opacity-75">
                    <div className="flex items-center gap-1.5 font-semibold text-[#F27B91]">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{evt.fecha} &bull; {evt.hora}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{evt.zona}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-current/10 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEventosAgendados(alternarEventoAgendado(evt.id))}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      agendado
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/35'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{agendado ? 'Agendado en Mi Lista' : 'Agendar Evento'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      descargarEventoIcs({
                        titulo: evt.titulo,
                        fecha: evt.fecha,
                        hora: evt.hora,
                        ubicacion: evt.zona,
                        descripcion: evt.descripcion
                      })
                    }
                    title="Descargar archivo .ics para Google/Apple Calendar"
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-current/20 hover:border-[#F27B91] transition-colors"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-[#F27B91]" />
                    <span>.ics</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Crear Nuevo Plan */}
      {modalNuevoPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-5 ${
            esClaro ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#180A14] border-[#F27B91]/30 text-white'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-current/10">
              <h3 className="font-serif font-bold text-xl">Crear Nuevo Itinerario</h3>
              <button
                type="button"
                onClick={() => setModalNuevoPlan(false)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCrearPlan} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold opacity-70 block">Título del Plan</label>
                <input
                  type="text"
                  required
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  placeholder="Ej. Tarde de café y libros en Amón"
                  className="w-full p-2.5 rounded-xl border border-current/20 bg-transparent text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold opacity-70 block">Fecha Programada</label>
                  <input
                    type="date"
                    required
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-current/20 bg-transparent text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold opacity-70 block">Primer Punto de Encuentro</label>
                  <select
                    value={lugarSeleccionadoId}
                    onChange={(e) => setLugarSeleccionadoId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-current/20 bg-transparent text-xs outline-none"
                  >
                    {LUGARES_GOTOX.map(l => (
                      <option key={l.id} value={l.id}>{l.nombre} ({l.zona})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold opacity-70 block">Descripción u Objetivo</label>
                <textarea
                  rows="2"
                  value={nuevaDescripcion}
                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                  placeholder="Ej. Salida tranquila bajo lluvia con impermeable..."
                  className="w-full p-2.5 rounded-xl border border-current/20 bg-transparent text-xs outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={conMascota}
                  onChange={(e) => setConMascota(e.target.checked)}
                  className="accent-[#501228] w-4 h-4 rounded"
                />
                <span className="font-semibold">Incluye paseo con mascota</span>
              </label>

              <div className="pt-3 border-t border-current/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevoPlan(false)}
                  className="px-4 py-2 rounded-xl opacity-70 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/40"
                >
                  Guardar Itinerario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha si se selecciona una parada */}
      {lugarParaVer && (
        <ModalDetalleLugar
          lugar={lugarParaVer}
          onClose={() => setLugarParaVer(null)}
        />
      )}
    </PageWrapper>
  );
}
export default MisPlanesPage;
