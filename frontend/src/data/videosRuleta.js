/**
 * Catálogo inicial de videos educativos verificados para cuidar a tu mascota (YouTube).
 * Sincronizado con el módulo backend /api/pet-videos y Google Gemini.
 */
export const VIDEOS_RULETA = [
  {
    id: 'c2eWkJ3bA78',
    dbId: 'vid_seed_perros_higiene',
    titulo: 'Cómo bañar y cuidar el pelaje de tu perro paso a paso',
    categoria: 'Perros • Higiene',
    anio: 2024,
    especie: 'perros',
    tema: 'higiene',
    duracion: 315,
    resumen: 'Guía veterinaria paso a paso sobre temperatura del agua, frecuencia de baño, secado y cepillado dental canino.',
    fragmentos: [
      {
        pregunta: '¿A qué temperatura debe estar el agua para bañar a mi perro?',
        respuesta: 'El agua debe estar tibia (entre 37°C y 38°C), similar a su temperatura corporal, evitando cambios bruscos.',
        inicio: 40
      },
      {
        pregunta: '¿Cada cuánto tiempo debo bañar a mi perro y cepillar sus dientes?',
        respuesta: 'Báñalo cada 3 o 4 semanas con champú neutro canino y cepilla sus dientes de 2 a 3 veces por semana.',
        inicio: 120
      }
    ]
  },
  {
    id: 'NoifKxNNwlg',
    dbId: 'vid_seed_gatos_auxilios',
    titulo: 'Primeros auxilios para gatos - Salud felina Royal Canin',
    categoria: 'Gatos • Auxilios',
    anio: 2024,
    especie: 'gatos',
    tema: 'primeros_auxilios',
    duracion: 111,
    resumen: 'Protocolo básico de primeros auxilios en gatos ante heridas, atragantamientos e intoxicaciones domésticas.',
    fragmentos: [
      {
        pregunta: '¿Qué hacer ante una emergencia o primeros auxilios con mi gato en casa?',
        respuesta: 'Mantén la calma, envuelve al gato suavemente en una toalla, evalúa su respiración y acude al veterinario.',
        inicio: 15
      },
      {
        pregunta: '¿Cómo limpiar una herida superficial en la pata de mi mascota?',
        respuesta: 'Lava con suero fisiológico estéril y presiona suavemente con una gasa limpia durante 2 minutos.',
        inicio: 65
      }
    ]
  },
  {
    id: 'MHLTo88pZyo',
    dbId: 'vid_seed_perros_auxilios',
    titulo: 'Primeros Auxilios para PERROS: Qué hacer en cada caso',
    categoria: 'Perros • Urgencias',
    anio: 2023,
    especie: 'perros',
    tema: 'primeros_auxilios',
    duracion: 236,
    resumen: 'Maniobras de emergencia canina ante atragantamiento, intoxicación por chocolate y golpes de calor.',
    fragmentos: [
      {
        pregunta: '¿Qué hago si mi perro comió chocolate o tiene síntomas de intoxicación?',
        respuesta: 'El chocolate contiene teobromina tóxica. Conserva la envoltura para calcular la dosis y acude de urgencia al veterinario.',
        inicio: 30
      },
      {
        pregunta: '¿Cómo actuar si mi perro se atraganta con un objeto o comida?',
        respuesta: 'Revisa su boca con cuidado y, si no respira, aplica compresiones abdominales detrás de las costillas.',
        inicio: 110
      }
    ]
  },
  {
    id: '4VSJkh3rQpI',
    dbId: 'vid_seed_gatos_rcp',
    titulo: 'RCP y maniobra de Heimlich en mascotas (Atragantamiento)',
    categoria: 'RCP & Auxilios',
    anio: 2024,
    especie: 'gatos',
    tema: 'primeros_auxilios',
    duracion: 636,
    resumen: 'Qué hacer si tu gato o perro no respira o se está ahogando: maniobra de Heimlich y reanimación cardiopulmonar.',
    fragmentos: [
      {
        pregunta: '¿Cómo hacer la maniobra de Heimlich si mi mascota se ahoga?',
        respuesta: 'Coloca al animal de lado o sostenlo firme y aplica compresiones suaves bajo las costillas hacia adelante.',
        inicio: 95
      }
    ]
  },
  {
    id: 'SUjNL5V1XTs',
    dbId: 'vid_seed_perros_guia',
    titulo: 'Primeros auxilios caninos: Guía veterinaria esencial',
    categoria: 'Salud Canina',
    anio: 2024,
    especie: 'perros',
    tema: 'primeros_auxilios',
    duracion: 573,
    resumen: 'Guía completa de primeros auxilios caninos: control de hemorragias, fracturas, vendajes y botiquín básico.',
    fragmentos: [
      {
        pregunta: '¿Qué debe llevar un botiquín de primeros auxilios para perros?',
        respuesta: 'Gasas estériles, suero fisiológico, vendas elásticas, termómetro digital y el teléfono de tu veterinario 24h.',
        inicio: 45
      }
    ]
  },
  {
    id: 'pKMWGJVqwUA',
    dbId: 'vid_seed_bienestar',
    titulo: 'Cuidados preventivos y bienestar integral en mascotas',
    categoria: 'Bienestar Animal',
    anio: 2023,
    especie: 'general',
    tema: 'cuidado_general',
    duracion: 732,
    resumen: 'Prevención veterinaria, revisión periódica, signos de alerta temprana y cuidados básicos en casa para perros y gatos.',
    fragmentos: [
      {
        pregunta: '¿Cuáles son los signos tempranos de alerta en una mascota?',
        respuesta: 'Pérdida de apetito, letargo prolongado, vómitos repetidos o encías pálidas requieren valoración veterinaria.',
        inicio: 80
      }
    ]
  }
];
