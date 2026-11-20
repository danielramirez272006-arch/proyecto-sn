import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Lock, LogIn, Home, Loader2 } from 'lucide-react';
import { PageWrapper } from './PageWrapper';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../shared/services/api-client';

/**
 * Guardia de rutas administrativas.
 * La decisión NO depende del estado local del navegador (que cualquiera puede editar):
 * se consulta al backend con el token JWT y solo se muestra el contenido si el servidor
 * confirma un usuario registrado con rol "admin". Toda acción real del panel además
 * vuelve a validarse en el servidor (requireAdmin).
 */
export function RutaAdmin({ children }) {
  const [estado, setEstado] = useState('verificando'); // verificando | permitido | denegado | sin_sesion
  const [rolDetectado, setRolDetectado] = useState(null);

  useEffect(() => {
    let activo = true;

    api
      .get('/auth/me')
      .then((me) => {
        if (!activo) return;
        if (!me?.authenticated || me.type !== 'registered_user') {
          setEstado('sin_sesion');
          return;
        }
        setRolDetectado(me.user?.role || null);
        setEstado(me.user?.role === 'admin' ? 'permitido' : 'denegado');
      })
      .catch(() => {
        if (activo) setEstado('sin_sesion');
      });

    return () => {
      activo = false;
    };
  }, []);

  if (estado === 'permitido') return children;

  if (estado === 'verificando') {
    return (
      <PageWrapper className="min-h-[60vh] flex items-center justify-center">
        <div role="status" className="flex items-center gap-3 text-sm opacity-80">
          <Loader2 className="w-5 h-5 animate-spin text-[#F27B91]" aria-hidden="true" />
          <span>Verificando permisos de administrador…</span>
        </div>
      </PageWrapper>
    );
  }

  const sinSesion = estado === 'sin_sesion';

  return (
    <PageWrapper className="min-h-[70vh] flex items-center justify-center py-12">
      <Card className="max-w-md w-full p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-[#501228] text-white flex items-center justify-center mx-auto border border-[#F27B91]/30">
          {sinSesion ? <Lock className="w-7 h-7 text-[#F27B91]" aria-hidden="true" /> : <ShieldAlert className="w-7 h-7 text-[#F27B91]" aria-hidden="true" />}
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#F27B91]">Zona restringida</span>
          <h1 className="font-serif font-bold text-2xl">
            {sinSesion ? 'Inicia sesión como administrador' : 'No tienes permisos de administrador'}
          </h1>
          <p className="text-sm opacity-75 leading-relaxed">
            {sinSesion
              ? 'El Centro de Mando solo está disponible para cuentas administradoras verificadas por el servidor. Los accesos de demostración no tienen permisos aquí.'
              : `Tu cuenta tiene el rol «${rolDetectado || 'sin rol'}». Solo las cuentas con rol administrador pueden entrar al Centro de Mando.`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
          <Link to="/acceso">
            <Button variant="primary" icon={LogIn} className="w-full sm:w-auto justify-center">
              {sinSesion ? 'Iniciar sesión' : 'Cambiar de cuenta'}
            </Button>
          </Link>
          <Link to="/">
            <Button variant="secondary" icon={Home} className="w-full sm:w-auto justify-center">
              Volver al inicio
            </Button>
          </Link>
        </div>
      </Card>
    </PageWrapper>
  );
}

export default RutaAdmin;
