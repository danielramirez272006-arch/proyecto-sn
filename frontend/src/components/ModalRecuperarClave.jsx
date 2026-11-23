import React, { useState } from 'react';
import { X, Mail, KeyRound, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../shared/services/api-client';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export function ModalRecuperarClave({ abierto, correoInicial = '', onCerrar }) {
  const [paso, setPaso] = useState(1); // 1: solicitar código | 2: restablecer contraseña
  const [email, setEmail] = useState(correoInicial || '');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  if (!abierto) return null;

  const handleSolicitarCodigo = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      if (res?.dev_reset_token) {
        setToken(res.dev_reset_token);
        setMensaje(`Código generado (entorno dev): ${res.dev_reset_token}`);
      } else {
        setMensaje(res?.message || 'Si el correo existe, recibirás tu código temporal.');
      }
      setPaso(2);
    } catch (err) {
      setError(err?.message || 'No se pudo procesar la solicitud.');
    } finally {
      setCargando(false);
    }
  };

  const handleRestablecer = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        token: token.trim(),
        newPassword
      });
      setMensaje('Contraseña actualizada con bcrypt. Ya puedes iniciar sesión.');
      setTimeout(() => {
        onCerrar?.();
        setPaso(1);
        setNewPassword('');
      }, 1200);
    } catch (err) {
      setError(err?.message || 'El código es inválido o expiró.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar?.();
      }}
    >
      <Card className="w-full max-w-md p-6 space-y-4 text-left">
        <div className="flex items-start justify-between gap-3 border-b border-current/10 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F27B91]">
              Recuperación Segura (15 min)
            </span>
            <h2 className="font-serif font-bold text-lg">Restablecer Contraseña</h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar recuperación de contraseña"
            className="p-1.5 rounded-xl border border-current/15 hover:bg-current/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mensaje && (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2 break-all">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{mensaje}</span>
          </div>
        )}

        {paso === 1 ? (
          <form onSubmit={handleSolicitarCodigo} className="space-y-3">
            <Input
              label="Correo Electrónico de la cuenta"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.cr"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" icon={KeyRound} disabled={cargando}>
                {cargando ? 'Enviando...' : 'Solicitar código'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRestablecer} className="space-y-3">
            <Input
              label="Código temporal recibido"
              icon={KeyRound}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
            <Input
              label="Nueva contraseña (mín. 6 caracteres)"
              type="password"
              icon={Lock}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="text-xs underline opacity-75 hover:opacity-100"
              >
                Reenviar código
              </button>
              <Button type="submit" variant="primary" size="sm" icon={CheckCircle2} disabled={cargando}>
                {cargando ? 'Actualizando...' : 'Actualizar clave'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
