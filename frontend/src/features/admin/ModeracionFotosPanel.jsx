import React, { useEffect, useState, useCallback } from 'react';
import { Camera, CheckCircle2, XCircle, RefreshCw, ShieldAlert, FileCheck, Upload, Plus } from 'lucide-react';
import { api } from '../../shared/services/api-client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useIdioma } from '../../context/IdiomaContext';

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
  const { t } = useIdioma();
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
      setMensaje({ tipo: 'error', texto: err.message || t('modFotos.errCargar') });
    } finally {
      setCargando(false);
    }
  }, [t]);

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
      setMensaje({ tipo: 'error', texto: t('modFotos.errArchivoReq') });
      return;
    }
    setSubiendo(true);
    setMensaje(null);
    try {
      await api.post('/admin/places/photos/upload', formSubida);
      setMensaje({
        tipo: 'ok',
        texto: t('modFotos.okSubida')
      });
      setFormSubida(FORM_INICIAL);
      setNombreArchivo('');
      setMostrarSubida(false);
      await cargarPendientes();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || t('modFotos.errSubida') });
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
      setMensaje({ tipo: 'ok', texto: t('modFotos.okAprobada') });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || t('modFotos.errAprobada') });
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
      setMensaje({ tipo: 'ok', texto: t('modFotos.okRechazada') });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || t('modFotos.errRechazada') });
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
      setMensaje({ tipo: 'error', texto: err.message || t('modFotos.errReconcil') });
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
            <span>{t('modFotos.titulo', { n: pendientes.length })}</span>
          </h2>
          <p className="text-xs opacity-75">
            {t('modFotos.subtitulo')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={Plus}
            onClick={() => setMostrarSubida((v) => !v)}
          >
            {mostrarSubida ? t('modFotos.btnCerrarForm') : t('modFotos.btnSubirFoto')}
          </Button>
          <Button size="sm" variant="secondary" icon={FileCheck} onClick={handleReconciliar} disabled={cargando}>
            {t('modFotos.btnReconciliar')}
          </Button>
          <Button size="sm" variant="primary" icon={RefreshCw} onClick={cargarPendientes} disabled={cargando}>
            {cargando ? t('modFotos.btnCargando') : t('modFotos.btnActualizar')}
          </Button>
        </div>
      </Card>

      {mostrarSubida && (
        <Card className="p-4 text-left space-y-3">
          <h3 className="font-serif font-bold text-sm flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#F27B91]" />
            <span>{t('modFotos.formTitulo')}</span>
          </h3>
          <form onSubmit={handleSubirFoto} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <Input
              label={t('modFotos.lblPlaceId')}
              value={formSubida.place_id}
              onChange={(e) => setFormSubida({ ...formSubida, place_id: e.target.value })}
              required
            />
            <Input
              label={t('modFotos.lblSucursal')}
              value={formSubida.branch_label}
              onChange={(e) => setFormSubida({ ...formSubida, branch_label: e.target.value })}
            />
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold opacity-80">{t('modFotos.lblTipoToma')}</label>
              <select
                value={formSubida.photo_type}
                onChange={(e) => setFormSubida({ ...formSubida, photo_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-current/20 bg-transparent text-xs"
              >
                <option value="fachada">{t('modFotos.optFachada')}</option>
                <option value="terraza">{t('modFotos.optTerraza')}</option>
                <option value="interior">{t('modFotos.optInterior')}</option>
                <option value="plato">{t('modFotos.optPlato')}</option>
                <option value="otro">{t('modFotos.optOtro')}</option>
              </select>
            </div>
            <Input
              label={t('modFotos.lblAutorForm')}
              value={formSubida.author}
              onChange={(e) => setFormSubida({ ...formSubida, author: e.target.value })}
              required
            />
            <Input
              label={t('modFotos.lblLicenciaForm')}
              value={formSubida.license}
              onChange={(e) => setFormSubida({ ...formSubida, license: e.target.value })}
              required
            />
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold opacity-80">
                {t('modFotos.lblArchivo')}
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleArchivoChange}
                className="w-full text-xs file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#501228] file:text-white file:font-semibold"
                required
              />
              {nombreArchivo && <span className="block text-[10px] opacity-70">{t('modFotos.seleccionadoArchivo', { nombre: nombreArchivo })}</span>}
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between pt-2 border-t border-current/10">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={formSubida.is_cover}
                  onChange={(e) => setFormSubida({ ...formSubida, is_cover: e.target.checked })}
                  className="accent-[#501228]"
                />
                <span>{t('modFotos.chkPortada')}</span>
              </label>
              <Button type="submit" size="sm" variant="primary" icon={Upload} disabled={subiendo}>
                {subiendo ? t('modFotos.btnValidandoSubiendo') : t('modFotos.btnSubirRevision')}
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
          <p className="font-bold">{t('modFotos.reconcilTitulo')}</p>
          <p className="opacity-80">
            {t('modFotos.reconcilResumen', {
              total: reconciliacion.total_checked,
              ok: reconciliacion.healthy_count,
              missing: reconciliacion.missing_in_storage?.length || 0
            })}
          </p>
        </Card>
      )}

      {pendientes.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <ShieldAlert className="w-7 h-7 mx-auto opacity-60" />
          <p className="text-sm font-semibold">{t('modFotos.vacioTitulo')}</p>
          <p className="text-xs opacity-70">
            {t('modFotos.vacioSub')}
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
                    alt={foto.alt_text || foto.restaurant_name || 'Preview'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-slate-400 px-4 text-center">
                    {t('modFotos.previewNoDisp')}
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
                      {foto.branch_label || t('modFotos.sucursalPrincipal')} &bull; {foto.photo_type || t('modFotos.optOtro')}
                    </p>
                  </div>
                  <Badge variant="warning">{t('modFotos.badgePendiente')}</Badge>
                </div>

                <div className="space-y-0.5 text-[11px] opacity-80">
                  <p><strong>{t('modFotos.lblAutorCard')}</strong> {foto.author || t('modFotos.noIndicado')}</p>
                  <p><strong>{t('modFotos.lblLicenciaCard')}</strong> {foto.license || t('modFotos.sinLicencia')}</p>
                  {foto.width && foto.height && (
                    <p><strong>{t('modFotos.lblDimensiones')}</strong> {foto.width}x{foto.height} px</p>
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
                    {t('modFotos.btnAprobar')}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={XCircle}
                    disabled={procesandoId === foto.id}
                    onClick={() => handleRechazar(foto.id)}
                    className="flex-1 justify-center"
                  >
                    {t('modFotos.btnRechazar')}
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
