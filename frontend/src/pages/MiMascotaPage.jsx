import React, { useState, useEffect } from 'react';
import { PageWrapper } from '../components/PageWrapper';
import { CarnetDigital } from '../components/CarnetDigital';
import { RuletaVideos } from '../components/RuletaVideos';
import { SelectorFotoMascota } from '../components/SelectorFotoMascota';
import { useSesion } from '../hooks/useSesion';
import { useTema } from '../context/TemaContext';
import { LUGARES_GOTOX } from '../data/lugaresGoToX';
import { ModalDetalleLugar } from '../components/ModalDetalleLugar';
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
  X
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
      setErrorGuardado('Ingresa al menos el nombre de tu perro.');
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
          raza: formMascota.raza.trim() || 'Mestizo',
          pesoKg: formMascota.pesoKg ? Number(formMascota.pesoKg) : 15,
          edadAnos: formMascota.edadAnos ? Number(formMascota.edadAnos) : 2,
          microchipId: formMascota.microchipId.trim(),
          colorManto: formMascota.colorManto.trim() || 'Variado',
          foto: formMascota.foto || null,
          alergias: formMascota.alergias
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        }
      });

      setTieneMascota(true);
      setEditandoMascota(false);
      setMensajeGuardado('¡Datos y foto de tu mascota guardados con éxito!');
      setTimeout(() => setMensajeGuardado(''), 3500);
    } catch (err) {
      setErrorGuardado(err?.message || 'No se pudo guardar la información de tu mascota.');
    } finally {
      setGuardando(false);
    }
  };

  const lugaresPet = LUGARES_GOTOX.filter((l) => l.petFriendly === 'si').slice(0, 3);

  const mascotaVista = {
    ...mascota,
    id: mascota?.id || 'PET-CR-0001',
    nombre: formMascota.nombre || (tieneMascotaRegistrada ? mascota.nombre : 'Tu Mascota'),
    raza: formMascota.raza || mascota?.raza || 'Mestizo',
    pesoKg: formMascota.pesoKg ? Number(formMascota.pesoKg) : (mascota?.pesoKg || 15),
    edadAnos: formMascota.edadAnos ? Number(formMascota.edadAnos) : (mascota?.edadAnos || 2),
    microchipId: formMascota.microchipId || mascota?.microchipId || 'En trámite',
    colorManto: formMascota.colorManto || mascota?.colorManto || 'Variado',
    foto: formMascota.foto ?? mascota?.foto ?? null,
    alergias: formMascota.alergias
      ? formMascota.alergias.split(',').map((s) => s.trim()).filter(Boolean)
      : (Array.isArray(mascota?.alergias) ? mascota.alergias : []),
    tutor: {
      ...(mascota?.tutor || {}),
      nombre: usuario?.nombre || mascota?.tutor?.nombre || 'Usuario GoToX',
      telefono: usuario?.telefono || mascota?.tutor?.telefono || 'Sin registrar'
    }
  };

  const fotoMascotaActiva = mascotaVista.foto || null;

  return (
    <PageWrapper className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-current/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#501228] text-white border border-[#F27B91]/30 mb-2">
            <Dog className="w-3.5 h-3.5 text-[#F27B91]" />
            <span>Módulo Opcional &bull; Bienestar Animal GAM</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            Mi Mascota & Bóveda Biométrica
          </h1>
          <p className="text-sm opacity-75 mt-1 font-sans">
            Información médica digital, foto, carnet verificable, red veterinaria y espacios amigables.
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
              <span>{editandoMascota ? 'Ocultar Editor' : 'Editar Mascota / Foto'}</span>
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
              Tengo Mascota
            </button>
            <button
              type="button"
              onClick={handleDesactivarMascota}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                !tieneMascota ? 'bg-[#501228] text-white shadow-xs' : 'opacity-60 hover:opacity-100'
              }`}
            >
              No tengo mascota
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
            <h2 className="font-serif font-bold text-2xl sm:text-3xl">GoToX está pensado para todos</h2>
            <p className="text-sm opacity-80 leading-relaxed font-sans">
              No necesitas tener mascota para disfrutar de GoToX. Puedes organizar salidas con amigos, descubrir gastronomía de especialidad, museos y actividades culturales en el GAM con nuestro buscador inteligente.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-current/5 border border-current/10 text-xs text-left space-y-2">
            <span className="font-bold flex items-center gap-1.5 text-[#F27B91]">
              <Info className="w-4 h-4" />
              <span>¿Vas a adoptar o salir con el perro de alguien más?</span>
            </span>
            <p className="opacity-75">
              Si decides registrar una mascota, este módulo te permite subir la foto de tu perro, generar su carnet 3D y activar recomendaciones pet-friendly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Link
              to="/explorar"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/40"
            >
              <span>Explorar Restaurantes & Ocio</span>
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
              <span>Registrar Mascota Ahora</span>
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
                    {tieneMascotaRegistrada ? 'Actualizar Información y Foto de Tu Perro' : 'Registrar Información de Tu Mascota'}
                  </h2>
                </div>
                {tieneMascotaRegistrada && (
                  <button
                    type="button"
                    onClick={() => setEditandoMascota(false)}
                    className="p-1.5 rounded-xl hover:bg-current/10 transition-colors"
                    aria-label="Cerrar editor"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <form onSubmit={handleGuardarMascota} className="space-y-4 text-xs">
                <SelectorFotoMascota
                  valor={formMascota.foto}
                  onChange={(foto) => setFormMascota({ ...formMascota, foto })}
                  nombreMascota={formMascota.nombre || 'tu perro'}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="opacity-70 block mb-1 font-medium">Nombre de tu perro *</label>
                    <input
                      type="text"
                      value={formMascota.nombre}
                      onChange={(e) => setFormMascota({ ...formMascota, nombre: e.target.value })}
                      placeholder="Ej. Max"
                      className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="opacity-70 block mb-1 font-medium">Raza / Especie</label>
                    <input
                      type="text"
                      value={formMascota.raza}
                      onChange={(e) => setFormMascota({ ...formMascota, raza: e.target.value })}
                      placeholder="Ej. Beagle o Mestizo"
                      className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="opacity-70 block mb-1 font-medium">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formMascota.pesoKg}
                      onChange={(e) => setFormMascota({ ...formMascota, pesoKg: e.target.value })}
                      placeholder="15"
                      className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="opacity-70 block mb-1 font-medium">Edad (años)</label>
                    <input
                      type="number"
                      value={formMascota.edadAnos}
                      onChange={(e) => setFormMascota({ ...formMascota, edadAnos: e.target.value })}
                      placeholder="2"
                      className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="opacity-70 block mb-1 font-medium">Color de Manto</label>
                    <input
                      type="text"
                      value={formMascota.colorManto}
                      onChange={(e) => setFormMascota({ ...formMascota, colorManto: e.target.value })}
                      placeholder="Ej. Dorado / Tricolor"
                      className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="opacity-70 block mb-1 font-medium">Microchip (Opcional)</label>
                    <input
                      type="text"
                      value={formMascota.microchipId}
                      onChange={(e) => setFormMascota({ ...formMascota, microchipId: e.target.value })}
                      placeholder="CRC-756-..."
                      className="w-full px-3 py-2 rounded-xl border border-current/15 bg-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="opacity-70 block mb-1 font-medium">Alergias o cuidados especiales (Opcional)</label>
                  <input
                    type="text"
                    value={formMascota.alergias}
                    onChange={(e) => setFormMascota({ ...formMascota, alergias: e.target.value })}
                    placeholder="Separadas por coma (ej. Pollo, Polen)"
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
                    <span>{guardando ? 'Guardando...' : 'Guardar Mascota'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grilla Superior: Carnet 3D + Foto & Datos Resumidos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs uppercase font-bold tracking-wider opacity-60 block">
                Credencial Médica & Biometría Activa
              </span>
              <CarnetDigital mascota={mascotaVista} interactivo={true} />
              <p className="text-[11px] opacity-60 text-center">
                Interactúa con el carnet para inclinarlo en perspectiva 3D.
              </p>
            </div>

            <div
              className={`lg:col-span-6 p-6 sm:p-8 rounded-3xl border shadow-sm space-y-6 ${
                esClaro ? 'bg-white border-slate-200' : esMorado ? 'bg-[#180A14] border-[#F27B91]/20' : 'bg-[#111827] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-current/10 gap-3">
                <div className="flex items-center gap-3">
                  {fotoMascotaActiva ? (
                    <img
                      src={fotoMascotaActiva}
                      alt={mascotaVista.nombre}
                      className="w-12 h-12 rounded-2xl object-cover border border-[#F27B91]/40 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-[#501228]/20 text-[#F27B91] flex items-center justify-center border border-[#F27B91]/30">
                      <Dog className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <span className="font-serif font-bold text-lg block">Ficha de {mascotaVista.nombre}</span>
                    <span className="text-[11px] opacity-65">Bóveda Médica GAM</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Activo
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-current/5">
                  <span className="opacity-60">Nombre Oficial:</span>
                  <strong className="font-bold">{mascotaVista.nombre}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-current/5">
                  <span className="opacity-60">Raza & Manto:</span>
                  <strong>{mascotaVista.raza} &bull; {mascotaVista.colorManto}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-current/5">
                  <span className="opacity-60">Peso & Edad:</span>
                  <strong>{mascotaVista.pesoKg} kg &bull; {mascotaVista.edadAnos} años</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-current/5">
                  <span className="opacity-60">Microchip Criptográfico:</span>
                  <strong className="font-mono">{mascotaVista.microchipId}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-current/5">
                  <span className="opacity-60">Cobertura / Registro:</span>
                  <strong className="text-emerald-500">
                    {mascotaVista?.polizaMedica?.aseguradora || 'Bóveda GoToX'}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="opacity-60">Tutor Responsable:</span>
                  <strong>{mascotaVista.tutor.nombre} ({mascotaVista.tutor.telefono})</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-current/5 border border-current/10 flex items-start gap-2.5 text-xs">
                <Info className="w-4 h-4 text-[#F27B91] shrink-0 mt-0.5" />
                <span className="leading-relaxed opacity-85">
                  Los datos biométricos y la fotografía de tu mascota permanecen sincronizados con tu cuenta personal en GoToX.
                </span>
              </div>
            </div>
          </div>

          {/* Directorio Veterinario de Emergencia 24/7 */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif font-bold text-2xl tracking-tight">Directorio Veterinario GAM</h2>
                <p className="text-xs opacity-60">Centros hospitalarios con atención de emergencias continuas.</p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>No reemplaza el diagnóstico presencial</span>
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
                      <span>Llamar</span>
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
                  Espacios Recomendados para Salir con {mascotaVista.nombre}
                </h2>
                <p className="text-xs opacity-60">Locales con agua filtrada, piso fresco y certificación acústica.</p>
              </div>
              <Link to="/explorar" className="text-xs font-bold text-[#F27B91] hover:underline flex items-center gap-1">
                <span>Ver todas las terrazas</span>
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
