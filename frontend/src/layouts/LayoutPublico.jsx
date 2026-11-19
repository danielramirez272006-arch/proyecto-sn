import React, { useState, useEffect } from 'react';
import { useReducedMotion } from 'motion/react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Footer } from '../components/Footer';

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
      {/* Menú lateral vertical fijo / contraíble */}
      <Sidebar
        compacta={sidebarCompacta}
        onToggleCompacta={() => setSidebarCompacta((prev) => !prev)}
      />

      {/* Contenedor principal sincronizado con el ancho de la sidebar */}
      <div
        className={`flex-1 min-w-0 flex flex-col min-h-screen ${
          prefersReducedMotion ? '' : 'transition-[padding] duration-[250ms] ease-out'
        } ${sidebarCompacta ? 'md:pl-20' : 'md:pl-64 lg:pl-72'}`}
      >
        <main className="flex-1 w-full">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default LayoutPublico;
