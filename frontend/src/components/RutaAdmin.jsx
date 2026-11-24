import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Lock, LogIn, Home, Loader2 } from 'lucide-react';
import { PageWrapper } from './PageWrapper';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useSesion } from '../hooks/useSesion';
import { useIdioma } from '../context/IdiomaContext';
import { api } from '../shared/services/api-client';

/**
 * Guardia de rutas administrativas (/panel).
 * Valida la sesión con el backend (/auth/me) y permite acceso únicamente a cuentas con rol "admin".
 */
export function RutaAdmin({ children }) {
  const { isLoggedIn, usuario } = useSesion();
  const { t } = useIdioma();
  const [estado, setEstado] = useState(() =>
    isLoggedIn && usuario?.role === 'admin' ? 'permitido' : 'verificando'
  );
  const [rolDetectado, setRolDetectado] = useState(usuario?.role || null);

  useEffect(() => {
    let activo = true;

    api
      .get('/auth/me')
      .then((me) => {
        if (!activo) return;
        if (!me?.authenticated || me.type !== 'registered_user') {
          if (isLoggedIn && usuario?.role === 'admin') {
            setEstado('permitido');
          } else {
            setEstado('sin_sesion');
          }
          return;
        }
        setRolDetectado(me.user?.role || null);
        setEstado(me.user?.role === 'admin' ? 'permitido' : 'denegado');
      })
      .catch(() => {
        if (!activo) return;
        if (isLoggedIn && usuario?.role === 'admin') {
          setEstado('permitido');
        } else {
          setEstado(isLoggedIn ? 'denegado' : 'sin_sesion');
        }
      });

    return () => {
      activo = false;
    };
  }, [isLoggedIn, usuario?.role]);

  if (estado === 'permitido') return children;

  if (estado === 'verificando') {
    return (
      <PageWrapper className="min-h-[60vh] flex items-center justify-center">
        <div role="status" className="flex items-center gap-3 text-sm opacity-80">
          <Loader2 className="w-5 h-5 animate-spin text-[#F27B91]" aria-hidden="true" />
          <span>{t('rutaAdmin.verificando')}</span>
        </div>
      </PageWrapper>
    );
  }

  const sinSesion = estado === 'sin_sesion';

  return (
    <PageWrapper className="min-h-[70vh] flex items-center justify-center py-12">
      <Card className="max-w-md w-full p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-[#501228] text-white flex items-center justify-center mx-auto border border-[#F27B91]/30">
          {sinSesion ? (
            <Lock className="w-7 h-7 text-[#F27B91]" aria-hidden="true" />
          ) : (
            <ShieldAlert className="w-7 h-7 text-[#F27B91]" aria-hidden="true" />
          )}
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#F27B91]">
            {t('rutaAdmin.zonaRestringida')}
          </span>
          <h1 className="font-serif font-bold text-2xl">
            {sinSesion ? t('rutaAdmin.tituloSinSesion') : t('rutaAdmin.tituloDenegado')}
          </h1>
          <p className="text-sm opacity-75 leading-relaxed">
            {sinSesion
              ? t('rutaAdmin.descSinSesion')
              : t('rutaAdmin.descDenegado', { rol: rolDetectado || t('rutaAdmin.rolUsuario') })}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
          <Link to="/acceso">
            <Button variant="primary" icon={LogIn} className="w-full sm:w-auto justify-center">
              {sinSesion ? t('rutaAdmin.iniciarSesion') : t('rutaAdmin.cambiarCuenta')}
            </Button>
          </Link>
          <Link to="/">
            <Button variant="secondary" icon={Home} className="w-full sm:w-auto justify-center">
              {t('rutaAdmin.volverInicio')}
            </Button>
          </Link>
        </div>
      </Card>
    </PageWrapper>
  );
}

export default RutaAdmin;
