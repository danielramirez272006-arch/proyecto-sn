import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarnetDigital } from '../components/CarnetDigital';
import { QrCollar } from '../components/QrCollar';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Tabla, Tr, Td } from '../components/ui/Tabla';
import { AnimacionCierreSesion } from '../components/AnimacionCierreSesion';
import { ModalConfirmarCierre } from '../components/ModalConfirmarCierre';
import { useSesion } from '../hooks/useSesion';
import {
  Dog,
  ShieldCheck,
  Heart,
  Calendar,
  FileText,
  MapPin,
  Volume2,
  Phone,
  Syringe,
  AlertCircle,
  ExternalLink,
  Plus,
  LogOut,
  UserCheck
} from 'lucide-react';

export function Perfil() {
  const { mascota, usuario, isLoggedIn, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  const [tabPerfil, setTabPerfil] = useState('pasaporte'); // 'pasaporte' | 'vacunacion' | 'rutas' | 'collar'
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);

  const handleSolicitarCierre = () => {
    setModalConfirmacionAbierto(true);
  };

  const handleConfirmarSalida = () => {
    setModalConfirmacionAbierto(false);
    setAnimandoSalida(true);
  };

  const handleCompletarSalida = () => {
    cerrarSesion();
    setAnimandoSalida(false);
    navigate('/acceso');
  };

  return (
    <div className="w-full py-8 md:py-16">
      {/* Modal de confirmación y advertencia */}
      <ModalConfirmarCierre
        isOpen={modalConfirmacionAbierto}
        onClose={() => setModalConfirmacionAbierto(false)}
        onConfirmar={handleConfirmarSalida}
        nombreUsuario={usuario?.nombre}
      />

      {/* Animación de cierre de sesión hacia /acceso */}
      <AnimacionCierreSesion
        visible={animandoSalida}
        nombreUsuario={usuario?.nombre}
        onCompletado={handleCompletarSalida}
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-10">
        {/* Cabecera del Perfil Canino */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200/80 gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src="/imagenes/copiloto-bruno.jpg"
                alt={mascota.nombre}
                className="w-16 h-16 rounded-3xl object-cover shadow-md ring-2 ring-[#501228]/25"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" title="Chip activo en red GAM" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-3xl text-[#111827]">
                  {mascota.nombre}
                </h1>
                <Badge variant="burdeos">Bóveda Pet-OS</Badge>
                {isLoggedIn && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                    <UserCheck className="w-3 h-3 text-emerald-600" />
                    <span>{usuario?.nombre || 'Tutor'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {mascota.raza} &bull; {mascota.pesoKg} kg &bull; Chip: <span className="font-mono text-slate-700">{mascota.microchipId}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center gap-1.5 font-medium shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Póliza INS Vigente</span>
            </div>

            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleSolicitarCierre}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/90 border border-rose-200/80 shadow-2xs transition-all active:scale-[0.98]"
                title="Cerrar sesión activa y volver al acceso"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Cerrar Sesión</span>
              </button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/acceso')}
              >
                Iniciar Sesión
              </Button>
            )}
          </div>
        </div>

        {/* Selector de Pestañas del Perfil */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto gotox-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setTabPerfil('pasaporte')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              tabPerfil === 'pasaporte'
                ? 'border-[#501228] text-[#501228]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Pasaporte & Biometría
          </button>
          <button
            type="button"
            onClick={() => setTabPerfil('vacunacion')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              tabPerfil === 'vacunacion'
                ? 'border-[#501228] text-[#501228]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Cartilla de Vacunación ({mascota.vacunacion.length})
          </button>
          <button
            type="button"
            onClick={() => setTabPerfil('rutas')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              tabPerfil === 'rutas'
                ? 'border-[#501228] text-[#501228]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Rutas Favoritas
          </button>
          <button
            type="button"
            onClick={() => setTabPerfil('collar')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              tabPerfil === 'collar'
                ? 'border-[#501228] text-[#501228]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Collar Inteligente QR
          </button>
        </div>

        {/* CONTENIDO PESTAÑA 1: PASAPORTE Y BIOMETRÍA */}
        {tabPerfil === 'pasaporte' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Tarjeta 3D */}
            <div className="lg:col-span-5 space-y-4">
              <CarnetDigital mascota={mascota} interactivo={true} />
              <p className="text-[11px] text-center text-slate-400">
                Pasa el ratón por encima o haz click en la credencial para alternar vistas
              </p>
            </div>

            {/* Datos Clínicos y Póliza */}
            <div className="lg:col-span-7 space-y-5">
              {/* Seguro Médico */}
              <Card className="p-6 border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#501228]" />
                    <h3 className="font-serif font-bold text-lg text-[#111827]">
                      {mascota.polizaMedica.aseguradora}
                    </h3>
                  </div>
                  <Badge variant="success">{mascota.polizaMedica.estado}</Badge>
                </div>

                {/* Banner de Cuidado Veterinario Certificado */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-200/70 shadow-2xs">
                  <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-900">
                    <img
                      src="/imagenes/boveda-veterinaria.jpg"
                      alt="Cuidado Veterinario en Hospital Veterinario Escalante"
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 text-white">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300 block">
                        Red Hospitalaria GAM Certificada
                      </span>
                      <p className="font-serif font-bold text-sm sm:text-base text-white">
                        {mascota.tutor.veterinariaCabecera}
                      </p>
                      <p className="text-[11px] text-slate-200">
                        Cobertura hospitalaria directa, triage 24/7 y telemetría de signos vitales sincronizada.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block uppercase text-[10px]">Número de Póliza</span>
                    <strong className="text-slate-800 font-mono text-xs">{mascota.polizaMedica.numeroPoliza}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block uppercase text-[10px]">Cobertura Anual</span>
                    <strong className="text-emerald-700 text-xs">{mascota.polizaMedica.coberturaEmergencias}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block uppercase text-[10px]">Copago Clínico</span>
                    <strong className="text-slate-800 text-xs">{mascota.polizaMedica.copago}</strong>
                  </div>
                </div>

                <div className="p-3 bg-[#FDF2F4] rounded-xl border border-[#F9E2E8] flex items-center justify-between text-xs text-[#501228]">
                  <span>Asistencia de Urgencias 24h: <strong>{mascota.polizaMedica.asistencia24h}</strong></span>
                  <a href="tel:+5068007384357">
                    <Button size="sm" variant="primary">Llamar Triage</Button>
                  </a>
                </div>
              </Card>

              {/* Tutor & Ficha Veterinaria */}
              <Card className="p-6 border-slate-200/80 space-y-4">
                <h3 className="font-serif font-bold text-lg text-[#111827] pb-2 border-b border-slate-100">
                  Tutor Legal y Contacto de Emergencia
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 block uppercase text-[10px]">Tutor Responsable</span>
                    <p className="font-semibold text-slate-800">{mascota.tutor.nombre}</p>
                    <p className="text-slate-500">Cédula: {mascota.tutor.cedula}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block uppercase text-[10px]">Teléfonos de Urgencia</span>
                    <p className="font-semibold text-[#501228]">{mascota.tutor.telefono}</p>
                    <p className="text-slate-500">Secundario: {mascota.tutor.telefonoEmergencia}</p>
                  </div>
                  <div className="sm:col-span-2 space-y-1 pt-2 border-t border-slate-100">
                    <span className="text-slate-400 block uppercase text-[10px]">Clínica Veterinaria de Cabecera</span>
                    <p className="font-semibold text-slate-800">{mascota.tutor.veterinariaCabecera}</p>
                    <p className="text-slate-500">{mascota.tutor.direccion}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 2: CARTILLA DE VACUNACIÓN */}
        {tabPerfil === 'vacunacion' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif font-bold text-2xl text-[#111827]">
                  Registro Oficial de Inmunización
                </h2>
                <p className="text-xs text-slate-500">
                  Certificado por el Colegio de Médicos Veterinarios de Costa Rica.
                </p>
              </div>
              <Badge variant="success">Todas al día</Badge>
            </div>

            <Tabla headers={['Vacuna o Tratamiento', 'Última Aplicación', 'Próxima Dosis Requerida', 'Estado']}>
              {mascota.vacunacion.map((v, i) => (
                <Tr key={i}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Syringe className="w-4 h-4 text-[#501228]" />
                      <span className="font-semibold text-slate-800">{v.nombre}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-600">{v.fecha}</span>
                  </Td>
                  <Td>
                    <span className="text-xs font-semibold text-slate-800">{v.proxima}</span>
                  </Td>
                  <Td>
                    <Badge variant="success">{v.estado}</Badge>
                  </Td>
                </Tr>
              ))}
            </Tabla>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 3: RUTAS FAVORITAS */}
        {tabPerfil === 'rutas' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif font-bold text-2xl text-[#111827]">
                Senderos y Rutas Urbanas Registradas
              </h2>
              <p className="text-xs text-slate-500">
                Itinerarios validados con baja radiación en aceras y sombra continua.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mascota.rutasFavoritas.map((ruta, i) => (
                <Card key={i} className="p-5 border-slate-200/80 space-y-3 bg-white shadow-sm">
                  <div className="flex items-center gap-2 text-[#501228]">
                    <MapPin className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Circuito Seguro #{i + 1}</span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-[#111827]">
                    {ruta.nombre}
                  </h3>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Distancia</span>
                      <strong className="text-slate-800">{ruta.longitudKm} km</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Ruido Medio</span>
                      <strong className="text-slate-800">{ruta.decibeliosPromedio} dB</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Sombra</span>
                      <strong className="text-emerald-700">{ruta.zonasSombra}</strong>
                    </div>
                  </div>

                  <Button variant="secondary" size="sm" className="w-full justify-center">
                    Cargar en Copiloto
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 4: COLLAR QR */}
        {tabPerfil === 'collar' && (
          <div className="max-w-2xl mx-auto">
            <QrCollar mascota={mascota} />
          </div>
        )}
      </div>
    </div>
  );
}

