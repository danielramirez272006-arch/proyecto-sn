import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { MASCOTA_ACTIVA_DEFECTO } from '../data/mascota';
import { authService } from '../shared/services/auth-service';
import { api } from '../shared/services/api-client';

const CLAVE_STORAGE = 'gotox_sesion_activa';

const SESION_DEFECTO = {
  isLoggedIn: false,
  usuario: {
    id: null,
    nombre: '',
    correo: '',
    role: 'client',
    telefono: '',
    ubicacion: 'San José, Costa Rica',
    tieneMascota: false
  },
  mascota: {
    ...MASCOTA_ACTIVA_DEFECTO,
    nombre: 'Sin mascota registrada',
    raza: 'Sin especificar',
    pesoKg: 0,
    microchipId: '',
    foto: null,
    photoUrl: null,
    tutor: {
      ...MASCOTA_ACTIVA_DEFECTO.tutor,
      nombre: '',
      correo: '',
      telefono: ''
    }
  },
  boveda: {
    budget_level: 'medio',
    interests: ['Cafeterías de especialidad', 'Terrazas al aire libre'],
    preferences: {
      notificacionesLluvia: true,
      notificacionesAcusticas: true,
      notificacionesEventos: false,
      compartirUbicacion: true
    }
  },
  ajustes: {
    alertasAsfaltoCaliente: true,
    umbralTemperaturaAsfalto: 28,
    notificarAforoTerrazas: true,
    modoAhorroBateriaCollar: false,
    alertaDecibeliosMax: 65
  }
};

function construirMascotaParaUsuario(petData, user) {
  const baseTutor = {
    ...MASCOTA_ACTIVA_DEFECTO.tutor,
    nombre: user?.name || user?.nombre || 'Tutor GoToX',
    correo: user?.email || user?.correo || '',
    telefono: user?.phone || user?.telefono || '+506 0000-0000',
    direccion: user?.zone || user?.ubicacion || 'San José, Costa Rica'
  };

  if (!petData || !(petData.nombre || petData.name)) {
    return {
      ...SESION_DEFECTO.mascota,
      tutor: baseTutor
    };
  }

  const fotoUrl = petData.foto || petData.photoUrl || petData.photo_url || petData.imagen || null;

  return {
    ...MASCOTA_ACTIVA_DEFECTO,
    id: petData.id || `PET-CR-${Math.floor(1000 + Math.random() * 9000)}`,
    nombre: petData.nombre || petData.name,
    especie: petData.especie || petData.species || 'Canino',
    raza: petData.raza || petData.breed || 'Mestizo',
    pesoKg: Number(petData.pesoKg ?? petData.weight_kg ?? 15),
    edadAnos: Number(petData.edadAnos ?? petData.age_years ?? 2),
    microchipId: petData.microchipId || petData.microchip_id || 'En trámite',
    colorManto: petData.colorManto || petData.color_coat || 'Variado',
    foto: fotoUrl,
    photoUrl: fotoUrl,
    alergias: Array.isArray(petData.alergias)
      ? petData.alergias
      : (typeof petData.alergias === 'string' && petData.alergias
          ? petData.alergias.split(',').map((s) => s.trim()).filter(Boolean)
          : []),
    tutor: baseTutor
  };
}

function leerSesionInicial() {
  if (typeof window === 'undefined') return SESION_DEFECTO;
  try {
    const raw = window.localStorage.getItem(CLAVE_STORAGE);
    if (raw) {
      const parseado = JSON.parse(raw);
      return {
        ...SESION_DEFECTO,
        ...parseado,
        usuario: { ...SESION_DEFECTO.usuario, ...(parseado.usuario || {}) },
        mascota: {
          ...SESION_DEFECTO.mascota,
          ...(parseado.mascota || {}),
          tutor: { ...SESION_DEFECTO.mascota.tutor, ...(parseado.mascota?.tutor || {}) }
        },
        boveda: { ...SESION_DEFECTO.boveda, ...(parseado.boveda || {}) },
        ajustes: { ...SESION_DEFECTO.ajustes, ...(parseado.ajustes || {}) }
      };
    }
  } catch (err) {
    console.warn('[SesionContext] Error leyendo sesión guardada:', err);
  }
  return SESION_DEFECTO;
}

const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesionInicial);
  const [cargandoAuth, setCargandoAuth] = useState(false);
  const [errorAuth, setErrorAuth] = useState(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(sesion));
      }
    } catch (err) {
      console.warn('[SesionContext] Error persistiendo sesión:', err);
    }
  }, [sesion]);

  const aplicarUsuarioBackend = useCallback((user) => {
    if (!user) return;
    setSesion((prev) => {
      const tieneMascota = user.hasPet !== undefined
        ? Boolean(user.hasPet)
        : Boolean(user.pet && (user.pet.nombre || user.pet.name));

      return {
        ...prev,
        isLoggedIn: true,
        usuario: {
          id: user.id,
          nombre: user.name || user.nombre || 'Usuario GoToX',
          correo: user.email || user.correo || '',
          role: user.role || 'client',
          telefono: user.phone || user.telefono || '',
          ubicacion: user.zone || user.ubicacion || 'San José, Costa Rica',
          tieneMascota
        },
        mascota: construirMascotaParaUsuario(user.pet, user)
      };
    });
  }, []);

  // Rehidratar sesión real desde el backend al cargar si hay token guardado
  useEffect(() => {
    const tokens = authService.getStoredTokens();
    if (!tokens?.token) return;

    let activo = true;
    authService
      .getMe()
      .then((me) => {
        if (!activo) return;
        if (me?.authenticated && me?.type === 'registered_user' && me?.user) {
          aplicarUsuarioBackend(me.user);
        } else if (me && !me.authenticated) {
          setSesion(SESION_DEFECTO);
        }
      })
      .catch((err) => {
        if (!activo) return;
        if (err?.status === 401) {
          setSesion(SESION_DEFECTO);
        }
      });

    return () => {
      activo = false;
    };
  }, [aplicarUsuarioBackend]);

  const loginConBackend = useCallback(async ({ email, password }) => {
    setCargandoAuth(true);
    setErrorAuth(null);
    try {
      const data = await authService.login({ email, password });
      aplicarUsuarioBackend(data?.user);
      return data;
    } catch (err) {
      const msg = err?.message || 'Credenciales inválidas o error al conectar con el servidor.';
      setErrorAuth(msg);
      throw err;
    } finally {
      setCargandoAuth(false);
    }
  }, [aplicarUsuarioBackend]);

  const registrarConBackend = useCallback(async ({ name, email, password, phone, zone, hasPet, pet }) => {
    setCargandoAuth(true);
    setErrorAuth(null);
    try {
      const data = await authService.register({ name, email, password, phone, zone, hasPet, pet });
      aplicarUsuarioBackend(data?.user);
      return data;
    } catch (err) {
      const msg = err?.message || 'No se pudo completar el registro de usuario.';
      setErrorAuth(msg);
      throw err;
    } finally {
      setCargandoAuth(false);
    }
  }, [aplicarUsuarioBackend]);

  const cargarBovedaBackend = useCallback(async () => {
    const tokens = authService.getStoredTokens();
    if (!tokens?.token) return null;

    const vault = await api.get('/client/vault');
    if (vault) {
      setSesion((prev) => ({
        ...prev,
        usuario: {
          ...prev.usuario,
          id: vault.user?.id || prev.usuario.id,
          nombre: vault.user?.name || prev.usuario.nombre,
          correo: vault.user?.email || prev.usuario.correo,
          role: vault.user?.role || prev.usuario.role,
          telefono: vault.user?.phone ?? prev.usuario.telefono,
          ubicacion: vault.user?.zone ?? prev.usuario.ubicacion,
          tieneMascota: vault.has_pet !== undefined ? Boolean(vault.has_pet) : prev.usuario.tieneMascota
        },
        mascota: vault.pet
          ? construirMascotaParaUsuario(vault.pet, vault.user || prev.usuario)
          : prev.mascota,
        boveda: {
          budget_level: vault.budget_level || prev.boveda.budget_level,
          interests: Array.isArray(vault.interests) ? vault.interests : prev.boveda.interests,
          preferences: vault.preferences ? { ...prev.boveda.preferences, ...vault.preferences } : prev.boveda.preferences
        }
      }));
    }
    return vault;
  }, []);

  const guardarBovedaBackend = useCallback(async (payload) => {
    const tokens = authService.getStoredTokens();
    if (tokens?.token) {
      const updated = await api.post('/client/vault', payload);
      if (updated) {
        setSesion((prev) => ({
          ...prev,
          usuario: {
            ...prev.usuario,
            nombre: updated.user?.name || payload.name || prev.usuario.nombre,
            telefono: updated.user?.phone ?? payload.phone ?? prev.usuario.telefono,
            ubicacion: updated.user?.zone ?? payload.zone ?? prev.usuario.ubicacion,
            tieneMascota: updated.has_pet !== undefined ? Boolean(updated.has_pet) : Boolean(payload.has_pet)
          },
          mascota: updated.pet
            ? construirMascotaParaUsuario(updated.pet, updated.user || prev.usuario)
            : (payload.pet ? construirMascotaParaUsuario(payload.pet, prev.usuario) : prev.mascota),
          boveda: {
            budget_level: updated.budget_level || payload.budget_level || prev.boveda.budget_level,
            interests: Array.isArray(updated.interests) ? updated.interests : (payload.interests || prev.boveda.interests),
            preferences: updated.preferences || payload.preferences || prev.boveda.preferences
          }
        }));
      }
      return updated;
    }

    // Respaldo local si no hay JWT activo
    setSesion((prev) => ({
      ...prev,
      usuario: {
        ...prev.usuario,
        nombre: payload.name || prev.usuario.nombre,
        telefono: payload.phone ?? prev.usuario.telefono,
        ubicacion: payload.zone ?? prev.usuario.ubicacion,
        tieneMascota: payload.has_pet !== undefined ? Boolean(payload.has_pet) : prev.usuario.tieneMascota
      },
      mascota: payload.pet ? construirMascotaParaUsuario(payload.pet, prev.usuario) : prev.mascota,
      boveda: {
        budget_level: payload.budget_level || prev.boveda.budget_level,
        interests: payload.interests || prev.boveda.interests,
        preferences: payload.preferences || prev.boveda.preferences
      }
    }));
    return null;
  }, []);

  const cerrarSesion = useCallback(() => {
    setSesion(SESION_DEFECTO);
    setErrorAuth(null);

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('auth_user');
        window.localStorage.removeItem('sn_auth_token');
        window.localStorage.removeItem('sn_refresh_token');
        window.localStorage.removeItem('sn_guest_token');
        window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(SESION_DEFECTO));
      }
    } catch (err) {
      console.warn('[SesionContext] Error limpiando credenciales:', err);
    }

    authService.logout().catch(() => {});
  }, []);

  const actualizarMascota = useCallback((datosActualizados) => {
    setSesion((prev) => ({
      ...prev,
      usuario: {
        ...prev.usuario,
        tieneMascota: true
      },
      mascota: {
        ...prev.mascota,
        ...datosActualizados
      }
    }));
  }, []);

  const actualizarAjustes = useCallback((nuevosAjustes) => {
    setSesion((prev) => ({
      ...prev,
      ajustes: {
        ...prev.ajustes,
        ...nuevosAjustes
      }
    }));
  }, []);

  const esAdmin = Boolean(sesion.isLoggedIn && sesion.usuario?.role === 'admin');

  const valor = useMemo(() => ({
    isLoggedIn: Boolean(sesion.isLoggedIn),
    esAdmin,
    usuario: sesion.usuario,
    mascota: sesion.mascota,
    boveda: sesion.boveda,
    ajustes: sesion.ajustes,
    cargandoAuth,
    errorAuth,
    cerrarSesion,
    loginConBackend,
    registrarConBackend,
    cargarBovedaBackend,
    guardarBovedaBackend,
    actualizarMascota,
    actualizarAjustes
  }), [
    sesion,
    esAdmin,
    cargandoAuth,
    errorAuth,
    cerrarSesion,
    loginConBackend,
    registrarConBackend,
    cargarBovedaBackend,
    guardarBovedaBackend,
    actualizarMascota,
    actualizarAjustes
  ]);

  return (
    <SesionContext.Provider value={valor}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) {
    throw new Error('useSesion debe usarse dentro de un <SesionProvider>');
  }
  return contexto;
}
