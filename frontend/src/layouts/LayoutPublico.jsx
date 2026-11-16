import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Footer } from '../components/Footer';

export function LayoutPublico() {
  return (
    <div className="tema-publico min-h-screen flex flex-col md:flex-row bg-[#090D14] text-[#E8EDF5] transition-colors duration-200">
      {/* Menú lateral vertical fijo (Sidebar SaaS moderno) */}
      <Sidebar />

      {/* Contenedor del contenido principal ajustado para no quedar debajo del sidebar */}
      <div className="flex-1 min-w-0 md:pl-64 lg:pl-72 flex flex-col min-h-screen">
        <main className="flex-1 w-full">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default LayoutPublico;
