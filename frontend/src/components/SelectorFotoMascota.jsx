import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, Dog, Link2 } from 'lucide-react';
import { useTema } from '../context/TemaContext';

/**
 * Comprime y redimensiona la imagen seleccionada en el navegador a JPEG máx 512px
 * para guardar fotos de mascotas de forma ligera tanto en backend SQLite/Postgres como en localStorage.
 */
function comprimirImagenArchivo(file, maxDim = 512, calidad = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
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

export function SelectorFotoMascota({ valor, onChange, nombreMascota = 'tu mascota' }) {
  const { esClaro, esMorado } = useTema();
  const inputRef = useRef(null);
  const [mostrarUrl, setMostrarUrl] = useState(false);
  const [urlTemporal, setUrlTemporal] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [errorFoto, setErrorFoto] = useState('');

  const handleArchivoSeleccionado = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorFoto('');

    if (!file.type.startsWith('image/')) {
      setErrorFoto('Por favor selecciona una imagen (JPG, PNG o WebP).');
      return;
    }

    setProcesando(true);
    try {
      const dataUrl = await comprimirImagenArchivo(file);
      onChange && onChange(dataUrl);
    } catch (err) {
      setErrorFoto(err?.message || 'Error al procesar la imagen.');
    } finally {
      setProcesando(false);
      e.target.value = '';
    }
  };

  const handleAplicarUrl = () => {
    const limpia = urlTemporal.trim();
    if (!limpia) return;
    if (!limpia.startsWith('http://') && !limpia.startsWith('https://') && !limpia.startsWith('/')) {
      setErrorFoto('Ingresa una URL válida que empiece con https://');
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
        {/* Vista previa de foto */}
        <div
          onClick={() => inputRef.current?.click()}
          title="Cambiar foto del perro"
          className={`w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 flex items-center justify-center cursor-pointer transition-all hover:opacity-90 ${
            esClaro ? 'bg-white border-[#501228]/25' : 'bg-[#0D131F] border-[#F27B91]/40'
          }`}
        >
          {valor ? (
            <img
              src={valor}
              alt={`Foto de ${nombreMascota}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <Dog className="w-7 h-7 opacity-45" />
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold block">Foto de tu perro (Opcional)</span>
          </div>
          <p className="text-[11px] opacity-70 leading-snug">
            Se mostrará en su carnet digital y en su ficha personal.
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
              <span>{procesando ? 'Procesando...' : valor ? 'Cambiar foto' : 'Subir foto'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMostrarUrl(!mostrarUrl)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border border-current/20 hover:bg-current/5 transition-all"
            >
              <Link2 className="w-3 h-3" />
              <span>Usar enlace</span>
            </button>

            {valor && (
              <button
                type="button"
                onClick={() => onChange && onChange(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 border border-rose-500/25 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                <span>Quitar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {mostrarUrl && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="url"
            value={urlTemporal}
            onChange={(e) => setUrlTemporal(e.target.value)}
            placeholder="https://ejemplo.com/mi-perro.jpg"
            className="flex-1 px-3 py-1.5 rounded-xl text-xs border border-current/20 bg-transparent outline-none"
          />
          <button
            type="button"
            onClick={handleAplicarUrl}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#501228] text-white hover:bg-[#6E1E3A]"
          >
            Aplicar
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
