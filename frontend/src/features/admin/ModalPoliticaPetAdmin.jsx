import React, { useState } from 'react';
import { ShieldCheck, X, Save, CheckCircle2 } from 'lucide-react';
import { api } from '../../shared/services/api-client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function ModalPoliticaPetAdmin({ local, onCerrar, onActualizado }) {
  const [accessStatus, setAccessStatus] = useState('allowed');
  const [sourceType, setSourceType] = useState('business_confirmation');
  const [seatingAccess, setSeatingAccess] = useState('outdoor');
  const [maxPets, setMaxPets] = useState(2);
  const [restriccionTamano, setRestriccionTamano] = useState('Perros pequeños y medianos con correa');
  const [leashRequired, setLeashRequired] = useState(true);
  const [reservationRequired, setReservationRequired] = useState(false);
  const [evidenceRef, setEvidenceRef] = useState('Confirmación directa con administración del local');
  const [notes, setNotes] = useState('Terraza sombreada con estación de hidratación canina.');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  if (!local) return null;

  const handleGuardarPolitica = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const payload = {
        access_status: accessStatus,
        source_type: sourceType,
        evidence_ref: evidenceRef,
        conditions: {
          species_allowed: ['dog', 'cat'],
          seating_access: seatingAccess,
          max_pets: Number(maxPets) || 1,
          size_or_weight_restriction: restriccionTamano || null,
          leash_required: Boolean(leashRequired),
          reservation_required: Boolean(reservationRequired),
          notes: notes || null,
        }
      };
      const res = await api.put(`/admin/places/${encodeURIComponent(local.id)}/pet-policy`, payload);
      setMensaje({
        tipo: 'ok',
        texto: 'Política Pet-Friendly y evidencia administrativa registradas correctamente.'
      });
      if (onActualizado) onActualizado(local.id, res);
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err.message || 'No se pudo actualizar la política pet-friendly en el servidor.'
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarVigencia = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await api.post(`/admin/places/${encodeURIComponent(local.id)}/pet-confirm`, {
        source_type: sourceType,
        evidence_ref: evidenceRef,
        notes
      });
      setMensaje({
        tipo: 'ok',
        texto: 'Vigencia semestral confirmada y sellada en la bitácora de evidencia.'
      });
      if (onActualizado) onActualizado(local.id, res);
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err.message || 'No se pudo confirmar la vigencia del establecimiento.'
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <Card className="w-full max-w-xl p-5 space-y-4 text-left max-h-[90dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-current/10 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F27B91]">
              Evidencia Pet-Friendly &bull; {local.id}
            </span>
            <h3 className="font-serif font-bold text-lg">{local.nombre}</h3>
            <p className="text-xs opacity-70">{local.zona} &bull; {local.categoria}</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 rounded-xl border border-current/15 hover:bg-current/10"
            aria-label="Cerrar editor de política pet-friendly"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {mensaje && (
          <div
            role="status"
            className={`p-3 rounded-xl border text-xs font-medium ${
              mensaje.tipo === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleGuardarPolitica} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold opacity-80">Acceso a mascotas</label>
              <select
                value={accessStatus}
                onChange={(e) => setAccessStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-current/20 bg-transparent text-xs"
              >
                <option value="allowed">Permitido (Allowed)</option>
                <option value="not_allowed">No permitido (Not Allowed)</option>
                <option value="unknown">Sin confirmar (Unknown)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold opacity-80">Fuente de verificación</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-current/20 bg-transparent text-xs"
              >
                <option value="business_confirmation">Confirmación del comercio</option>
                <option value="admin_review">Inspección administrativa</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold opacity-80">Área habilitada</label>
              <select
                value={seatingAccess}
                onChange={(e) => setSeatingAccess(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-current/20 bg-transparent text-xs"
              >
                <option value="outdoor">Terraza / Exterior</option>
                <option value="both">Interior y Terraza</option>
                <option value="indoor">Solo Interior</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Máximo de mascotas por mesa"
              type="number"
              min="1"
              max="10"
              value={maxPets}
              onChange={(e) => setMaxPets(e.target.value)}
            />
            <Input
              label="Restricción de tamaño o peso"
              value={restriccionTamano}
              onChange={(e) => setRestriccionTamano(e.target.value)}
            />
          </div>

          <Input
            label="Referencia de evidencia (acta, correo o enlace verificable)"
            value={evidenceRef}
            onChange={(e) => setEvidenceRef(e.target.value)}
            required
          />

          <Input
            label="Notas públicas sobre condiciones de ingreso"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={leashRequired}
                onChange={(e) => setLeashRequired(e.target.checked)}
                className="accent-[#501228]"
              />
              <span>Requiere correa o arnés obligatorio</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reservationRequired}
                onChange={(e) => setReservationRequired(e.target.checked)}
                className="accent-[#501228]"
              />
              <span>Requiere reserva previa para zona pet</span>
            </label>
          </div>

          <div className="pt-3 border-t border-current/10 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={CheckCircle2}
              disabled={guardando}
              onClick={handleConfirmarVigencia}
            >
              Revalidar Vigencia Semestral
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" variant="primary" icon={Save} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar Evidencia'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
