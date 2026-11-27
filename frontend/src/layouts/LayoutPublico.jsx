import React, { useState, useEffect } from 'react';
import { useReducedMotion } from 'motion/react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Footer } from '../components/Footer';
import { BannerCookies } from '../components/BannerCookies';
import { ScrollCompanion } from '../components/ScrollCompanion';
import { EnlaceSaltarContenido } from '../components/EnlaceSaltarContenido';

const STORAGE_KEY_SIDEBAR = 'gotox_sidebar_compacta';

export function LayoutPublico() {
  const prefersReducedMotion = useReducedMotion();
  const [sidebarCompacta, setSidebarCompacta] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SIDEBAR) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SIDEBAR, String(sidebarCompacta));
    } catch {
      // Ignorar si storage no está disponible
    }
  }, [sidebarCompacta]);

  return (
    <div className="tema-publico gotox-layout-publico min-h-screen flex flex-col md:flex-row transition-colors duration-200">
      <EnlaceSaltarContenido targetId="contenido-principal" />
      {/* Menú lateral vertical fijo / contraíble */}
      <Sidebar
        compacta={sidebarCompacta}
        onToggleCompacta={() => setSidebarCompacta((prev) => !prev)}
      />

      {/* Contenedor principal sincronizado con la misma duración (300ms) y curva cubic-bezier(0.22,1,0.36,1) */}
      <div
        className={`flex-1 min-w-0 flex flex-col min-h-screen will-change-[padding] ${
          prefersReducedMotion
            ? ''
            : 'transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
        } ${sidebarCompacta ? 'md:pl-20' : 'md:pl-64 lg:pl-72'}`}
      >
        <main id="contenido-principal" tabIndex={-1} className="flex-1 w-full outline-none">
          <Outlet />
        </main>
        <Footer />
        <BannerCookies />
        <ScrollCompanion />
      </div>
    </div>
  );
}

export default LayoutPublico;
