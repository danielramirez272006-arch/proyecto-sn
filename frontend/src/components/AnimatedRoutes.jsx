import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { LayoutPublico } from '../layouts/LayoutPublico';
import { RutaPrivada } from './RutaPrivada';
import { RutaAdmin } from './RutaAdmin';
import { Home } from '../pages/Home';

const UsuarioPanel = lazy(() => import('../pages/UsuarioPanel').then((m) => ({ default: m.UsuarioPanel || m.default })));
const MapaPage = lazy(() => import('../pages/MapaPage').then((m) => ({ default: m.MapaPage || m.default })));
const TerrazasPage = lazy(() => import('../pages/TerrazasPage').then((m) => ({ default: m.TerrazasPage || m.default })));
const CopilotoPage = lazy(() => import('../pages/CopilotoPage').then((m) => ({ default: m.CopilotoPage || m.default })));
const Nosotros = lazy(() => import('../pages/Nosotros').then((m) => ({ default: m.Nosotros || m.default })));
const TerminosCondiciones = lazy(() =>
  import('../pages/TerminosCondiciones').then((m) => ({ default: m.TerminosCondiciones || m.default }))
);
const Acceso = lazy(() => import('../pages/Acceso').then((m) => ({ default: m.Acceso || m.default })));
const Panel = lazy(() => import('../pages/Panel').then((m) => ({ default: m.Panel || m.default })));

export function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense
        fallback={
          <div className="min-h-[45vh] flex items-center justify-center text-xs font-medium opacity-70">
            Cargando módulo...
          </div>
        }
      >
        <Routes location={location} key={location.pathname}>
          {/* Rutas Públicas de GoToX */}
          <Route element={<LayoutPublico />}>
            <Route path="/" element={<Home />} />
            <Route path="/mapa" element={<MapaPage />} />
            <Route path="/terrazas" element={<TerrazasPage />} />
            <Route path="/copiloto" element={<CopilotoPage />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/terminos" element={<TerminosCondiciones />} />
            <Route path="/acceso" element={<Acceso />} />

            {/* Atajos de rutas de usuario redirigen al Portal Exclusivo de Usuarios */}
            <Route
              path="/explorar"
              element={
                <RutaPrivada modulo="Explorar Catálogo">
                  <Navigate to="/usuario?tab=explorar" replace />
                </RutaPrivada>
              }
            />
            <Route
              path="/mis-planes"
              element={
                <RutaPrivada modulo="Mis Planes">
                  <Navigate to="/usuario?tab=planes" replace />
                </RutaPrivada>
              }
            />
            <Route
              path="/favoritos"
              element={
                <RutaPrivada modulo="Mis Favoritos">
                  <Navigate to="/usuario?tab=favoritos" replace />
                </RutaPrivada>
              }
            />
            <Route
              path="/mi-mascota"
              element={
                <RutaPrivada modulo="Mi Mascota">
                  <Navigate to="/usuario?tab=mascota" replace />
                </RutaPrivada>
              }
            />
            <Route
              path="/perfil"
              element={
                <RutaPrivada modulo="Mi Cuenta & Bóveda">
                  <Navigate to="/usuario?tab=cuenta" replace />
                </RutaPrivada>
              }
            />
            {/* Compatibilidad con rutas anteriores */}
            <Route path="/servicios" element={<Navigate to="/explorar" replace />} />
            <Route path="/emergencias" element={<Navigate to="/mi-mascota" replace />} />
          </Route>

          {/* Página Exclusiva de Usuarios (Portal independiente) */}
          <Route
            path="/usuario"
            element={
              <RutaPrivada modulo="Mi Espacio de Usuario">
                <UsuarioPanel />
              </RutaPrivada>
            }
          />

          {/* Página Exclusiva de Administración (solo cuentas role === 'admin' verificadas por el servidor) */}
          <Route
            path="/panel"
            element={
              <RutaAdmin>
                <Panel />
              </RutaAdmin>
            }
          />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
