import React from 'react';
import { HashRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import './estilos/estilos.css';
import './estilos/tema.css';
import './estilos/accesibilidad.css';

import { AnimatedRoutes } from './components/AnimatedRoutes';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAccesibilidad } from './context/AccesibilidadContext';
import { A11yLiveRegions } from './shared/hooks/use-a11y-announcer';
import { A11yFloatingDock } from './shared/components/layout/a11y-floating-dock';

/**
 * GoToXApp - Sistema Operativo Urbano Inteligente para Mascotas (GAM, Costa Rica)
 * Configurado con MotionConfig para respetar accesibilidad (prefers-reduced-motion y ajuste manual),
 * región viva ARIA global, idioma dinámico y centro de accesibilidad universal.
 */
export default function App() {
  const { prefs } = useAccesibilidad();

  return (
    <MotionConfig reducedMotion={prefs?.reducirMovimiento ? 'always' : 'user'}>
      <div className="gotox-root">
        <A11yLiveRegions />
        <HashRouter>
          <ErrorBoundary>
            <AnimatedRoutes />
            <A11yFloatingDock />
          </ErrorBoundary>
        </HashRouter>
      </div>
    </MotionConfig>
  );
}

export { App as GoToXApp };
