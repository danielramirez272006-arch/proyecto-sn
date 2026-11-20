import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CarnetDigital } from '../components/CarnetDigital';
import { SelectorFotoMascota } from '../components/SelectorFotoMascota';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/PageWrapper';
import { useSesion } from '../hooks/useSesion';
import { useTelemetria } from '../hooks/useTelemetria';
import { useTema } from '../context/TemaContext';
import { authService } from '../shared/services/auth-service';
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
  Shield,
  User,
  Phone,
  MapPin,
  AlertTriangle,
  KeyRound,
  ArrowLeft
} from 'lucide-react';

export function Acceso() {
  const navigate = useNavigate();
  const location = useLocation();
  const rutaDestino = location.state?.from || null;
  const moduloSolicitado = location.state?.modulo || null;
  const { loginConBackend, registrarConBackend, mascota } = useSesion();
  const telemetria = useTelemetria();
  const { esClaro, esMorado } = useTema();

  const [modo, setModo] = useState('login'); // 'login' | 'registro' | 'recuperar'

  // Estado de Inicio de Sesión
  const [correoLogin, setCorreoLogin] = useState('');
  const [claveLogin, setClaveLogin] = useState('');

  // Estado de Recuperación de Contraseña
  const [pasoRecuperacion, setPasoRecuperacion] = useState(1); // 1: solicitar código | 2: ingresar código y nueva clave
  const [correoRecuperar, setCorreoRecuperar] = useState('');
  const [codigoRecuperar, setCodigoRecuperar] = useState('');
  const [nuevaClaveRecuperar, setNuevaClaveRecuperar] = useState('');
  const [confirmarClaveRecuperar, setConfirmarClaveRecuperar] = useState('');

  // Estado de Registrar Usuario (arriba)
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [correoRegistro, setCorreoRegistro] = useState('');
  const [claveRegistro, setClaveRegistro] = useState('');
  const [telefonoRegistro, setTelefonoRegistro] = useState('');
  const [ubicacionRegistro, setUbicacionRegistro] = useState('San José, Costa Rica');
  const [aceptaTerminosPrivacidad, setAceptaTerminosPrivacidad] = useState(false);

  // Estado de Información de Mascota (abajo de usuario)
  const [incluirMascota, setIncluirMascota] = useState(true);
  const [nombrePerro, setNombrePerro] = useState('');
  const [razaPerro, setRazaPerro] = useState('');
  const [pesoPerro, setPesoPerro] = useState('');
  const [microchipPerro, setMicrochipPerro] = useState('');
  const [fotoPerro, setFotoPerro] = useState(null);

  const [errores, setErrores] = useState({});
  const [errorBackend, setErrorBackend] = useState('');
  const [exitoMensaje, setExitoMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const redirigirSegunRol = (role) => {
    if (role === 'admin') {
      const destinoAdmin = rutaDestino && rutaDestino !== '/acceso' ? rutaDestino : '/panel';
      navigate(destinoAdmin, { replace: true });
      return;
    }

    const destinoUsuario =
      rutaDestino && rutaDestino !== '/panel' && rutaDestino !== '/acceso'
        ? rutaDestino
        : '/usuario';
    navigate(destinoUsuario, { replace: true });
  };

  const validarLogin = () => {
    const err = {};
    if (!correoLogin.includes('@') || !correoLogin.includes('.')) {
      err.correoLogin = 'Por favor ingresa un correo electrónico válido.';
    }
    if (!claveLogin || claveLogin.length < 4) {
      err.claveLogin = 'Ingresa tu contraseña.';
    }
    setErrores(err);
    return Object.keys(err).length === 0;
  };

  const validarRegistro = () => {
    const err = {};
    if (!nombreUsuario.trim()) {
      err.nombreUsuario = 'Tu nombre completo es requerido.';
    }
    if (!correoRegistro.includes('@') || !correoRegistro.includes('.')) {
      err.correoRegistro = 'Por favor ingresa un correo electrónico válido.';
    }
    if (!claveRegistro || claveRegistro.length < 6) {
      err.claveRegistro = 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (incluirMascota) {
      if (!nombrePerro.trim()) err.nombrePerro = 'El nombre de tu mascota es requerido (o desmarca la opción).';
      if (!razaPerro.trim()) err.razaPerro = 'La raza o especie es requerida.';
      if (pesoPerro && Number(pesoPerro) <= 0) err.pesoPerro = 'Ingresa un peso válido en kilogramos.';
    }
    if (!aceptaTerminosPrivacidad) {
      err.aceptaTerminosPrivacidad =
        'Debes aceptar explícitamente los Términos y Condiciones y la Política de Privacidad (Ley N.º 8968 CR).';
    }
    setErrores(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorBackend('');
    setExitoMensaje('');

    if (modo === 'recuperar') {
      if (pasoRecuperacion === 1) {
        if (!correoRecuperar.includes('@') || !correoRecuperar.includes('.')) {
          setErrores({ correoRecuperar: 'Ingresa el correo electrónico de tu cuenta.' });
          return;
        }
        setErrores({});
        setCargando(true);
        try {
          const res = await authService.forgotPassword({ email: correoRecuperar.trim() });
          setExitoMensaje(res.message);
          if (res.demoToken) {
            setCodigoRecuperar(res.demoToken);
          }
          setPasoRecuperacion(2);
        } catch (err) {
          setErrorBackend(err?.message || 'No se pudo procesar la solicitud de recuperación.');
        } finally {
          setCargando(false);
        }
        return;
      }

      // Paso 2: validar código y nueva contraseña
      const errRec = {};
      if (!codigoRecuperar.trim()) errRec.codigoRecuperar = 'Ingresa el código de verificación recibido.';
      if (!nuevaClaveRecuperar || nuevaClaveRecuperar.length < 6) {
        errRec.nuevaClaveRecuperar = 'La nueva contraseña debe tener al menos 6 caracteres.';
      }
      if (nuevaClaveRecuperar !== confirmarClaveRecuperar) {
        errRec.confirmarClaveRecuperar = 'Las contraseñas no coinciden.';
      }
      if (Object.keys(errRec).length > 0) {
        setErrores(errRec);
        return;
      }
      setErrores({});
      setCargando(true);
      try {
        const res = await authService.resetPassword({
          email: correoRecuperar.trim(),
          token: codigoRecuperar.trim(),
          newPassword: nuevaClaveRecuperar
        });
        setExitoMensaje(res.message);
        setCorreoLogin(correoRecuperar.trim());
        setTimeout(() => {
          setModo('login');
          setPasoRecuperacion(1);
          setNuevaClaveRecuperar('');
          setConfirmarClaveRecuperar('');
        }, 1100);
      } catch (err) {
        setErrorBackend(err?.message || 'No se pudo restablecer la contraseña.');
      } finally {
        setCargando(false);
      }
      return;
    }

    if (modo === 'login') {
      if (!validarLogin()) return;
      setCargando(true);
      try {
        const data = await loginConBackend({
          email: correoLogin.trim(),
          password: claveLogin
        });
        const rol = data?.user?.role || 'client';
        setExitoMensaje(
          rol === 'admin'
            ? 'Acceso de Administrador Exclusivo verificado. Abriendo Panel...'
            : '¡Sesión de usuario iniciada! Cargando tu página personal...'
        );
        setTimeout(() => {
          setCargando(false);
          redirigirSegunRol(rol);
        }, 400);
      } catch (err) {
        setCargando(false);
        setErrorBackend(
          err?.message || 'No se pudo iniciar sesión. Verifica tus credenciales y que el backend esté activo.'
        );
      }
      return;
    }

    // Modo Registrar Usuario (+ info mascota opcional abajo)
    if (!validarRegistro()) return;
    setCargando(true);
    try {
      const petPayload = incluirMascota
        ? {
            nombre: nombrePerro.trim(),
            especie: 'Canino',
            raza: razaPerro.trim() || 'Mestizo',
            pesoKg: pesoPerro ? Number(pesoPerro) : 15,
            microchipId: microchipPerro.trim() || '',
            foto: fotoPerro
          }
        : null;

      const data = await registrarConBackend({
        name: nombreUsuario.trim(),
        email: correoRegistro.trim(),
        password: claveRegistro,
        phone: telefonoRegistro.trim() || null,
        zone: ubicacionRegistro.trim() || 'San José, Costa Rica',
        hasPet: incluirMascota,
        pet: petPayload,
        acceptTerms: true,
        acceptPrivacy: true,
        termsVersion: '2026.11-CR-8968'
      });

      setExitoMensaje('¡Cuenta de usuario creada exitosamente! Redirigiendo a tu espacio...');
      setTimeout(() => {
        setCargando(false);
        redirigirSegunRol(data?.user?.role || 'client');
      }, 450);
    } catch (err) {
      setCargando(false);
      setErrorBackend(
        err?.message || 'No se pudo crear la cuenta. Verifica que el correo no esté registrado y el backend esté conectado.'
      );
    }
  };

  const handleDemoUsuario = async (emailDemo, passwordDemo) => {
    setErrorBackend('');
    setExitoMensaje('');
    setCargando(true);
    try {
      const data = await loginConBackend({ email: emailDemo, password: passwordDemo });
      setExitoMensaje('Sesión demo de usuario conectada al backend.');
      setTimeout(() => {
        setCargando(false);
        redirigirSegunRol(data?.user?.role || 'client');
      }, 350);
    } catch (err) {
      setCargando(false);
      setErrorBackend(
        err?.message || 'No se pudo conectar con el servidor backend para la cuenta demo.'
      );
    }
  };

  const mascotaPreview =
    modo === 'registro'
      ? {
          ...mascota,
          nombre: incluirMascota ? nombrePerro || 'Tu Mascota' : 'Explorador Sin Mascota',
          raza: incluirMascota ? razaPerro || 'Raza / Especie' : 'Perfil Personal',
          pesoKg: incluirMascota && pesoPerro ? Number(pesoPerro) : 15,
          microchipId: microchipPerro || 'CRC-PENDIENTE',
          foto: incluirMascota ? fotoPerro : null,
          tutor: {
            ...mascota.tutor,
            nombre: nombreUsuario || 'Nuevo Usuario Synodos',
            correo: correoRegistro || 'usuario@synodos.cr',
            telefono: telefonoRegistro || '+506 0000-0000'
          }
        }
      : {
          ...mascota,
          nombre: mascota?.nombre && mascota.nombre !== 'Sin mascota registrada' ? mascota.nombre : 'Bruno',
          raza: mascota?.raza && mascota.raza !== 'Sin especificar' ? mascota.raza : 'Golden Retriever',
          pesoKg: mascota?.pesoKg > 0 ? mascota.pesoKg : 29.4,
          microchipId: mascota?.microchipId || 'CRC-756-092-882',
          tutor: {
            ...mascota.tutor,
            nombre: correoLogin || 'Usuario Synodos'
          }
        };

  return (
    <PageWrapper className="min-h-[calc(100vh-140px)] py-10 md:py-16 flex items-center">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          {/* LADO IZQUIERDO: Login & Registrar Usuario */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDF2F4] dark:bg-[#55152D]/30 text-[#501228] dark:text-[#F27B91] border border-[#F9E2E8] dark:border-[#55152D]/50 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Autenticación Conectada al Backend</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#111827] dark:text-[#E8EDF5] tracking-tight leading-tight">
                {modo === 'login' ? 'Bienvenido a Synodos' : 'Registrar Usuario en Synodos'}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8] font-sans leading-relaxed">
                {modo === 'login'
                  ? 'Inicia sesión para entrar a tu página personal de usuario o accede con una cuenta administrativa exclusiva.'
                  : 'Crea tu cuenta de usuario en Synodos (Σύνοδος) y, si tienes mascota, agrega su información debajo.'}
              </p>
              {moduloSolicitado && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    esClaro
                      ? 'bg-[#FDF2F4] border-[#F9E2E8] text-[#501228]'
                      : 'bg-[#55152D]/30 border-[#F27B91]/30 text-[#F27B91]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Inicia sesión para acceder a <strong>{moduloSolicitado}</strong>.
                  </span>
                </div>
              )}
            </div>

            {/* Alternador de Modo: Iniciar Sesión | Registrar Usuario */}
            <div
              className={`segmented-control-modo p-1 rounded-2xl border flex items-center gap-1 shadow-2xs transition-colors ${
                esClaro
                  ? 'bg-slate-100/90 border-slate-200/80'
                  : esMorado
                  ? 'bg-[#1C0D17] border-[#F27B91]/25'
                  : 'bg-[#111827] border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setModo('login');
                  setErrores({});
                  setErrorBackend('');
                }}
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
                onClick={() => {
                  setModo('registro');
                  setErrores({});
                  setErrorBackend('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  modo === 'registro'
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
                <span>Registrar Usuario</span>
              </button>
            </div>

            {/* Acceso Rápido de Usuario Demo (solo usuarios normales, nunca admin) */}
            {modo === 'login' && (
              <div
                className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${
                  esClaro
                    ? 'bg-slate-50 border-slate-200/80'
                    : esMorado
                    ? 'bg-[#1F0E19] border-[#F27B91]/20'
                    : 'bg-[#111827] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Prueba Rápida de Usuario Normal
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Conectado a Express API</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={cargando}
                    onClick={() => handleDemoUsuario('mariana.rojas@gotox.cr', 'GoToX2026!')}
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
                      <span>Usuario Demo (Mariana)</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    disabled={cargando}
                    onClick={() => handleDemoUsuario('carlos@ejemplo.cr', 'Cliente2026!')}
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
                      <span>Usuario Demo (Carlos)</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Las cuentas exclusivas de administrador se autentican directamente abajo con sus credenciales autorizadas.
                </p>
              </div>
            )}

            {/* Separador */}
            {modo === 'login' && (
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200/80 dark:border-white/10 w-full" />
                <span
                  className={`px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute ${
                    esClaro ? 'bg-[#FBF8FF]' : esMorado ? 'bg-[#0E070C]' : 'bg-[#090D14]'
                  }`}
                >
                  o ingresa tus credenciales
                </span>
              </div>
            )}

            {/* Formulario Principal */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {modo === 'recuperar' ? (
                <div
                  className={`p-4 sm:p-5 rounded-2xl border space-y-4 shadow-2xs ${
                    esClaro
                      ? 'bg-white border-slate-200/80'
                      : esMorado
                      ? 'bg-[#180A14] border-[#F27B91]/20'
                      : 'bg-[#111827] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#501228] dark:text-[#F27B91]">
                      <KeyRound className="w-4 h-4" />
                      <span>
                        {pasoRecuperacion === 1
                          ? 'Recuperación de Contraseña (Paso 1 de 2)'
                          : 'Restablecer Contraseña (Paso 2 de 2)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModo('login');
                        setPasoRecuperacion(1);
                        setErrores({});
                        setErrorBackend('');
                        setExitoMensaje('');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#501228] dark:hover:text-white"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Volver al login</span>
                    </button>
                  </div>

                  {pasoRecuperacion === 1 ? (
                    <>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Ingresa el correo electrónico asociado a tu cuenta de Synodos. Te enviaremos un código temporal de verificación para que definas una nueva contraseña.
                      </p>
                      <Input
                        label="Correo Electrónico Registrado"
                        type="email"
                        icon={Mail}
                        value={correoRecuperar}
                        onChange={(e) => setCorreoRecuperar(e.target.value)}
                        error={errores.correoRecuperar}
                        placeholder="tu@correo.cr"
                        required
                      />
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Ingresa el código de verificación enviado a <strong>{correoRecuperar}</strong> y define tu nueva contraseña de seguridad.
                      </p>
                      <Input
                        label="Código de Verificación"
                        icon={KeyRound}
                        value={codigoRecuperar}
                        onChange={(e) => setCodigoRecuperar(e.target.value)}
                        error={errores.codigoRecuperar}
                        placeholder="Ej. SYN-8968-2026"
                        required
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Nueva Contraseña (mín. 6 caracteres)"
                          type="password"
                          icon={Lock}
                          value={nuevaClaveRecuperar}
                          onChange={(e) => setNuevaClaveRecuperar(e.target.value)}
                          error={errores.nuevaClaveRecuperar}
                          placeholder="••••••••••"
                          required
                        />
                        <Input
                          label="Confirmar Nueva Contraseña"
                          type="password"
                          icon={Lock}
                          value={confirmarClaveRecuperar}
                          onChange={(e) => setConfirmarClaveRecuperar(e.target.value)}
                          error={errores.confirmarClaveRecuperar}
                          placeholder="••••••••••"
                          required
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : modo === 'login' ? (
                <>
                  <Input
                    label="Correo Electrónico"
                    type="email"
                    icon={Mail}
                    value={correoLogin}
                    onChange={(e) => setCorreoLogin(e.target.value)}
                    error={errores.correoLogin}
                    placeholder="ejemplo@gotox.cr"
                    required
                  />

                  <div className="space-y-1.5">
                    <Input
                      label="Contraseña de Seguridad"
                      type="password"
                      icon={Lock}
                      value={claveLogin}
                      onChange={(e) => setClaveLogin(e.target.value)}
                      error={errores.claveLogin}
                      placeholder="••••••••••"
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setModo('recuperar');
                          setPasoRecuperacion(1);
                          setCorreoRecuperar(correoLogin || '');
                          setErrores({});
                          setErrorBackend('');
                          setExitoMensaje('');
                        }}
                        className="text-xs font-semibold text-[#501228] dark:text-[#F27B91] hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* SECCIÓN 1 (ARRIBA): INFORMACIÓN DEL USUARIO */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 shadow-2xs ${
                      esClaro
                        ? 'bg-white border-slate-200/80'
                        : esMorado
                        ? 'bg-[#180A14] border-[#F27B91]/20'
                        : 'bg-[#111827] border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-[#501228] dark:text-[#F27B91] pb-2 border-b border-slate-100 dark:border-white/10">
                      <User className="w-4 h-4" />
                      <span>1. Datos del Usuario</span>
                    </div>

                    <Input
                      label="Nombre Completo"
                      icon={User}
                      value={nombreUsuario}
                      onChange={(e) => setNombreUsuario(e.target.value)}
                      error={errores.nombreUsuario}
                      placeholder="Ej. Laura Jiménez"
                      required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Correo Electrónico"
                        type="email"
                        icon={Mail}
                        value={correoRegistro}
                        onChange={(e) => setCorreoRegistro(e.target.value)}
                        error={errores.correoRegistro}
                        placeholder="tu@correo.cr"
                        required
                      />
                      <Input
                        label="Contraseña (mín. 6 caracteres)"
                        type="password"
                        icon={Lock}
                        value={claveRegistro}
                        onChange={(e) => setClaveRegistro(e.target.value)}
                        error={errores.claveRegistro}
                        placeholder="••••••••••"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Teléfono (Opcional)"
                        icon={Phone}
                        value={telefonoRegistro}
                        onChange={(e) => setTelefonoRegistro(e.target.value)}
                        placeholder="+506 8800-0000"
                      />
                      <Input
                        label="Zona / Cantón GAM (Opcional)"
                        icon={MapPin}
                        value={ubicacionRegistro}
                        onChange={(e) => setUbicacionRegistro(e.target.value)}
                        placeholder="Barrio Escalante, San José"
                      />
                    </div>
                  </div>

                  {/* SECCIÓN 2 (ABAJO DEL USUARIO): INFORMACIÓN DE LA MASCOTA */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 shadow-2xs ${
                      esClaro
                        ? 'bg-white border-slate-200/80'
                        : esMorado
                        ? 'bg-[#180A14] border-[#F27B91]/20'
                        : 'bg-[#111827] border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#501228] dark:text-[#F27B91]">
                        <Dog className="w-4 h-4" />
                        <span>2. Información de la Mascota (Opcional)</span>
                      </div>

                      <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={incluirMascota}
                          onChange={(e) => setIncluirMascota(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#501228]"
                        />
                        <span>Tengo mascota</span>
                      </label>
                    </div>

                    {incluirMascota ? (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            label="Nombre de la Mascota"
                            value={nombrePerro}
                            onChange={(e) => setNombrePerro(e.target.value)}
                            error={errores.nombrePerro}
                            placeholder="Ej. Max"
                          />
                          <Input
                            label="Raza / Especie"
                            value={razaPerro}
                            onChange={(e) => setRazaPerro(e.target.value)}
                            error={errores.razaPerro}
                            placeholder="Ej. Beagle o Mestizo"
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
                            placeholder="14.5"
                          />
                          <Input
                            label="N° Microchip (Opcional)"
                            value={microchipPerro}
                            onChange={(e) => setMicrochipPerro(e.target.value)}
                            placeholder="CRC-756-000-001"
                          />
                        </div>

                        <SelectorFotoMascota
                          valor={fotoPerro}
                          onChange={setFotoPerro}
                          nombreMascota={nombrePerro || 'tu perro'}
                          razaActual={razaPerro}
                          onSeleccionarPerfilRaza={({ raza, pesoKg, foto }) => {
                            if (raza) setRazaPerro(raza);
                            if (pesoKg) setPesoPerro(String(pesoKg));
                            if (foto) setFotoPerro(foto);
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Puedes crear tu cuenta sin mascota para explorar lugares, guardar favoritos y armar planes. Si más adelante adoptas o decides registrarla, podrás hacerlo desde tu página de usuario.
                      </p>
                    )}
                  </div>

                  {/* SECCIÓN 3: CONSENTIMIENTO INFORMADO OBLIGATORIO (LEY N.º 8968 CR) */}
                  <div
                    className={`p-4 rounded-2xl border space-y-2 ${
                      errores.aceptaTerminosPrivacidad
                        ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/30'
                        : esClaro
                        ? 'bg-slate-50 border-slate-200/80'
                        : esMorado
                        ? 'bg-[#180A14] border-[#F27B91]/25'
                        : 'bg-[#111827] border-white/10'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={aceptaTerminosPrivacidad}
                        onChange={(e) => {
                          setAceptaTerminosPrivacidad(e.target.checked);
                          if (e.target.checked && errores.aceptaTerminosPrivacidad) {
                            setErrores((prev) => ({ ...prev, aceptaTerminosPrivacidad: undefined }));
                          }
                        }}
                        className="mt-0.5 w-4 h-4 rounded accent-[#501228] shrink-0"
                      />
                      <span className="leading-relaxed text-slate-700 dark:text-slate-200">
                        He leído y acepto explícitamente los{' '}
                        <a
                          href="/terminos"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate('/terminos');
                          }}
                          className="font-bold underline text-[#501228] dark:text-[#F27B91]"
                        >
                          Términos y Condiciones de Uso y la Política de Privacidad (Ley N.º 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales)
                        </a>
                        , incluyendo el tratamiento de datos para funciones del sistema y agentes de IA.
                      </span>
                    </label>
                    {errores.aceptaTerminosPrivacidad && (
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pl-6">
                        {errores.aceptaTerminosPrivacidad}
                      </p>
                    )}
                  </div>
                </>
              )}

              {errorBackend && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 rounded-xl border border-rose-200 dark:border-rose-800/60 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorBackend}</span>
                </div>
              )}

              {exitoMensaje && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold">{exitoMensaje}</span>
                </div>
              )}

              {modo !== 'registro' && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Al continuar, confirmas que conoces nuestros{' '}
                  <a
                    href="/terminos"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/terminos');
                    }}
                    className="font-semibold underline text-[#501228] dark:text-[#F27B91]"
                  >
                    Términos, Condiciones y Política de Privacidad (Ley N° 8968 CR)
                  </a>
                  .
                </p>
              )}

              {/* Botón Prominente de Acción */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={cargando}
                icon={modo === 'recuperar' ? KeyRound : modo === 'login' ? LogIn : UserPlus}
                className="w-full justify-center shadow-md text-sm sm:text-base font-semibold py-3"
              >
                {cargando
                  ? 'Procesando solicitud en Synodos...'
                  : modo === 'recuperar'
                  ? pasoRecuperacion === 1
                    ? 'Enviar Código de Recuperación'
                    : 'Restablecer Contraseña'
                  : modo === 'login'
                  ? 'Iniciar Sesión en Synodos'
                  : 'Crear Cuenta de Usuario'}
              </Button>
            </form>
          </div>

          {/* LADO DERECHO: Tarjeta Translúcida con Carnet 3D y Telemetría */}
          <div className="lg:col-span-6 space-y-6">
            <div
              className={`relative p-6 sm:p-8 rounded-3xl backdrop-blur-xl border shadow-xl space-y-6 transition-colors ${
                esClaro
                  ? 'bg-white/80 border-slate-200/90 text-slate-800'
                  : esMorado
                  ? 'bg-[#180A14]/95 border-[#F27B91]/25 text-[#FDF2F6]'
                  : 'bg-[#111827]/95 border-white/10 text-[#E8EDF5]'
              }`}
            >
              <div
                className={`flex items-center justify-between pb-4 border-b ${
                  esClaro ? 'border-slate-200/60' : esMorado ? 'border-[#F27B91]/20' : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 gotox-radar-dot" />
                  <span className={`text-xs font-semibold ${esClaro ? 'text-slate-700' : 'text-white'}`}>
                    Telemetría San José Este
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span
                    className={`flex items-center gap-1 font-bold tabular-nums ${
                      esClaro ? 'text-[#501228]' : 'text-[#F27B91]'
                    }`}
                  >
                    <Thermometer className="w-3.5 h-3.5" />
                    {telemetria.temperaturaAsfalto} °C
                  </span>
                  <span className="opacity-40">&bull;</span>
                  <span className={`tabular-nums ${esClaro ? 'text-slate-600' : 'text-slate-300'}`}>
                    {telemetria.ventanaSecaMinutos} min secos
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] opacity-60 block mb-2 uppercase tracking-wider font-semibold text-center">
                  Previsualización de cuenta y bóveda &bull; Carnet interactivo
                </span>
                <CarnetDigital mascota={mascotaPreview} interactivo={true} />
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs transition-colors ${
                  esClaro
                    ? 'bg-[#FDF2F4] text-[#501228] border-[#F9E2E8]'
                    : esMorado
                    ? 'bg-[#2D1222] text-[#FDF2F6] border-[#F27B91]/30'
                    : 'bg-[#162032] text-[#E8EDF5] border-white/10'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 shrink-0 ${esClaro ? 'text-[#501228]' : 'text-[#F27B91]'}`} />
                <span className="leading-snug">
                  Tus credenciales y permisos se verifican contra el servidor mediante JWT con separación estricta entre cuentas de usuario y administradores exclusivos.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
export default Acceso;
