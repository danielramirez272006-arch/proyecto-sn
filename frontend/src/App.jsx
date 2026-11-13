import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './estilos/estilos.css';
import './estilos/tema.css';

import { LayoutPublico } from './layouts/LayoutPublico';
import { Home } from './pages/Home';
import { Nosotros } from './pages/Nosotros';
import { Acceso } from './pages/Acceso';
import { Panel } from './pages/Panel';
import { Perfil } from './pages/Perfil';

/**
 * GoToXApp - Sistema Operativo Urbano Inteligente para Mascotas (GAM, Costa Rica)
 * Componente principal de la aplicación.
 */
export default function App() {
  return (
    <div className="gotox-root">
      <HashRouter>
        <Routes>
          {/* Rutas Públicas con Layout Estándar (Navbar + Footer) */}
          <Route element={<LayoutPublico />}>
            <Route path="/" element={<Home />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/acceso" element={<Acceso />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>

          {/* Centro de Mando IA (Layout con Top Navigation Flotante sin Sidebar) */}
          <Route path="/panel" element={<Panel />} />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </div>
  );
}

export { App as GoToXApp };

