import { useState, useEffect } from 'react';

/**
 * Simulación de telemetría urbana en tiempo real para el GAM (San José Este / Escalante / Sabana)
 */
export function useTelemetria() {
  const [telemetria, setTelemetria] = useState({
    temperaturaAsfalto: 23.2,
    temperaturaAmbiente: 22.0,
    ventanaSecaMinutos: 42,
    aforoAcusticoDb: 48,
    indiceUv: 3.1,
    humedadRelativa: 67,
    calidadAireIca: 24,
    nivelRiesgoAsfalto: "Seguro", // "Seguro" | "Precaución" | "Crítico"
    condicionClimatica: "Nubosidad parcial fresca",
    ultimaActualizacion: new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    estacionActiva: "Sensor San José Este - Estación Escalante Metropolitano"
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetria(prev => {
        // Micro-oscilación realista de temperatura de asfalto (entre 22.4 y 24.1 °C)
        const deltaTemp = (Math.random() - 0.5) * 0.3;
        const nuevaTempAsfalto = parseFloat(Math.min(25.5, Math.max(21.8, prev.temperaturaAsfalto + deltaTemp)).toFixed(1));

        // Oscilación acústica urbana de San José (entre 44 y 52 dB)
        const deltaDb = Math.floor((Math.random() - 0.48) * 3);
        const nuevoAforoAcustico = Math.min(56, Math.max(43, prev.aforoAcusticoDb + deltaDb));

        // Ventana seca con cuenta progresiva y pequeñas variaciones
        const nuevoMinutos = prev.ventanaSecaMinutos > 5 
          ? prev.ventanaSecaMinutos - (Math.random() > 0.85 ? 1 : 0)
          : 45;

        // Evaluación de riesgo para almohadillas caninas
        let riesgo = "Seguro";
        if (nuevaTempAsfalto >= 28) {
          riesgo = "Crítico";
        } else if (nuevaTempAsfalto >= 25) {
          riesgo = "Precaución";
        }

        return {
          ...prev,
          temperaturaAsfalto: nuevaTempAsfalto,
          temperaturaAmbiente: parseFloat((nuevaTempAsfalto - 1.2).toFixed(1)),
          aforoAcusticoDb: nuevoAforoAcustico,
          ventanaSecaMinutos: nuevoMinutos,
          humedadRelativa: Math.min(78, Math.max(62, prev.humedadRelativa + (Math.random() > 0.5 ? 1 : -1))),
          calidadAireIca: Math.min(32, Math.max(20, prev.calidadAireIca + (Math.random() > 0.7 ? 1 : -1))),
          nivelRiesgoAsfalto: riesgo,
          ultimaActualizacion: new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
      });
    }, 3200);

    return () => clearInterval(timer);
  }, []);

  return telemetria;
}

