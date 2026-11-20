import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSesion } from '../hooks/useSesion';

/**
 * Guarda de ruta privada.
 * Redirige a /acceso cuando el usuario no ha iniciado sesión,
 * conservando la ruta destino y el nombre del módulo para volver tras autenticarse.
 */
export function RutaPrivada({ children, modulo }) {
  const { isLoggedIn } = useSesion();
  const location = useLocation();

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/acceso"
        replace
        state={{
          from: location.pathname,
          modulo: modulo || 'esta función'
        }}
      />
    );
  }

  return children;
}

export default RutaPrivada;
