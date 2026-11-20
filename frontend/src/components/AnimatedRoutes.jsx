import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { LayoutPublico } from '../layouts/LayoutPublico';
import { Home } from '../pages/Home';
import { RutaAdmin } from './RutaAdmin';

const ExplorarPage = lazy(() => import('../pages/ExplorarPage').then((m) => ({ default: m.ExplorarPage || m.default })));
const MisPlanesPage = lazy(() => import('../pages/MisPlanesPage').then((m) => ({ default: m.MisPlanesPage || m.default })));
const FavoritosPage = lazy(() => import('../pages/FavoritosPage').then((m) => ({ default: m.FavoritosPage || m.default })));
const MiMascotaPage = lazy(() => import('../pages/MiMascotaPage').then((m) => ({ default: m.MiMascotaPage || m.default })));
const MapaPage = lazy(() => import('../pages/MapaPage').then((m) => ({ default: m.MapaPage || m.default })));
const TerrazasPage = lazy(() => import('../pages/TerrazasPage').then((m) => ({ default: m.TerrazasPage || m.default })));
const CopilotoPage = lazy(() => import('../pages/CopilotoPage').then((m) => ({ default: m.CopilotoPage || m.default })));
const Nosotros = lazy(() => import('../pages/Nosotros').then((m) => ({ default: m.Nosotros || m.default })));
const TerminosCondiciones = lazy(() =>
  import('../pages/TerminosCondiciones').then((m) => ({ default: m.TerminosCondiciones || m.default }))
);
const Acceso = lazy(() => import('../pages/Acceso').then((m) => ({ default: m.Acceso || m.default })));
const Perfil = lazy(() => import('../pages/Perfil').then((m) => ({ default: m.Perfil || m.default })));
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
          {/* Vistas principales bajo LayoutPublico */}
          <Route element={<LayoutPublico />}>
            <Route path="/" element={<Home />} />
            <Route path="/explorar" element={<ExplorarPage />} />
            <Route path="/mis-planes" element={<MisPlanesPage />} />
            <Route path="/favoritos" element={<FavoritosPage />} />
            <Route path="/mi-mascota" element={<MiMascotaPage />} />
            <Route path="/mapa" element={<MapaPage />} />
            <Route path="/terrazas" element={<TerrazasPage />} />
            <Route path="/copiloto" element={<CopilotoPage />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/terminos" element={<TerminosCondiciones />} />
            <Route path="/acceso" element={<Acceso />} />
            <Route path="/perfil" element={<Perfil />} />
            {/* Compatibilidad con rutas anteriores */}
            <Route path="/servicios" element={<Navigate to="/explorar" replace />} />
            <Route path="/emergencias" element={<Navigate to="/mi-mascota" replace />} />
          </Route>

          {/* Vista Privada: Panel de Control GAM (solo administradores verificados por el servidor) */}
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
