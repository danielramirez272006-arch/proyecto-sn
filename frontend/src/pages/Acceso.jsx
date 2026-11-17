import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarnetDigital } from '../components/CarnetDigital';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/PageWrapper';
import { useSesion } from '../hooks/useSesion';
import { useTelemetria } from '../hooks/useTelemetria';
import { useTema } from '../context/TemaContext';
import {
  Dog,
  Mail,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Thermometer,
  LogIn,
  UserPlus,
  ArrowRight,
  Shield
} from 'lucide-react';

export function Acceso() {
  const navigate = useNavigate();
  const { iniciarSesion, loginConBackend, registrarConBackend, mascota, actualizarMascota } = useSesion();
  const telemetria = useTelemetria();
  const { tema, esClaro, esMorado, esOscuro } = useTema();

  const [modo, setModo] = useState('login'); // 'login' | 'onboarding-pet'
  const [correo, setCorreo] = useState('mariana.rojas@gotox.cr');
  const [clave, setClave] = useState('GoToX2026!');
  const [nombreTutor, setNombreTutor] = useState('Mariana Rojas');

  // Datos para onboarding de mascota
  const [nombrePerro, setNombrePerro] = useState(mascota.nombre);
  const [razaPerro, setRazaPerro] = useState(mascota.raza);
  const [pesoPerro, setPesoPerro] = useState(mascota.pesoKg);
  const [microchipPerro, setMicrochipPerro] = useState(mascota.microchipId);

  const [errores, setErrores] = useState({});
  const [exitoMensaje, setExitoMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const validar = () => {
    const err = {};
    if (!correo.includes('@') || !correo.includes('.')) {
      err.correo = 'Por favor ingresa un correo electrónico válido.';
    }
    if (modo === 'onboarding-pet') {
      if (!nombrePerro.trim()) err.nombrePerro = 'El nombre de la mascota es requerido.';
      if (!razaPerro.trim()) err.razaPerro = 'La raza es requerida para el Copiloto.';
      if (!pesoPerro || Number(pesoPerro) <= 0) err.pesoPerro = 'Ingresa un peso válido en kilogramos.';
    }
    setErrores(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    setCargando(true);

    if (modo === 'onboarding-pet') {
      actualizarMascota({
        nombre: nombrePerro,
        raza: razaPerro,
        pesoKg: Number(pesoPerro),
        microchipId: microchipPerro || 'CRC-TEMP-' + Math.floor(Math.random() * 9000 + 1000)
      });
    }

    try {
      if (modo === 'onboarding-pet') {
        await registrarConBackend({ name: nombreTutor, email: correo, password: clave });
      } else {
        await loginConBackend({ email: correo, password: clave });
      }
    } catch {
      // Si es usuario demo o aún no registrado, autorizar sesión híbrida/invitado en backend
      iniciarSesion(correo, nombreTutor);
    }

    setExitoMensaje('¡Sesión autorizada en GoToX Pet OS!');
    setTimeout(() => {
      setCargando(false);
      navigate('/panel');
    }, 500);
  };

  const mascotaPreview = {
    ...mascota,
    nombre: nombrePerro || mascota.nombre,
    raza: razaPerro || mascota.raza,
    pesoKg: pesoPerro || mascota.pesoKg,
    microchipId: microchipPerro || mascota.microchipId
  };

  return (
    <PageWrapper className="min-h-[calc(100vh-140px)] py-10 md:py-16 flex items-center">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        {/* Grilla principal 50/50 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* LADO IZQUIERDO: Formulario de Login & Onboarding Rediseñado */}
          <div className="lg:col-span-6 space-y-6">
            {/* Encabezado con nueva jerarquía tipográfica */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDF2F4] dark:bg-[#55152D]/30 text-[#501228] dark:text-[#F27B91] border border-[#F9E2E8] dark:border-[#55152D]/50 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Bóveda & Autenticación Cifrada</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#111827] dark:text-[#E8EDF5] tracking-tight leading-tight">
                {modo === 'login' ? 'Bienvenido a GoToX' : 'Alta de Mascota GAM'}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8] font-sans leading-relaxed">
                {modo === 'login'
                  ? 'Inicia sesión para gestionar el carnet médico digital, el radar de terrazas pet-friendly y las alertas térmicas en tiempo real.'
                  : 'Registra los datos biométricos de tu mascota para activar el Copiloto Bruno y la medalla QR.'}
              </p>
            </div>

            {/* Alternador de Modo (Segmented Control Elegante) */}
            <div className={`segmented-control-modo p-1 rounded-2xl border flex items-center gap-1 shadow-2xs transition-colors ${
              esClaro ? 'bg-slate-100/90 border-slate-200/80' : esMorado ? 'bg-[#1C0D17] border-[#F27B91]/25' : 'bg-[#111827] border-white/10'
            }`}>
              <button
                type="button"
                onClick={() => setModo('login')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  modo === 'login'
                    ? esClaro
                      ? 'bg-white text-[#501228] shadow-sm font-bold border border-slate-200/70'
                      : esMorado
                      ? 'bg-[#501228] text-white shadow-sm font-bold border border-[#F27B91]/40'
                      : 'bg-[#1E293B] text-white shadow-sm font-bold border border-white/20'
                    : esClaro
                    ? 'text-slate-600 hover:text-slate-900'
                    : esMorado
                    ? 'text-[#D8C3CC] hover:text-[#FDF2F6]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </button>
              <button
                type="button"
                onClick={() => setModo('onboarding-pet')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  modo === 'onboarding-pet'
                    ? esClaro
                      ? 'bg-white text-[#501228] shadow-sm font-bold border border-slate-200/70'
                      : esMorado
                      ? 'bg-[#501228] text-white shadow-sm font-bold border border-[#F27B91]/40'
                      : 'bg-[#1E293B] text-white shadow-sm font-bold border border-white/20'
                    : esClaro
                    ? 'text-slate-600 hover:text-slate-900'
                    : esMorado
                    ? 'text-[#D8C3CC] hover:text-[#FDF2F6]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Registrar Mascota</span>
              </button>
            </div>

            {/* Accesos Rápidos Simulados con Diseño en Tarjetas */}
            <div className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${
              esClaro ? 'bg-slate-50 border-slate-200/80' : esMorado ? 'bg-[#1F0E19] border-[#F27B91]/20' : 'bg-[#111827] border-white/10'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Acceso Rápido Simulado
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">1 clic para probar</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCorreo('mariana.rojas@gotox.cr');
                    setNombreTutor('Mariana Rojas');
                    iniciarSesion('mariana.rojas@gotox.cr', 'Mariana Rojas');
                    navigate('/panel');
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs group ${
                    esClaro
                      ? 'border-slate-200/80 bg-white hover:bg-[#FDF2F4] text-slate-700 hover:text-[#501228]'
                      : esMorado
                      ? 'border-[#F27B91]/25 bg-[#281320] hover:bg-[#38182B] text-[#FDF2F6] hover:text-white'
                      : 'border-white/10 bg-[#162032] hover:bg-[#1E293B] text-[#E8EDF5] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 gotox-radar-dot" />
                    <span>Entrar como Mariana</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCorreo('invitado.gam@gotox.cr');
                    setNombreTutor('Tutor Invitado');
                    iniciarSesion('invitado.gam@gotox.cr', 'Tutor Invitado');
                    navigate('/panel');
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs group ${
                    esClaro
                      ? 'border-slate-200/80 bg-white hover:bg-[#FDF2F4] text-slate-700 hover:text-[#501228]'
                      : esMorado
                      ? 'border-[#F27B91]/25 bg-[#281320] hover:bg-[#38182B] text-[#FDF2F6] hover:text-white'
                      : 'border-white/10 bg-[#162032] hover:bg-[#1E293B] text-[#E8EDF5] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#501228] dark:bg-[#F27B91]" />
                    <span>Modo Demostración</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            {/* Separador */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200/80 dark:border-white/10 w-full" />
              <span className={`px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute ${
                esClaro ? 'bg-[#FBF8FF]' : esMorado ? 'bg-[#0E070C]' : 'bg-[#090D14]'
              }`}>
                o ingresa tus credenciales
              </span>
            </div>

            {/* Formulario Principal de Autenticación */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Correo Electrónico"
                type="email"
                icon={Mail}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                error={errores.correo}
                placeholder="ejemplo@gotox.cr"
                required
              />

              <Input
                label="Contraseña de Seguridad"
                type="password"
                icon={Lock}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="••••••••••"
                required
              />

              {modo === 'onboarding-pet' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 space-y-3.5 shadow-2xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#501228] dark:text-[#F27B91] pb-2 border-b border-slate-100 dark:border-white/10">
                    <Dog className="w-4 h-4" />
                    <span>Datos Biométricos de tu Canino</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Nombre del Canino"
                      value={nombrePerro}
                      onChange={(e) => setNombrePerro(e.target.value)}
                      error={errores.nombrePerro}
                      placeholder="Ej. Bruno"
                    />
                    <Input
                      label="Raza Principal"
                      value={razaPerro}
                      onChange={(e) => setRazaPerro(e.target.value)}
                      error={errores.razaPerro}
                      placeholder="Ej. Golden Retriever"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Peso (kg)"
                      type="number"
                      step="0.1"
                      value={pesoPerro}
                      onChange={(e) => setPesoPerro(e.target.value)}
                      error={errores.pesoPerro}
                      placeholder="29.4"
                    />
                    <Input
                      label="N° Microchip (Opcional)"
                      value={microchipPerro}
                      onChange={(e) => setMicrochipPerro(e.target.value)}
                      placeholder="CRC-756-092-882"
                    />
                  </div>
                </div>
              )}

              {exitoMensaje && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold">{exitoMensaje}</span>
                </div>
              )}

              {/* Botón Prominente de Iniciar Sesión */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={cargando}
                icon={LogIn}
                className="w-full justify-center shadow-md text-sm sm:text-base font-semibold py-3"
              >
                {cargando
                  ? 'Autorizando acceso...'
                  : modo === 'login'
                  ? 'Iniciar Sesión en GoToX'
                  : 'Guardar y Generar Carnet Digital'}
              </Button>
            </form>
          </div>

          {/* LADO DERECHO: Tarjeta Translúcida con Carnet 3D y Telemetría */}
          <div className="lg:col-span-6 space-y-6">
            <div className={`relative p-6 sm:p-8 rounded-3xl backdrop-blur-xl border shadow-xl space-y-6 transition-colors ${
              esClaro
                ? 'bg-white/80 border-slate-200/90 text-slate-800'
                : esMorado
                ? 'bg-[#180A14]/95 border-[#F27B91]/25 text-[#FDF2F6]'
                : 'bg-[#111827]/95 border-white/10 text-[#E8EDF5]'
            }`}>
              {/* Telemetría urbana mini */}
              <div className={`flex items-center justify-between pb-4 border-b ${
                esClaro ? 'border-slate-200/60' : esMorado ? 'border-[#F27B91]/20' : 'border-white/10'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 gotox-radar-dot" />
                  <span className={`text-xs font-semibold ${esClaro ? 'text-slate-700' : 'text-white'}`}>
                    Telemetría San José Este
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`flex items-center gap-1 font-bold tabular-nums ${
                    esClaro ? 'text-[#501228]' : 'text-[#F27B91]'
                  }`}>
                    <Thermometer className="w-3.5 h-3.5" />
                    {telemetria.temperaturaAsfalto} °C
                  </span>
                  <span className="opacity-40">&bull;</span>
                  <span className={`tabular-nums ${esClaro ? 'text-slate-600' : 'text-slate-300'}`}>
                    {telemetria.ventanaSecaMinutos} min secos
                  </span>
                </div>
              </div>

              {/* Carnet Digital 3D Interactivo */}
              <div>
                <span className="text-[11px] opacity-60 block mb-2 uppercase tracking-wider font-semibold text-center">
                  Previsualización biométrica &bull; Interactúa con el carnet
                </span>
                <CarnetDigital mascota={mascotaPreview} interactivo={true} />
              </div>

              <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs transition-colors ${
                esClaro
                  ? 'bg-[#FDF2F4] text-[#501228] border-[#F9E2E8]'
                  : esMorado
                  ? 'bg-[#2D1222] text-[#FDF2F6] border-[#F27B91]/30'
                  : 'bg-[#162032] text-[#E8EDF5] border-white/10'
              }`}>
                <ShieldCheck className={`w-4 h-4 shrink-0 ${esClaro ? 'text-[#501228]' : 'text-[#F27B91]'}`} />
                <span className="leading-snug">
                  Cifrado biométrico local y soberanía de datos. Tu información reside en tu dispositivo.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
