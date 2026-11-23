import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, Dog, Link2, Sparkles, Check } from 'lucide-react';
import { useTema } from '../context/TemaContext';
import { useIdioma } from '../context/IdiomaContext';
import {
  PERFILES_RAZAS_CANINAS,
  buscarPerfilRaza
} from '../servicios/razasPerrosApi';

/**
 * Comprime y redimensiona la imagen seleccionada en el navegador a JPEG máx 512px
 * para guardar fotos de mascotas de forma ligera tanto en backend SQLite/Postgres como en localStorage.
 */
function comprimirImagenArchivo(file, msgs = {}, maxDim = 512, calidad = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(msgs.errLeer || 'No se pudo leer el archivo seleccionado.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(msgs.errNoImagen || 'El archivo no es una imagen válida.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', calidad));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function SelectorFotoMascota({
  valor,
  onChange,
  nombreMascota,
  razaActual = '',
  onSeleccionarPerfilRaza
}) {
  const { esClaro, esMorado } = useTema();
  const { t } = useIdioma();
  const nombreMostrado = nombreMascota || t('comun.tuMascotaDefault');
  const inputRef = useRef(null);
  const [mostrarUrl, setMostrarUrl] = useState(false);
  const [mostrarCatalogoRazas, setMostrarCatalogoRazas] = useState(false);
  const [razaSeleccionadaId, setRazaSeleccionadaId] = useState(() => {
    const p = buscarPerfilRaza(razaActual);
    return p?.id || PERFILES_RAZAS_CANINAS[0].id;
  });
  const [urlTemporal, setUrlTemporal] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [errorFoto, setErrorFoto] = useState('');

  const perfilRazaActivo =
    PERFILES_RAZAS_CANINAS.find((r) => r.id === razaSeleccionadaId) ||
    buscarPerfilRaza(razaActual) ||
    PERFILES_RAZAS_CANINAS[0];

  const handleElegirFotoDeRaza = (fotoUrl, perfil = perfilRazaActivo) => {
    setErrorFoto('');
    onChange && onChange(fotoUrl);
    if (onSeleccionarPerfilRaza && perfil) {
      onSeleccionarPerfilRaza({
        raza: perfil.nombre,
        pesoKg: perfil.pesoPromedioKg,
        colorManto: perfil.colorMantoSugerido,
        foto: fotoUrl,
        perfilRaza: perfil
      });
    }
  };

  const handleArchivoSeleccionado = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorFoto('');

    if (!file.type.startsWith('image/')) {
      setErrorFoto(t('selectorFoto.errTipoImagen'));
      return;
    }

    setProcesando(true);
    try {
      const dataUrl = await comprimirImagenArchivo(file, {
        errLeer: t('selectorFoto.errLeer'),
        errNoImagen: t('selectorFoto.errNoImagen')
      });
      onChange && onChange(dataUrl);
    } catch (err) {
      setErrorFoto(err?.message || t('selectorFoto.errProcesar'));
    } finally {
      setProcesando(false);
      e.target.value = '';
    }
  };

  const handleAplicarUrl = () => {
    const limpia = urlTemporal.trim();
    if (!limpia) return;
    if (!limpia.startsWith('http://') && !limpia.startsWith('https://') && !limpia.startsWith('/')) {
      setErrorFoto(t('selectorFoto.errUrlValida'));
      return;
    }
    setErrorFoto('');
    onChange && onChange(limpia);
    setMostrarUrl(false);
    setUrlTemporal('');
  };

  return (
    <div
      className={`p-3.5 rounded-2xl border space-y-3 ${
        esClaro
          ? 'bg-slate-50/90 border-slate-200/80 text-slate-800'
          : esMorado
          ? 'bg-[#24111E] border-[#F27B91]/25 text-[#FDF2F6]'
          : 'bg-[#162032] border-white/10 text-[#E8EDF5]'
      }`}
    >
      <div className="flex items-center gap-3.5">
        {/* Vista previa de foto con dimensiones fijas garantizadas */}
        <div
          onClick={() => inputRef.current?.click()}
          title={t('selectorFoto.cambiarTitle')}
          style={{ width: '64px', height: '64px', minWidth: '64px', minHeight: '64px' }}
          className={`w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 flex items-center justify-center cursor-pointer transition-all hover:opacity-90 ${
            esClaro ? 'bg-white border-[#501228]/25' : 'bg-[#0D131F] border-[#F27B91]/40'
          }`}
        >
          {valor ? (
            <img
              src={valor}
              alt={t('selectorFoto.altFoto', { nombre: nombreMostrado })}
              style={{ width: '64px', height: '64px', objectFit: 'cover' }}
              className="w-16 h-16 object-cover block"
            />
          ) : (
            <Dog className="w-7 h-7 opacity-45" />
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold block">{t('selectorFoto.titulo')}</span>
          </div>
          <p className="text-[11px] opacity-70 leading-snug">
            {t('selectorFoto.subtitulo')}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleArchivoSeleccionado}
              className="hidden"
            />
            <button
              type="button"
              disabled={procesando}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/30 transition-all"
            >
              {procesando ? <Upload className="w-3 h-3 animate-bounce" /> : <Camera className="w-3 h-3" />}
              <span>{procesando ? t('selectorFoto.procesando') : valor ? t('selectorFoto.cambiarFoto') : t('selectorFoto.subirFoto')}</span>
            </button>

            <button
              type="button"
              onClick={() => setMostrarCatalogoRazas(!mostrarCatalogoRazas)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-[#F27B91]/15 text-[#F27B91] border border-[#F27B91]/35 hover:bg-[#F27B91]/25 transition-all"
            >
              <Sparkles className="w-3 h-3" />
              <span>{t('selectorFoto.fotosPorRaza')}</span>
            </button>

            <button
              type="button"
              onClick={() => setMostrarUrl(!mostrarUrl)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border border-current/20 hover:bg-current/5 transition-all"
            >
              <Link2 className="w-3 h-3" />
              <span>{t('selectorFoto.usarEnlace')}</span>
            </button>

            {valor && (
              <button
                type="button"
                onClick={() => onChange && onChange(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 border border-rose-500/25 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                <span>{t('selectorFoto.quitar')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Apartado de Fotos por Raza: al elegir la raza muestra directamente sus fotos para escoger */}
      {mostrarCatalogoRazas && (
        <div className="p-3.5 rounded-xl border border-[#F27B91]/30 bg-current/5 space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] font-bold flex items-center gap-1.5 text-[#F27B91]">
              <Dog className="w-3.5 h-3.5" />
              <span>{t('selectorFoto.elegirRaza')}</span>
            </span>
            <select
              value={razaSeleccionadaId}
              onChange={(e) => {
                const nuevoId = e.target.value;
                setRazaSeleccionadaId(nuevoId);
                const p = PERFILES_RAZAS_CANINAS.find((r) => r.id === nuevoId);
                if (p && p.fotos?.[0]) {
                  handleElegirFotoDeRaza(p.fotos[0], p);
                }
              }}
              className="px-3 py-1.5 rounded-xl text-xs border border-current/20 bg-transparent outline-none font-semibold"
            >
              {PERFILES_RAZAS_CANINAS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} ({r.rangoPeso})
                </option>
              ))}
            </select>
          </div>

          {/* Galería de fotos de la raza seleccionada (sin botón de recargar) */}
          <div className="grid grid-cols-3 gap-2.5">
            {(perfilRazaActivo?.fotos || []).map((fotoUrl, idx) => {
              const seleccionada = valor === fotoUrl;
              return (
                <button
                  key={fotoUrl}
                  type="button"
                  onClick={() => handleElegirFotoDeRaza(fotoUrl, perfilRazaActivo)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all group ${
                    seleccionada
                      ? 'border-[#F27B91] ring-2 ring-[#F27B91]/40 scale-[1.01]'
                      : 'border-current/15 opacity-80 hover:opacity-100 hover:border-[#F27B91]/50'
                  }`}
                  style={{ height: '76px' }}
                >
                  <img
                    src={fotoUrl}
                    alt={t('selectorFoto.opcionAlt', { raza: perfilRazaActivo.nombre, n: idx + 1 })}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/imagenes/copiloto-bruno.jpg';
                    }}
                    style={{ width: '100%', height: '76px', objectFit: 'cover' }}
                    className="w-full h-full object-cover block"
                  />
                  <span
                    className={`absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                      seleccionada
                        ? 'bg-[#501228] text-white border border-[#F27B91]/50'
                        : 'bg-black/65 text-white'
                    }`}
                  >
                    {seleccionada && <Check className="w-2.5 h-2.5 text-[#F27B91]" />}
                    <span>{seleccionada ? t('selectorFoto.elegida') : t('selectorFoto.fotoNum', { n: idx + 1 })}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {perfilRazaActivo && (
            <div className="text-[11px] opacity-85 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5 border-t border-current/10">
              <div>
                <strong>{t('selectorFoto.temperamento')}</strong> {perfilRazaActivo.temperamento}
              </div>
              <div>
                <strong>{t('selectorFoto.toleranciaGam')}</strong> {perfilRazaActivo.toleranciaCalor}
              </div>
            </div>
          )}
        </div>
      )}

      {mostrarUrl && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="url"
            value={urlTemporal}
            onChange={(e) => setUrlTemporal(e.target.value)}
            placeholder={t('selectorFoto.urlPlaceholder')}
            className="flex-1 px-3 py-1.5 rounded-xl text-xs border border-current/20 bg-transparent outline-none"
          />
          <button
            type="button"
            onClick={handleAplicarUrl}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#501228] text-white hover:bg-[#6E1E3A]"
          >
            {t('selectorFoto.aplicar')}
          </button>
        </div>
      )}

      {errorFoto && (
        <p className="text-[11px] text-rose-500 font-medium">{errorFoto}</p>
      )}
    </div>
  );
}

export default SelectorFotoMascota;
