import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarnetDigital } from '../components/CarnetDigital';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { useSesion } from '../hooks/useSesion';
import { useTelemetria } from '../hooks/useTelemetria';
import { Dog, Mail, Lock, User, Sparkles, CheckCircle2, ShieldCheck, Thermometer } from 'lucide-react';

export function Acceso() {
  const navigate = useNavigate();
  const { iniciarSesion, mascota, actualizarMascota } = useSesion();
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
      navigate('/perfil');
    }, 800);
  };

  const mascotaPreview = {
    ...mascota,
    nombre: nombrePerro || mascota.nombre,
    raza: razaPerro || mascota.raza,
    pesoKg: pesoPerro || mascota.pesoKg,
    microchipId: microchipPerro || mascota.microchipId
  };

  return (
    <div className="w-full min-h-[calc(100vh-160px)] py-8 md:py-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* Split Screen 50/50 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Lado Izquierdo: Formulario de Autenticación y Onboarding */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <Badge variant="burdeos">Acceso a la Bóveda</Badge>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#111827]">
                {modo === 'login' ? 'Bienvenido a GoToX Pet OS' : 'Registro de Mascota en el GAM'}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {modo === 'login'
                  ? 'Gestiona el carnet médico de tu perro, el radar de terrazas y las alertas térmicas en tiempo real.'
                  : 'Registra los datos biométricos para activar el Copiloto Bruno y la medalla QR.'}
              </p>
            </div>

            {/* Alternador de Modo */}
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 max-w-sm">
              <button
                type="button"
                onClick={() => setModo('login')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  modo === 'login' ? 'bg-white text-[#501228] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => setModo('onboarding-pet')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  modo === 'onboarding-pet' ? 'bg-white text-[#501228] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Alta de Mascota
              </button>
            </div>

            {/* Opciones SSO Simuladas */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Acceso Rápido Simulado
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCorreo('mariana.rojas@gotox.cr');
                    setNombreTutor('Mariana Rojas');
                    iniciarSesion('mariana.rojas@gotox.cr', 'Mariana Rojas');
                    navigate('/panel');
                  }}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Entrar como Mariana</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCorreo('invitado.gam@gotox.cr');
                    setNombreTutor('Tutor Invitado');
                    iniciarSesion('invitado.gam@gotox.cr', 'Tutor Invitado');
                    navigate('/panel');
                  }}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
                >
                  <span className="w-2 h-2 rounded-full bg-[#501228]" />
                  <span>Modo Demostración</span>
                </button>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-[#FBF8FF] px-3 text-xs text-slate-400 absolute uppercase tracking-wider">o con credenciales</span>
            </div>

            {/* Formulario Controlado */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Correo Electrónico"
                type="email"
                icon={Mail}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                error={errores.correo}
                placeholder="ejemplo@gotox.cr"
              />

              <Input
                label="Contraseña de Seguridad"
                type="password"
                icon={Lock}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="••••••••••"
              />

              {modo === 'onboarding-pet' && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#501228] pb-1 border-b border-slate-100">
                    <Dog className="w-4 h-4" />
                    <span>Datos Biométricos de tu Canino</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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

                  <div className="grid grid-cols-2 gap-3">
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
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{exitoMensaje}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center"
              >
                {modo === 'login' ? 'Ingresar a mi Cuenta' : 'Guardar y Generar Carnet Digital'}
              </Button>
            </form>
          </div>

          {/* Lado Derecho: Tarjeta Translúcida con Telemetría y Carnet 3D */}
          <div className="lg:col-span-6 space-y-6">
            <div className="relative p-6 sm:p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/80 shadow-xl space-y-6">
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
                  Previsualización en tiempo real &bull; Pasa el cursor para inclinar
                </span>
                <CarnetDigital mascota={mascotaPreview} interactivo={true} />
              </div>

              <div className="p-3 bg-[#FDF2F4] rounded-xl border border-[#F9E2E8] flex items-center gap-2 text-xs text-[#501228]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Cifrado biométrico local. Los datos se almacenan exclusivamente en tu dispositivo.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

