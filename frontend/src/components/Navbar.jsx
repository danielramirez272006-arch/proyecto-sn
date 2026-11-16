import React from 'react';
import { Sidebar } from './Sidebar';

/**
 * Adaptador de compatibilidad:
 * Redirecciona la barra horizontal anterior hacia el nuevo Sidebar vertical fijo SaaS.
 */
export function Navbar(props) {
  return <Sidebar {...props} />;
}

export { Sidebar };
export default Sidebar;
