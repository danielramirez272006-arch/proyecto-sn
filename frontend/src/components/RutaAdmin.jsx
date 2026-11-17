import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSesion } from '../hooks/useSesion';

/**
 * Guarda de ruta exclusiva para cuentas de Administrador (role === 'admin').
 * - Si no hay sesión activa: redirige a /acceso.
 * - Si el usuario es cliente/normal (no admin): redirige a su página de usuario (/perfil)
 *   sin permitir acceso al panel de administración.
 */
export function RutaAdmin({ children }) {
  const { isLoggedIn, usuario } = useSesion();
  const location = useLocation();

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/acceso"
        replace
        state={{
          from: location.pathname,
          modulo: 'Panel de Administración Exclusivo'
        }}
      />
    );
  }

  if (usuario?.role !== 'admin') {
    return (
      <Navigate
        to="/usuario?tab=cuenta"
        replace
        state={{
          accesoDenegadoAdmin: true
        }}
      />
    );
  }

  return children;
}

export default RutaAdmin;
