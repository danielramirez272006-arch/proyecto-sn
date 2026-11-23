import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutUsuario } from '../layouts/LayoutUsuario';
import { ExplorarPage } from './ExplorarPage';
import { MisPlanesPage } from './MisPlanesPage';
import { FavoritosPage } from './FavoritosPage';
import { MiMascotaPage } from './MiMascotaPage';
import { Perfil } from './Perfil';
import { useSesion } from '../hooks/useSesion';
import { useIdioma } from '../context/IdiomaContext';
import { obtenerFavoritosIds, obtenerPlanes } from '../servicios/almacenamientoCliente';
import { Compass, Calendar, Heart, Dog, User } from 'lucide-react';

const TABS_VALIDAS = ['cuenta', 'explorar', 'planes', 'favoritos', 'mascota'];

/**
 * Página exclusiva para usuarios autenticados (/usuario).
 * Agrupa únicamente las herramientas personales del usuario:
 * Mi Cuenta, Explorar Lugares, Mis Planes, Favoritos y Mi Mascota.
 * Al presionar el logo GoToX en la barra lateral o móvil, regresa a la página principal (/).
 */
export function UsuarioPanel() {
  const { t } = useIdioma();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabQuery = searchParams.get('tab');
  const initialTab = TABS_VALIDAS.includes(tabQuery) ? tabQuery : 'cuenta';

  const [tabActiva, setTabActiva] = useState(initialTab);
  const [favoritosCount, setFavoritosCount] = useState(() => obtenerFavoritosIds().length);
  const [planesCount, setPlanesCount] = useState(() => obtenerPlanes().length);

  // Sincronizar si cambia ?tab=... en la URL
  useEffect(() => {
    if (tabQuery && TABS_VALIDAS.includes(tabQuery) && tabQuery !== tabActiva) {
      setTabActiva(tabQuery);
    }
  }, [tabQuery, tabActiva]);

  // Mantener contadores reactivos
  useEffect(() => {
    const actualizar = () => {
      setFavoritosCount(obtenerFavoritosIds().length);
      setPlanesCount(obtenerPlanes().length);
    };
    window.addEventListener('gotox:favoritos', actualizar);
    window.addEventListener('gotox:planes', actualizar);
    return () => {
      window.removeEventListener('gotox:favoritos', actualizar);
      window.removeEventListener('gotox:planes', actualizar);
    };
  }, []);

  const handleTabChange = (nuevaTab) => {
    setTabActiva(nuevaTab);
    setSearchParams({ tab: nuevaTab }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabsConfig = [
    { id: 'cuenta', label: t('usuario.cuenta'), icon: User },
    { id: 'explorar', label: t('usuario.explorar'), icon: Compass },
    { id: 'planes', label: t('usuario.planes'), icon: Calendar, badge: planesCount },
    { id: 'favoritos', label: t('usuario.favoritos'), icon: Heart, badge: favoritosCount },
    { id: 'mascota', label: t('usuario.mascota'), icon: Dog }
  ];

  return (
    <LayoutUsuario tabs={tabsConfig} tabActiva={tabActiva} onTabChange={handleTabChange}>
      {tabActiva === 'cuenta' && <Perfil embebido={true} />}
      {tabActiva === 'explorar' && <ExplorarPage />}
      {tabActiva === 'planes' && <MisPlanesPage />}
      {tabActiva === 'favoritos' && <FavoritosPage />}
      {tabActiva === 'mascota' && <MiMascotaPage />}
    </LayoutUsuario>
  );
}

export default UsuarioPanel;
