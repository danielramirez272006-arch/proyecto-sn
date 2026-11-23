import React, { useState, useEffect } from 'react';
import { PageWrapper } from '../components/PageWrapper';
import { CarnetDigital } from '../components/CarnetDigital';
import { RuletaVideos } from '../components/RuletaVideos';
import { SelectorFotoMascota } from '../components/SelectorFotoMascota';
import { useSesion } from '../hooks/useSesion';
import { useTema } from '../context/TemaContext';
import { useIdioma } from '../context/IdiomaContext';
import { LUGARES_GOTOX } from '../data/lugaresGoToX';
import { ModalDetalleLugar } from '../components/ModalDetalleLugar';
import {
  obtenerAlertasSos,
  publicarAlertaSos,
  marcarAlertaSosResuelta,
  obtenerRecordatorios,
  agregarRecordatorio,
  alternarRecordatorioCompletado,
  eliminarRecordatorio,
  descargarEventoIcs
} from '../servicios/almacenamientoCliente';
import {
  PERFILES_RAZAS_CANINAS,
  buscarPerfilRaza
} from '../servicios/razasPerrosApi';
import {
  Dog,
  ShieldCheck,
  PhoneCall,
  Heart,
  Info,
  AlertTriangle,
  PlusCircle,
  Clock,
  Compass,
  ArrowRight,
  MapPin,
  Edit3,
  Save,
  CheckCircle2,
  X,
  Sparkles,
  Thermometer,
  Siren,
  Bell,
  CalendarPlus,
  Trash2,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DIRECTORIO_VETERINARIO_GAM = [
  {
    nombre: "Hospital Veterinario San Francisco de Asís (24 Horas)",
    zona: "San Pedro / Los Yoses",
    telefono: "+506 2225-4000",
    tipo: "Hospital de Urgencias 24/7 con Cirugía y UCI",
    direccion: "Costado Sur de la Iglesia de San Pedro"
  },
  {
    nombre: "Clínica Veterinaria Escalante Pet Care",
    zona: "Barrio Escalante",
    telefono: "+506 2234-8890",
    tipo: "Medicina Preventiva, Vacunación y Nutrición",
    direccion: "Avenida 9, Calle 31, Barrio Escalante"
  },
  {
    nombre: "Centro de Trauma Animal La Sabana",
    zona: "Sabana Oeste / Rohrmoser",
    telefono: "+506 2296-1122",
    tipo: "Traumatología, Quemaduras Podales y Rayos X",
    direccion: "Bulevar de Rohrmoser, 100m Norte"
  }
];

export function MiMascotaPage() {
  const { mascota, usuario, guardarBovedaBackend } = useSesion();
  const { esClaro, esMorado } = useTema();
  const { t } = useIdioma();

  const tieneMascotaRegistrada = Boolean(
    mascota?.nombre && mascota.nombre !== 'Sin mascota registrada'
  );

  const [tieneMascota, setTieneMascota] = useState(() =>
    usuario?.tieneMascota !== undefined ? Boolean(usuario.tieneMascota) : tieneMascotaRegistrada
  );
  const [editandoMascota, setEditandoMascota] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState('');
  const [errorGuardado, setErrorGuardado] = useState('');
  const [lugarSeleccionado, setLugarSeleccionado] = useState(null);
  const [razaApartadoId, setRazaApartadoId] = useState(() => {
    const p = buscarPerfilRaza(mascota?.raza);
    return p?.id || PERFILES_RAZAS_CANINAS[0].id;
  });
  const razaApartadoActiva =
    PERFILES_RAZAS_CANINAS.find((r) => r.id === razaApartadoId) || PERFILES_RAZAS_CANINAS[0];

  // Estados para Red SOS Comunitaria GAM y Recordatorios Médicos / Vacunas
  const [alertasSos, setAlertasSos] = useState(obtenerAlertasSos);
  const [formSosAbierto, setFormSosAbierto] = useState(false);
  const [tipoReporteSos, setTipoReporteSos] = useState('extraviada');
  const [zonaSos, setZonaSos] = useState('Parque Francia, Barrio Escalante');
  const [descripcionSos, setDescripcionSos] = useState('');

  const [recordatorios, setRecordatorios] = useState(obtenerRecordatorios);
  const [nuevoRecTitulo, setNuevoRecTitulo] = useState('');
  const [nuevoRecCategoria, setNuevoRecCategoria] = useState('Vacunación');
  const [nuevoRecFecha, setNuevoRecFecha] = useState('2026-12-10');
  const [nuevoRecLugar, setNuevoRecLugar] = useState('Clínica Veterinaria GAM');

  const [formMascota, setFormMascota] = useState({
    nombre: tieneMascotaRegistrada ? mascota.nombre : '',
    raza: mascota?.raza && mascota.raza !== 'Sin especificar' ? mascota.raza : '',
    pesoKg: mascota?.pesoKg > 0 ? String(mascota.pesoKg) : '15',
    edadAnos: mascota?.edadAnos > 0 ? String(mascota.edadAnos) : '2',
    microchipId: mascota?.microchipId && mascota.microchipId !== 'En trámite' ? mascota.microchipId : '',
    colorManto: mascota?.colorManto && mascota.colorManto !== 'Variado' ? mascota.colorManto : '',
    foto: mascota?.foto || mascota?.photoUrl || null,
    alergias: Array.isArray(mascota?.alergias) ? mascota.alergias.join(', ') : ''
  });

  useEffect(() => {
    if (usuario?.tieneMascota !== undefined) {
      setTieneMascota(Boolean(usuario.tieneMascota));
    }
  }, [usuario?.tieneMascota]);

  useEffect(() => {
    const tieneNombreReal = Boolean(mascota?.nombre && mascota.nombre !== 'Sin mascota registrada');
    setFormMascota({
      nombre: tieneNombreReal ? mascota.nombre : '',
      raza: mascota?.raza && mascota.raza !== 'Sin especificar' ? mascota.raza : '',
      pesoKg: mascota?.pesoKg > 0 ? String(mascota.pesoKg) : '15',
      edadAnos: mascota?.edadAnos > 0 ? String(mascota.edadAnos) : '2',
      microchipId: mascota?.microchipId && mascota.microchipId !== 'En trámite' ? mascota.microchipId : '',
      colorManto: mascota?.colorManto && mascota.colorManto !== 'Variado' ? mascota.colorManto : '',
      foto: mascota?.foto || mascota?.photoUrl || null,
      alergias: Array.isArray(mascota?.alergias) ? mascota.alergias.join(', ') : ''
    });
  }, [mascota]);

  const activarRegistroMascota = () => {
    setTieneMascota(true);
    if (!tieneMascotaRegistrada) {
      setEditandoMascota(true);
    }
  };

  const handleDesactivarMascota = async () => {
    setTieneMascota(false);
    setEditandoMascota(false);
    try {
      await guardarBovedaBackend({ has_pet: false });
    } catch (_) {}
  };

  const handleGuardarMascota = async (e) => {
    e.preventDefault();
    if (!formMascota.nombre.trim()) {
      setErrorGuardado(t('mascotaPage.errNombreReq'));
      return;
    }

    setGuardando(true);
    setErrorGuardado('');
    setMensajeGuardado('');

    try {
      await guardarBovedaBackend({
        has_pet: true,
        pet: {
          nombre: formMascota.nombre.trim(),
          especie: 'Canino',
          raza: formMascota.raza.trim() || t('carnet.mestizo'),
          pesoKg: formMascota.pesoKg ? Number(formMascota.pesoKg) : 15,
          edadAnos: formMascota.edadAnos ? Number(formMascota.edadAnos) : 2,
          microchipId: formMascota.microchipId.trim(),
          colorManto: formMascota.colorManto.trim() || t('carnet.variado'),
          foto: formMascota.foto || null,
          alergias: formMascota.alergias
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        }
      });

      setTieneMascota(true);
      setEditandoMascota(false);
      setMensajeGuardado(t('mascotaPage.msgGuardadoOk'));
      setTimeout(() => setMensajeGuardado(''), 3500);
    } catch (err) {
      setErrorGuardado(err?.message || t('mascotaPage.msgGuardadoErr'));
    } finally {
      setGuardando(false);
    }
  };

  const lugaresPet = LUGARES_GOTOX.filter((l) => l.petFriendly === 'si').slice(0, 3);

  const mascotaVista = {
    ...mascota,
    id: mascota?.id || 'PET-CR-0001',
    nombre: formMascota.nombre || (tieneMascotaRegistrada ? mascota.nombre : t('comun.tuMascotaDefault')),
    raza: formMascota.raza || mascota?.raza || t('carnet.mestizo'),
    pesoKg: formMascota.pesoKg ? Number(formMascota.pesoKg) : (mascota?.pesoKg || 15),
    edadAnos: formMascota.edadAnos ? Number(formMascota.edadAnos) : (mascota?.edadAnos || 2),
    microchipId: formMascota.microchipId || mascota?.microchipId || t('comun.enTramite'),
    colorManto: formMascota.colorManto || mascota?.colorManto || t('carnet.variado'),
    foto: formMascota.foto ?? mascota?.foto ?? null,
    alergias: formMascota.alergias
      ? formMascota.alergias.split(',').map((s) => s.trim()).filter(Boolean)
      : (Array.isArray(mascota?.alergias) ? mascota.alergias : []),
    tutor: {
      ...(mascota?.tutor || {}),
      nombre: usuario?.nombre || mascota?.tutor?.nombre || t('comun.usuarioDefault'),
      telefono: usuario?.telefono || mascota?.tutor?.telefono || t('comun.sinRegistrar')
    }
  };

  const labelCategoriaRec = (cat) => {
    if (cat === 'Vacunación') return t('mascotaPage.catVacunacion');
    if (cat === 'Prevención') return t('mascotaPage.catDesparasitacion');
    if (cat === 'Higiene & Podología') return t('mascotaPage.catPeluqueria');
    if (cat === 'Control Veterinario') return t('mascotaPage.catCita');
    return cat;
  };

  const fotoMascotaActiva = mascotaVista.foto || null;

  return (
    <PageWrapper className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-current/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#501228] text-white border border-[#F27B91]/30 mb-2">
            <Dog className="w-3.5 h-3.5 text-[#F27B91]" />
            <span>{t('mascotaPage.tag')}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            {t('mascotaPage.titulo')}
          </h1>
          <p className="text-sm opacity-75 mt-1 font-sans">
            {t('mascotaPage.subtitulo')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {tieneMascota && (
            <button
              type="button"
              onClick={() => setEditandoMascota(!editandoMascota)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold border border-[#F27B91]/40 bg-[#501228]/20 text-[#F27B91] hover:bg-[#501228] hover:text-white transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{editandoMascota ? t('mascotaPage.ocultarEditor') : t('mascotaPage.editarMascotaFoto')}</span>
            </button>
          )}

          {/* Toggle para usuarios sin mascota */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-current/15 bg-current/5 text-xs">
            <button
              type="button"
              onClick={activarRegistroMascota}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                tieneMascota ? 'bg-[#501228] text-white shadow-xs' : 'opacity-60 hover:opacity-100'
              }`}
            >
              {t('mascotaPage.tengoMascota')}
            </button>
            <button
              type="button"
              onClick={handleDesactivarMascota}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                !tieneMascota ? 'bg-[#501228] text-white shadow-xs' : 'opacity-60 hover:opacity-100'
              }`}
            >
              {t('mascotaPage.noTengoMascota')}
            </button>
          </div>
        </div>
      </div>

      {mensajeGuardado && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{mensajeGuardado}</span>
        </div>
      )}

      {errorGuardado && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{errorGuardado}</span>
        </div>
      )}

      {/* CASO A: Usuario que NO tiene mascota */}
      {!tieneMascota ? (
        <div
          className={`p-8 sm:p-12 rounded-3xl border shadow-lg text-center max-w-2xl mx-auto space-y-6 ${
            esClaro ? 'bg-white border-slate-200' : esMorado ? 'bg-[#180A14] border-[#F27B91]/25' : 'bg-[#111827] border-white/10'
          }`}
        >
          <div className="w-16 h-16 rounded-3xl bg-current/5 border border-current/10 flex items-center justify-center mx-auto text-[#F27B91]">
            <Heart className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif font-bold text-2xl sm:text-3xl">{t('mascotaPage.sinMascotaTitulo')}</h2>
            <p className="text-sm opacity-80 leading-relaxed font-sans">
              {t('mascotaPage.sinMascotaDesc')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-current/5 border border-current/10 text-xs text-left space-y-2">
            <span className="font-bold flex items-center gap-1.5 text-[#F27B91]">
              <Info className="w-4 h-4" />
              <span>{t('mascotaPage.sinMascotaTipTitulo')}</span>
            </span>
            <p className="opacity-75">
              {t('mascotaPage.sinMascotaTipDesc')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Link
              to="/explorar"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/40"
            >
              <span>{t('mascotaPage.explorarOcioBtn')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setTieneMascota(true);
                setEditandoMascota(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold border border-current/20 hover:bg-current/5"
            >
              <span>{t('mascotaPage.registrarAhoraBtn')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* CASO B: Usuario con mascota */
        <div className="space-y-10">
          {/* Panel Editor / Registro Inline con Foto del Perro */}
          {(editandoMascota || !tieneMascotaRegistrada) && (
            <div
              className={`p-6 sm:p-8 rounded-3xl border shadow-lg space-y-5 ${
                esClaro ? 'bg-white border-slate-200' : esMorado ? 'bg-[#180A14] border-[#F27B91]/25' : 'bg-[#111827] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-current/10">
                <div className="flex items-center gap-2">
                  <Dog className="w-5 h-5 text-[#F27B91]" />
                  <h2 className="font-serif font-bold text-xl">
                    {tieneMascotaRegistrada ? t('mascotaPage.editorTituloEditar') : t('mascotaPage.editorTituloNuevo')}
                  </h2>
                </div>
                {tieneMascotaRegistrada && (
                  <button
                    type="button"
                    onClick={() => setEditandoMascota(false)}
                    className="p-1.5 rounded-xl hover:bg-current/10 transition-colors"
                    aria-label={t('mascotaPage.cerrarEditorAria')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <form onSubmit={handleGuardarMascota} className="space-y-4 text-xs">
                <SelectorFotoMascota
                  valor={formMascota.foto}
                  onChange={(foto) => setFormMascota((prev) => ({ ...prev, foto }))}
                  nombreMascota={formMascota.nombre || t('accesoExt.tuPerroDefault')}
                  razaActual={formMascota.raza}
                  onSeleccionarPerfilRaza={({ raza, pesoKg, colorManto, foto }) => {
                    setFormMascota((prev) => ({
                      ...prev,
                      raza: raza || prev.raza,
                      pesoKg: pesoKg ? String(pesoKg) : prev.pesoKg,
                      colorManto: colorManto || prev.colorManto,
                      foto: foto || prev.foto
                    }));
                  }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="opacity-70 block mb-1 font-medium">{t('mascotaPage.lblNombre')}</label>
                    <input
                      type="text"
                      value={formMascota.nombre}
                      onChange={(e) => setFormMascota({ ...formMascota, nombre: e.target.value })}
                      placeholder={t('mascotaPage.phNombre')}
                      className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="opacity-70 block mb-1 font-medium">{t('mascotaPage.lblRaza')}</label>
                    <input
                      type="text"
                      value={formMascota.raza}
                      onChange={(e) => setFormMascota({ ...formMascota, raza: e.target.value })}
                      placeholder={t('mascotaPage.phRaza')}
                      className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="opacity-70 block mb-1 font-medium">{t('mascotaPage.lblPeso')}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formMascota.pesoKg}
                      onChange={(e) => setFormMascota({ ...formMascota, pesoKg: e.target.value })}
                      placeholder={t('mascotaPage.phPeso')}
                      className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="opacity-70 block mb-1 font-medium">{t('mascotaPage.lblEdad')}</label>
                    <input
                      type="number"
                      value={formMascota.edadAnos}
                      onChange={(e) => setFormMascota({ ...formMascota, edadAnos: e.target.value })}
                      placeholder={t('mascotaPage.phEdad')}
                      className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="opacity-70 block mb-1 font-medium">{t('mascotaPage.lblColor')}</label>
                    <input
                      type="text"
                      value={formMascota.colorManto}
                      onChange={(e) => setFormMascota({ ...formMascota, colorManto: e.target.value })}
                      placeholder={t('mascotaPage.phColor')}
                      className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="opacity-70 block mb-1 font-medium">{t('mascotaPage.lblChip')}</label>
                    <input
                      type="text"
                      value={formMascota.microchipId}
                      onChange={(e) => setFormMascota({ ...formMascota, microchipId: e.target.value })}
                      placeholder={t('mascotaPage.phChip')}
                      className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="opacity-70 block mb-1 font-medium">{t('mascotaPage.lblAlergias')}</label>
                  <input
                    type="text"
                    value={formMascota.alergias}
                    onChange={(e) => setFormMascota({ ...formMascota, alergias: e.target.value })}
                    placeholder={t('mascotaPage.phAlergias')}
                    className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={guardando}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/40 shadow-md transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{guardando ? t('comun.guardando') : t('mascotaPage.guardarBtn')}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grilla Superior: Carnet 3D + Foto & Datos Resumidos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs uppercase font-bold tracking-wider opacity-60 block">
                {t('mascotaPage.carnetTag')}
              </span>
              <CarnetDigital mascota={mascotaVista} interactivo={true} />
              <p className="text-[11px] opacity-60 text-center">
                {t('mascotaPage.carnetSub')}
              </p>
            </div>

            <div
              className={`lg:col-span-6 p-6 sm:p-8 rounded-3xl border shadow-sm space-y-6 ${
                esClaro ? 'bg-white border-slate-200' : esMorado ? 'bg-[#180A14] border-[#F27B91]/20' : 'bg-[#111827] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-current/10 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {fotoMascotaActiva ? (
                    <div
                      style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px' }}
                      className="w-12 h-12 rounded-2xl overflow-hidden border border-[#F27B91]/40 shadow-xs shrink-0 bg-slate-800"
                    >
                      <img
                        src={fotoMascotaActiva}
                        alt={mascotaVista.nombre}
                        style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                        className="w-12 h-12 object-cover block"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-[#501228]/20 text-[#F27B91] flex items-center justify-center border border-[#F27B91]/30 shrink-0">
                      <Dog className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="font-serif font-bold text-lg block truncate">{t('mascotaPage.fichaDe', { nombre: mascotaVista.nombre })}</span>
                    <span className="text-[11px] opacity-65">{t('mascotaPage.bovedaMedica')}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                  {t('comun.activo')}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-current/5">
                  <span className="opacity-60">{t('mascotaPage.lblNombreOficial')}</span>
                  <strong className="font-bold">{mascotaVista.nombre}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-current/5">
                  <span className="opacity-60">{t('mascotaPage.lblRazaManto')}</span>
                  <strong>{mascotaVista.raza} &bull; {mascotaVista.colorManto}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-current/5">
                  <span className="opacity-60">{t('mascotaPage.lblPesoEdad')}</span>
                  <strong>{mascotaVista.pesoKg} kg &bull; {mascotaVista.edadAnos} {t('mascotaPage.edadUnidad')}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-current/5">
                  <span className="opacity-60">{t('mascotaPage.lblMicrochip')}</span>
                  <strong className="font-mono">{mascotaVista.microchipId}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-current/5">
                  <span className="opacity-60">{t('mascotaPage.lblCobertura')}</span>
                  <strong className="text-emerald-500">
                    {mascotaVista?.polizaMedica?.aseguradora || t('carnet.aseguradoraDefault')}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="opacity-60">{t('mascotaPage.lblTutor')}</span>
                  <strong>{mascotaVista.tutor.nombre} ({mascotaVista.tutor.telefono})</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-current/5 border border-current/10 flex items-start gap-2.5 text-xs">
                <Info className="w-4 h-4 text-[#F27B91] shrink-0 mt-0.5" />
                <span className="leading-relaxed opacity-85">
                  {t('mascotaPage.avisoBiometria')}
                </span>
              </div>
            </div>
          </div>

          {/* Apartado de Razas y Galería de Fotos: al elegir una raza muestra sus fotos directamente */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-sm space-y-6 ${
              esClaro ? 'bg-white border-slate-200' : esMorado ? 'bg-[#180A14] border-[#F27B91]/20' : 'bg-[#111827] border-white/10'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-current/10">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F27B91] uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('mascotaPage.razasTag')}</span>
                </div>
                <h2 className="font-serif font-bold text-2xl tracking-tight">
                  {t('mascotaPage.razasTitulo')}
                </h2>
                <p className="text-xs opacity-70 mt-0.5">
                  {t('mascotaPage.razasSub')}
                </p>
              </div>
            </div>

            {/* Píldoras de selección rápida de raza */}
            <div className="flex flex-wrap gap-2">
              {PERFILES_RAZAS_CANINAS.map((perfil) => {
                const activa = razaApartadoActiva.id === perfil.id;
                return (
                  <button
                    key={perfil.id}
                    type="button"
                    onClick={() => setRazaApartadoId(perfil.id)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                      activa
                        ? 'bg-[#501228] text-white border-[#F27B91]/50 shadow-sm'
                        : 'bg-current/5 border-current/10 opacity-75 hover:opacity-100 hover:border-[#F27B91]/35'
                    }`}
                  >
                    <Dog className={`w-3.5 h-3.5 ${activa ? 'text-[#F27B91]' : 'opacity-70'}`} />
                    <span>{perfil.nombre}</span>
                  </button>
                );
              })}
            </div>

            {/* Galería de fotos y perfil de la raza elegida */}
            {razaApartadoActiva && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
                {/* Fotos de la raza elegida */}
                <div className="lg:col-span-7 space-y-2.5">
                  <span className="text-xs font-bold block opacity-80">
                    {t('mascotaPage.fotosDisponibles', { raza: razaApartadoActiva.nombre })}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {(razaApartadoActiva.fotos || []).map((fotoUrl, index) => {
                      const esFotoActual = fotoMascotaActiva === fotoUrl;
                      return (
                        <button
                          key={fotoUrl}
                          type="button"
                          onClick={() => {
                            setFormMascota((prev) => ({
                              ...prev,
                              nombre: prev.nombre || mascotaVista.nombre || 'Max',
                              raza: razaApartadoActiva.nombre,
                              pesoKg: String(razaApartadoActiva.pesoPromedioKg),
                              colorManto: razaApartadoActiva.colorMantoSugerido,
                              foto: fotoUrl
                            }));
                            setEditandoMascota(true);
                            setMensajeGuardado(
                              t('mascotaPage.msgFotoElegida', { raza: razaApartadoActiva.nombre })
                            );
                          }}
                          className={`group relative rounded-2xl overflow-hidden border-2 text-left transition-all ${
                            esFotoActual
                              ? 'border-[#F27B91] ring-2 ring-[#F27B91]/35 shadow-lg'
                              : 'border-current/15 hover:border-[#F27B91]/60 shadow-sm'
                          }`}
                          style={{ height: '148px' }}
                        >
                          <img
                            src={fotoUrl}
                            alt={t('selectorFoto.opcionAlt', { raza: razaApartadoActiva.nombre, n: index + 1 })}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/imagenes/copiloto-bruno.jpg';
                            }}
                            style={{ width: '100%', height: '148px', objectFit: 'cover' }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 block"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px] font-bold">
                            <span>{t('mascotaPage.opcionNum', { n: index + 1 })}</span>
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] ${
                                esFotoActual ? 'bg-emerald-500 text-white' : 'bg-[#501228]/90 text-[#F27B91]'
                              }`}
                            >
                              {esFotoActual ? t('mascotaPage.enUso') : t('mascotaPage.elegirFoto')}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ficha resumen del perfil de esa raza */}
                <div className="lg:col-span-5 p-5 rounded-2xl bg-current/5 border border-current/10 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-current/10 pb-2.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#F27B91] block">{t('mascotaPage.perfilRazaTitulo')}</span>
                      <h3 className="font-serif font-bold text-lg">{razaApartadoActiva.nombre}</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl font-bold bg-[#501228] text-white text-[11px]">
                      {razaApartadoActiva.rangoPeso}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="opacity-65">{t('mascotaPage.lblEsperanza')}</span>
                      <strong>{razaApartadoActiva.esperanzaVida}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-65">{t('mascotaPage.lblMantoHab')}</span>
                      <strong>{razaApartadoActiva.colorMantoSugerido}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-65">{t('mascotaPage.lblEnergia')}</span>
                      <strong className="text-[#F27B91]">{razaApartadoActiva.nivelEnergia}</strong>
                    </div>
                    <div className="pt-1 border-t border-current/10 space-y-1">
                      <span className="opacity-65 flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t('mascotaPage.lblClimaAsfalto')}</span>
                      </span>
                      <p className="font-semibold leading-snug">{razaApartadoActiva.toleranciaCalor}</p>
                    </div>
                    <div className="pt-1 border-t border-current/10 space-y-1">
                      <span className="opacity-65 block">{t('mascotaPage.lblTemperamento')}</span>
                      <p className="opacity-90 leading-relaxed">{razaApartadoActiva.cuidadosGam}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RED SOS DE MASCOTAS EXTRAVIADAS & ALERTA COMUNITARIA GAM */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-sm space-y-5 ${
              esClaro ? 'bg-white border-slate-200' : esMorado ? 'bg-[#180A14] border-rose-500/30' : 'bg-[#111827] border-rose-500/25'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-current/10">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">
                  <Siren className="w-3.5 h-3.5" />
                  <span>{t('mascotaPage.sosTag')}</span>
                </div>
                <h2 className="font-serif font-bold text-2xl tracking-tight">
                  {t('mascotaPage.sosTitulo')}
                </h2>
                <p className="text-xs opacity-75 mt-0.5">
                  {t('mascotaPage.sosDesc')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFormSosAbierto(!formSosAbierto)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all self-start sm:self-auto"
              >
                <Siren className="w-4 h-4" />
                <span>{formSosAbierto ? t('mascotaPage.cerrarFormSos') : t('mascotaPage.activarSosBtn')}</span>
              </button>
            </div>

            {formSosAbierto && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const actualizadas = publicarAlertaSos({
                    tipo: tipoReporteSos,
                    nombreMascota: tipoReporteSos === 'extraviada' ? mascotaVista.nombre : t('mascotaPage.estadoAvistamiento'),
                    raza: mascotaVista.raza,
                    colorManto: mascotaVista.colorManto,
                    zona: zonaSos,
                    contacto: mascotaVista.tutor.telefono !== t('comun.sinRegistrar') ? mascotaVista.tutor.telefono : '+506 8832-9011',
                    tutor: mascotaVista.tutor.nombre,
                    microchip: mascotaVista.microchipId,
                    descripcion:
                      descripcionSos.trim() ||
                      `SOS: ${mascotaVista.nombre} (${mascotaVista.raza}).`,
                    foto: fotoMascotaActiva || '/imagenes/copiloto-bruno.jpg'
                  });
                  setAlertasSos(actualizadas);
                  setDescripcionSos('');
                  setFormSosAbierto(false);
                  setMensajeGuardado(t('mascotaPage.msgSosOk'));
                  setTimeout(() => setMensajeGuardado(''), 4000);
                }}
                className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">{t('mascotaPage.lblTipoReporte')}</label>
                    <select
                      value={tipoReporteSos}
                      onChange={(e) => setTipoReporteSos(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-current/20 bg-transparent outline-none font-semibold"
                    >
                      <option value="extraviada">🚨 {t('mascotaPage.optExtravio', { nombre: mascotaVista.nombre })}</option>
                      <option value="avistada">👀 {t('mascotaPage.optAvistamiento')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold block mb-1">{t('mascotaPage.lblZonaRef')}</label>
                    <input
                      type="text"
                      required
                      value={zonaSos}
                      onChange={(e) => setZonaSos(e.target.value)}
                      placeholder={t('mascotaPage.phZonaRef')}
                      className="w-full px-3 py-2 rounded-xl border border-current/20 bg-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold block mb-1">{t('mascotaPage.lblSenas')}</label>
                  <input
                    type="text"
                    value={descripcionSos}
                    onChange={(e) => setDescripcionSos(e.target.value)}
                    placeholder={t('mascotaPage.phSenas')}
                    className="w-full px-3 py-2 rounded-xl border border-current/20 bg-transparent outline-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                  >
                    {t('mascotaPage.emitirSosBtn')}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alertasSos.map((alerta) => (
                <div
                  key={alerta.id}
                  className="p-4 rounded-2xl bg-current/5 border border-current/10 flex gap-3.5 items-start justify-between"
                >
                  <div className="flex gap-3 min-w-0">
                    <div
                      style={{ width: '56px', height: '56px', minWidth: '56px', minHeight: '56px' }}
                      className="w-14 h-14 rounded-2xl overflow-hidden border border-rose-500/40 shrink-0 bg-slate-800"
                    >
                      <img
                        src={alerta.foto}
                        alt={alerta.nombreMascota}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/imagenes/copiloto-bruno.jpg';
                        }}
                        style={{ width: '56px', height: '56px', objectFit: 'cover' }}
                        className="w-14 h-14 object-cover block"
                      />
                    </div>
                    <div className="space-y-1 text-xs min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            alerta.estado === 'Resuelta'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : alerta.tipo === 'extraviada'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/35'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/35'
                          }`}
                        >
                          {alerta.estado === 'Resuelta'
                            ? t('mascotaPage.estadoCasa')
                            : alerta.tipo === 'extraviada'
                            ? t('mascotaPage.estadoExtraviada')
                            : t('mascotaPage.estadoAvistamiento')}
                        </span>
                        <span className="text-[10px] opacity-60">{alerta.fechaHora}</span>
                      </div>
                      <h3 className="font-serif font-bold text-base truncate">
                        {alerta.nombreMascota} <span className="text-xs font-sans font-normal opacity-75">({alerta.raza})</span>
                      </h3>
                      <p className="text-[11px] opacity-85 line-clamp-2">{alerta.descripcion}</p>
                      <p className="text-[11px] text-[#F27B91] font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{alerta.zona}</span>
                      </p>
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <a
                          href={`tel:${alerta.contacto}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#501228] text-white text-[11px] font-bold"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>{t('mascotaPage.contactarTel', { tel: alerta.contacto })}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setAlertasSos(marcarAlertaSosResuelta(alerta.id))}
                          className="text-[11px] font-semibold opacity-75 hover:opacity-100 underline"
                        >
                          {alerta.estado === 'Resuelta' ? t('mascotaPage.reabrirAlerta') : t('mascotaPage.marcarEnCasa')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AGENDA DE RECORDATORIOS MÉDICOS, VACUNACIÓN Y CUIDADOS (CON DESCARGA .ICS) */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-sm space-y-5 ${
              esClaro ? 'bg-white border-slate-200' : esMorado ? 'bg-[#180A14] border-[#F27B91]/20' : 'bg-[#111827] border-white/10'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-current/10">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F27B91] uppercase tracking-wider mb-1">
                  <Bell className="w-3.5 h-3.5" />
                  <span>{t('mascotaPage.agendaTag')}</span>
                </div>
                <h2 className="font-serif font-bold text-2xl tracking-tight">
                  {t('mascotaPage.agendaTitulo')}
                </h2>
                <p className="text-xs opacity-70 mt-0.5">
                  {t('mascotaPage.agendaDesc')}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
                {t('mascotaPage.completadosBadge', {
                  done: recordatorios.filter((r) => r.completado).length,
                  total: recordatorios.length
                })}
              </span>
            </div>

            {/* Formulario rápido para agendar nuevo recordatorio */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!nuevoRecTitulo.trim()) return;
                const lista = agregarRecordatorio({
                  titulo: nuevoRecTitulo.trim(),
                  categoria: nuevoRecCategoria,
                  fecha: nuevoRecFecha,
                  lugar: nuevoRecLugar.trim() || 'Clínica Veterinaria GAM'
                });
                setRecordatorios(lista);
                setNuevoRecTitulo('');
              }}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs p-3.5 rounded-2xl bg-current/5 border border-current/10"
            >
              <input
                type="text"
                value={nuevoRecTitulo}
                onChange={(e) => setNuevoRecTitulo(e.target.value)}
                placeholder={t('mascotaPage.phRecordatorio')}
                className="sm:col-span-4 px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
              />
              <select
                value={nuevoRecCategoria}
                onChange={(e) => setNuevoRecCategoria(e.target.value)}
                className="sm:col-span-2 px-2.5 py-2 rounded-xl border border-current/15 bg-transparent outline-none font-semibold"
              >
                <option value="Vacunación">{t('mascotaPage.catVacunacion')}</option>
                <option value="Prevención">{t('mascotaPage.catDesparasitacion')}</option>
                <option value="Higiene & Podología">{t('mascotaPage.catPeluqueria')}</option>
                <option value="Control Veterinario">{t('mascotaPage.catCita')}</option>
              </select>
              <input
                type="date"
                value={nuevoRecFecha}
                onChange={(e) => setNuevoRecFecha(e.target.value)}
                className="sm:col-span-2 px-2.5 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
              />
              <input
                type="text"
                value={nuevoRecLugar}
                onChange={(e) => setNuevoRecLugar(e.target.value)}
                placeholder={t('mascotaPage.phLugarRec')}
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
              />
              <button
                type="submit"
                className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/40"
              >
                <Plus className="w-3.5 h-3.5 text-[#F27B91]" />
                <span>{t('mascotaPage.agendarBtn')}</span>
              </button>
            </form>

            {/* Lista de recordatorios */}
            <div className="space-y-2.5">
              {recordatorios.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    rec.completado
                      ? 'bg-emerald-500/5 border-emerald-500/25 opacity-80'
                      : 'bg-current/5 border-current/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setRecordatorios(alternarRecordatorioCompletado(rec.id))}
                      title={rec.completado ? t('mascotaPage.reabrirAlerta') : t('mascotaPage.completadoLabel')}
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        rec.completado
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-current/30 hover:border-[#F27B91]'
                      }`}
                    >
                      {rec.completado && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <div className="space-y-0.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#501228] text-[#F27B91]">
                          {labelCategoriaRec(rec.categoria)}
                        </span>
                        <span className="font-mono text-[11px] opacity-75">
                          📅 {rec.fecha} &bull; {rec.hora}
                        </span>
                      </div>
                      <h4 className={`font-bold text-sm ${rec.completado ? 'line-through opacity-70' : ''}`}>
                        {rec.titulo}
                      </h4>
                      <p className="text-[11px] opacity-65">{rec.lugar}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() =>
                        descargarEventoIcs({
                          titulo: `${rec.titulo} (${mascotaVista.nombre})`,
                          fecha: rec.fecha,
                          hora: rec.hora,
                          ubicacion: rec.lugar,
                          descripcion: rec.titulo
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-current/15 hover:border-[#F27B91] transition-colors"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-[#F27B91]" />
                      <span>{t('mascotaPage.descargarIcs')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecordatorios(eliminarRecordatorio(rec.id))}
                      className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title={t('mascotaPage.eliminarRecAria')}
                      aria-label={t('mascotaPage.eliminarRecAria')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Directorio Veterinario de Emergencia 24/7 */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif font-bold text-2xl tracking-tight">{t('mascotaPage.vetTag')}</h2>
                <p className="text-xs opacity-60">{t('mascotaPage.vetTitulo')} {t('mascotaPage.vetDesc')}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{t('mascotaPage.vetAviso')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {DIRECTORIO_VETERINARIO_GAM.map((vet, i) => (
                <div
                  key={i}
                  className={`p-5 rounded-3xl border shadow-sm space-y-3 flex flex-col justify-between ${
                    esClaro ? 'bg-white border-slate-200' : esMorado ? 'bg-[#180A14] border-[#F27B91]/20' : 'bg-[#162032] border-white/10'
                  }`}
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-[#F27B91] uppercase block tracking-wider">
                      {vet.zona}
                    </span>
                    <h3 className="font-serif font-bold text-base">{vet.nombre}</h3>
                    <p className="text-xs opacity-70">{vet.tipo}</p>
                    <p className="text-[11px] opacity-60 flex items-center gap-1 pt-1">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span>{vet.direccion}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-current/10 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold">{vet.telefono}</span>
                    <a
                      href={`tel:${vet.telefono}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/40 shadow-xs"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{t('comun.llamar')}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terrazas y Espacios Pet-Friendly Recomendados */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif font-bold text-2xl tracking-tight">
                  {t('mascotaPage.espaciosTitulo', { nombre: mascotaVista.nombre })}
                </h2>
                <p className="text-xs opacity-60">{t('mascotaPage.espaciosSub')}</p>
              </div>
              <Link to="/explorar" className="text-xs font-bold text-[#F27B91] hover:underline flex items-center gap-1">
                <span>{t('mascotaPage.verTerrazasBtn')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {lugaresPet.map((lugar) => (
                <div
                  key={lugar.id}
                  onClick={() => setLugarSeleccionado(lugar)}
                  className={`p-4 rounded-3xl border shadow-sm hover:shadow-xl transition-all cursor-pointer space-y-3 ${
                    esClaro ? 'bg-white border-slate-200' : esMorado ? 'bg-[#180A14] border-[#F27B91]/20' : 'bg-[#162032] border-white/10'
                  }`}
                >
                  <div className="relative h-36 rounded-2xl overflow-hidden bg-slate-800">
                    <img src={lugar.imagen} alt={lugar.nombre} className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm">
                      {lugar.decibelios} dB &bull; {lugar.zona}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base hover:text-[#F27B91] transition-colors">{lugar.nombre}</h3>
                    <p className="text-xs opacity-75 line-clamp-2 mt-1">{lugar.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Videos Educativos Aprobados */}
          <div className="pt-4 border-t border-current/10">
            <RuletaVideos />
          </div>
        </div>
      )}

      {/* Modal Ficha si se selecciona un lugar */}
      {lugarSeleccionado && (
        <ModalDetalleLugar
          lugar={lugarSeleccionado}
          onClose={() => setLugarSeleccionado(null)}
        />
      )}
    </PageWrapper>
  );
}
export default MiMascotaPage;
