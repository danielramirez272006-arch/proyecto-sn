import React, { useEffect, useState, useCallback } from 'react';
import { Camera, CheckCircle2, XCircle, RefreshCw, ShieldAlert, FileCheck, Upload, Plus } from 'lucide-react';
import { api } from '../../shared/services/api-client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

const FORM_INICIAL = {
  place_id: 'LOC-001',
  branch_label: 'Sucursal Barrio Escalante',
  photo_type: 'fachada',
  author: 'Prensa Oficial del Local',
  license: 'Autorización expresa del comercio',
  is_cover: true,
  image_base64: ''
};

export function ModeracionFotosPanel() {
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [reconciliacion, setReconciliacion] = useState(null);
  const [mostrarSubida, setMostrarSubida] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [formSubida, setFormSubida] = useState(FORM_INICIAL);

  const cargarPendientes = useCallback(async () => {
    setCargando(true);
    setMensaje(null);
    try {
      const data = await api.get('/admin/places/photos/pending?limit=50');
      setPendientes(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudieron cargar las fotografías pendientes.' });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

  const handleArchivoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNombreArchivo(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFormSubida((prev) => ({ ...prev, image_base64: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubirFoto = async (e) => {
    e.preventDefault();
    if (!formSubida.image_base64) {
      setMensaje({ tipo: 'error', texto: 'Selecciona una imagen JPEG, PNG o WebP antes de subir.' });
      return;
    }
    setSubiendo(true);
    setMensaje(null);
    try {
      await api.post('/admin/places/photos/upload', formSubida);
      setMensaje({
        tipo: 'ok',
        texto: 'Fotografía validada (EXIF limpio) y enviada al bucket privado en estado pending_review.'
      });
      setFormSubida(FORM_INICIAL);
      setNombreArchivo('');
      setMostrarSubida(false);
      await cargarPendientes();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al subir la fotografía.' });
    } finally {
      setSubiendo(false);
    }
  };

  const handleAprobar = async (photoId) => {
    setProcesandoId(photoId);
    setMensaje(null);
    try {
      await api.post(`/admin/places/photos/${photoId}/approve`, { is_cover: true });
      setPendientes((prev) => prev.filter((p) => p.id !== photoId));
      setMensaje({ tipo: 'ok', texto: 'Fotografía aprobada y publicada en el bucket público.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error aprobando fotografía.' });
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = async (photoId) => {
    setProcesandoId(photoId);
    setMensaje(null);
    try {
      await api.post(`/admin/places/photos/${photoId}/reject`, {
        status: 'rejected',
        reason: 'Rechazada en revisión administrativa'
      });
      setPendientes((prev) => prev.filter((p) => p.id !== photoId));
      setMensaje({ tipo: 'ok', texto: 'Fotografía rechazada y mantenida fuera del catálogo público.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error rechazando fotografía.' });
    } finally {
      setProcesandoId(null);
    }
  };

  const handleReconciliar = async () => {
    setCargando(true);
    setMensaje(null);
    try {
      const res = await api.post('/admin/places/photos/reconcile', {});
      setReconciliacion(res);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo reconciliar Storage con la base de datos.' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5 text-left">
          <h2 className="font-serif font-bold text-base flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#F27B91]" />
            <span>Cola de Moderación de Fotografías ({pendientes.length})</span>
          </h2>
          <p className="text-xs opacity-75">
            Las imágenes importadas permanecen privadas hasta que un administrador verifique su sucursal, autoría y licencia.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={Plus}
            onClick={() => setMostrarSubida((v) => !v)}
          >
            {mostrarSubida ? 'Cerrar formulario' : 'Subir fotografía'}
          </Button>
          <Button size="sm" variant="secondary" icon={FileCheck} onClick={handleReconciliar} disabled={cargando}>
            Reconciliar Storage
          </Button>
          <Button size="sm" variant="primary" icon={RefreshCw} onClick={cargarPendientes} disabled={cargando}>
            {cargando ? 'Cargando...' : 'Actualizar'}
          </Button>
        </div>
      </Card>

      {mostrarSubida && (
        <Card className="p-4 text-left space-y-3">
          <h3 className="font-serif font-bold text-sm flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#F27B91]" />
            <span>Subir fotografía verificada al bucket privado</span>
          </h3>
          <form onSubmit={handleSubirFoto} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <Input
              label="ID del Establecimiento (place_id)"
              value={formSubida.place_id}
              onChange={(e) => setFormSubida({ ...formSubida, place_id: e.target.value })}
              required
            />
            <Input
              label="Sucursal / Etiqueta"
              value={formSubida.branch_label}
              onChange={(e) => setFormSubida({ ...formSubida, branch_label: e.target.value })}
            />
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold opacity-80">Tipo de toma</label>
              <select
                value={formSubida.photo_type}
                onChange={(e) => setFormSubida({ ...formSubida, photo_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-current/20 bg-transparent text-xs"
              >
                <option value="fachada">Fachada</option>
                <option value="terraza">Terraza Pet-Friendly</option>
                <option value="interior">Interior</option>
                <option value="plato">Gastronomía / Plato</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <Input
              label="Autor / Crédito obligatorio"
              value={formSubida.author}
              onChange={(e) => setFormSubida({ ...formSubida, author: e.target.value })}
              required
            />
            <Input
              label="Licencia / Autorización verificable"
              value={formSubida.license}
              onChange={(e) => setFormSubida({ ...formSubida, license: e.target.value })}
              required
            />
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold opacity-80">
                Archivo (JPEG, PNG, WebP &ge; 400x300 px)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleArchivoChange}
                className="w-full text-xs file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#501228] file:text-white file:font-semibold"
                required
              />
              {nombreArchivo && <span className="block text-[10px] opacity-70">Seleccionado: {nombreArchivo}</span>}
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between pt-2 border-t border-current/10">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={formSubida.is_cover}
                  onChange={(e) => setFormSubida({ ...formSubida, is_cover: e.target.checked })}
                  className="accent-[#501228]"
                />
                <span>Marcar como portada sugerida al aprobar</span>
              </label>
              <Button type="submit" size="sm" variant="primary" icon={Upload} disabled={subiendo}>
                {subiendo ? 'Validando y subiendo...' : 'Subir a Revisión Privada'}
              </Button>
            </div>
          </form>
        </Card>
      )}

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

      {reconciliacion && (
        <Card className="p-3.5 text-xs space-y-1 text-left">
          <p className="font-bold">Resultado de Reconciliación Storage ↔ PostgreSQL</p>
          <p className="opacity-80">
            Registros revisados: <strong>{reconciliacion.total_checked}</strong> &bull; Saludables:{' '}
            <strong>{reconciliacion.healthy_count}</strong> &bull; Faltantes en Storage:{' '}
            <strong>{reconciliacion.missing_in_storage?.length || 0}</strong>
          </p>
        </Card>
      )}

      {pendientes.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <ShieldAlert className="w-7 h-7 mx-auto opacity-60" />
          <p className="text-sm font-semibold">No hay fotografías pendientes de revisión.</p>
          <p className="text-xs opacity-70">
            Puedes subir una fotografía desde el botón <strong>Subir fotografía</strong> o importar un lote con{' '}
            <code>npm --prefix backend run photos:import -- --commit</code>.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendientes.map((foto) => (
            <Card key={foto.id} className="p-0 overflow-hidden flex flex-col justify-between">
              <div className="h-44 bg-slate-900 flex items-center justify-center overflow-hidden">
                {foto.signed_review_url ? (
                  <img
                    src={foto.signed_review_url}
                    alt={foto.alt_text || foto.restaurant_name || 'Vista previa'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-slate-400 px-4 text-center">
                    Vista previa firmada no disponible (verifica SUPABASE_SERVICE_ROLE_KEY)
                  </span>
                )}
              </div>

              <div className="p-4 space-y-2.5 text-left text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif font-bold text-sm">
                      {foto.restaurant_name || foto.place_id}
                    </h3>
                    <p className="text-[11px] opacity-70">
                      {foto.branch_label || 'Sucursal principal'} &bull; {foto.photo_type || 'otro'}
                    </p>
                  </div>
                  <Badge variant="warning">Pendiente</Badge>
                </div>

                <div className="space-y-0.5 text-[11px] opacity-80">
                  <p><strong>Autor:</strong> {foto.author || 'No indicado'}</p>
                  <p><strong>Licencia:</strong> {foto.license || 'Sin licencia'}</p>
                  {foto.width && foto.height && (
                    <p><strong>Dimensiones:</strong> {foto.width}x{foto.height} px</p>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2 border-t border-current/10">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={CheckCircle2}
                    disabled={procesandoId === foto.id}
                    onClick={() => handleAprobar(foto.id)}
                    className="flex-1 justify-center"
                  >
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={XCircle}
                    disabled={procesandoId === foto.id}
                    onClick={() => handleRechazar(foto.id)}
                    className="flex-1 justify-center"
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
