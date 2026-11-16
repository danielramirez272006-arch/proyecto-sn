import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarnetDigital } from '../components/CarnetDigital';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { AnimacionCierreSesion } from '../components/AnimacionCierreSesion';
import { ModalConfirmarCierre } from '../components/ModalConfirmarCierre';
import { useSesion } from '../hooks/useSesion';
import { useTelemetria } from '../hooks/useTelemetria';
import {
  Dog,
  Mail,
  Lock,
  User,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Thermometer,
  LogIn,
  UserPlus,
  ArrowRight,
  Shield,
  LogOut
} from 'lucide-react';

export function Acceso() {
  const navigate = useNavigate();
  const { iniciarSesion, cerrarSesion, isLoggedIn, usuario, mascota, actualizarMascota } = useSesion();
  const telemetria = useTelemetria();

  const [modo, setModo] = useState('login'); // 'login' | 'onboarding-pet'
  const [correo, setCorreo] = useState('mariana.rojas@gotox.cr');
  const [clave, setClave] = useState('••••••••••');
  const [nombreTutor, setNombreTutor] = useState('Mariana Rojas');

  // Datos para onboarding de mascota
  const [nombrePerro, setNombrePerro] = useState(mascota.nombre);
  const [razaPerro, setRazaPerro] = useState(mascota.raza);
  const [pesoPerro, setPesoPerro] = useState(mascota.pesoKg);
  const [microchipPerro, setMicrochipPerro] = useState(mascota.microchipId);

  const [errores, setErrores] = useState({});
  const [exitoMensaje, setExitoMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);

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
    setModo('login');
    setExitoMensaje('Has cerrado sesión correctamente. Ingresa tus credenciales para continuar.');
  };

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

  const handleSubmit = (e) => {
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

    iniciarSesion(correo, nombreTutor);
    setExitoMensaje('¡Sesión autorizada en GoToX Pet OS!');
    setTimeout(() => {
      setCargando(false);
      navigate('/panel');
    }, 600);
  };

  const mascotaPreview = {
    ...mascota,
    nombre: nombrePerro || mascota.nombre,
    raza: razaPerro || mascota.raza,
    pesoKg: pesoPerro || mascota.pesoKg,
    microchipId: microchipPerro || mascota.microchipId
  };

  return (
    <div className="w-full min-h-[calc(100vh-140px)] py-10 md:py-16 flex items-center">
      {/* Modal de Advertencia antes de cerrar sesión */}
      <ModalConfirmarCierre
        isOpen={modalConfirmacionAbierto}
        onClose={() => setModalConfirmacionAbierto(false)}
        onConfirmar={handleConfirmarSalida}
        nombreUsuario={usuario?.nombre}
      />

      {/* Animación fluida de cierre de sesión */}
      <AnimacionCierreSesion
        visible={animandoSalida}
        nombreUsuario={usuario?.nombre}
        onCompletado={handleCompletarSalida}
      />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        {/* Grilla principal 50/50 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* LADO IZQUIERDO: Formulario de Login & Onboarding Rediseñado */}
          <div className="lg:col-span-6 space-y-6">
            {/* Encabezado con nueva jerarquía tipográfica */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDF2F4] text-[#501228] border border-[#F9E2E8] text-xs font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Bóveda & Autenticación Cifrada</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#111827] tracking-tight leading-tight">
                {modo === 'login' ? 'Bienvenido a GoToX' : 'Alta de Mascota GAM'}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 font-sans leading-relaxed">
                {modo === 'login'
                  ? 'Inicia sesión para gestionar el carnet médico digital, el radar de terrazas pet-friendly y las alertas térmicas en tiempo real.'
                  : 'Registra los datos biométricos de tu mascota para activar el Copiloto Bruno y la medalla QR.'}
              </p>
            </div>

            {/* Banner de Sesión Activa con botón para Cerrar Sesión */}
            {isLoggedIn && (
              <div className="banner-sesion-activa p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-[#FDF2F4] border border-emerald-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#501228] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                    {usuario?.nombre?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="titulo-banner text-xs font-bold text-[#111827]">Sesión activa en este navegador</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <p className="subtexto-banner text-xs text-slate-600">
                      Conectado como <strong>{usuario?.nombre}</strong> ({usuario?.correo})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate('/panel')}
                    className="flex-1 sm:flex-none text-xs"
                  >
                    Ir al Panel
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={LogOut}
                    onClick={handleSolicitarCierre}
                    className="btn-cerrar-sesion flex-1 sm:flex-none text-xs"
                  >
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            )}

            {/* Alternador de Modo (Segmented Control Elegante) */}
            <div className="segmented-control-modo p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 flex items-center gap-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setModo('login')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                  modo === 'login'
                    ? 'segmented-tab-activa bg-white text-[#501228] shadow-sm font-bold'
                    : 'segmented-tab-inactiva text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </button>
              <button
                type="button"
                onClick={() => setModo('onboarding-pet')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                  modo === 'onboarding-pet'
                    ? 'segmented-tab-activa bg-white text-[#501228] shadow-sm font-bold'
                    : 'segmented-tab-inactiva text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Registrar Mascota</span>
              </button>
            </div>

            {/* Accesos Rápidos Simulados con Diseño en Tarjetas */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Acceso Rápido Simulado
                </span>
                <span className="text-[11px] text-slate-400">1 clic para probar</span>
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
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-[#FDF2F4] text-xs font-semibold text-slate-700 hover:text-[#501228] transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 gotox-radar-dot" />
                    <span>Entrar como Mariana</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#501228] transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCorreo('invitado.gam@gotox.cr');
                    setNombreTutor('Tutor Invitado');
                    iniciarSesion('invitado.gam@gotox.cr', 'Tutor Invitado');
                    navigate('/panel');
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-[#FDF2F4] text-xs font-semibold text-slate-700 hover:text-[#501228] transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#501228]" />
                    <span>Modo Demostración</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#501228] transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            {/* Separador */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200/80 w-full" />
              <span className="bg-[#FAF9FE] px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
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
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3.5 shadow-2xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#501228] pb-2 border-b border-slate-100">
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
                <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
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
            <div className="relative p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/90 shadow-xl space-y-6">
              {/* Telemetría urbana mini */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 gotox-radar-dot" />
                  <span className="text-xs font-semibold text-slate-700">Telemetría San José Este</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-[#501228] font-bold tabular-nums">
                    <Thermometer className="w-3.5 h-3.5" />
                    {telemetria.temperaturaAsfalto} °C
                  </span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="text-slate-600 tabular-nums">{telemetria.ventanaSecaMinutos} min secos</span>
                </div>
              </div>

              {/* Carnet Digital 3D Interactivo */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-2 uppercase tracking-wider font-semibold text-center">
                  Previsualización biométrica &bull; Interactúa con el carnet
                </span>
                <CarnetDigital mascota={mascotaPreview} interactivo={true} />
              </div>

              <div className="p-3 bg-[#FDF2F4] rounded-xl border border-[#F9E2E8] flex items-center gap-2.5 text-xs text-[#501228]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="leading-snug">
                  Cifrado biométrico local y soberanía de datos. Tu información reside en tu dispositivo.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
