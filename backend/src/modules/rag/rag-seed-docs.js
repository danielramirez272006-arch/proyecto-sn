/**
 * Base de conocimiento curada inicial para el motor RAG de Synodos Pet OS (Costa Rica).
 * Se siembra de forma idempotente en la tabla rag_documents (Supabase PostgreSQL / SQLite).
 */
const BUILTIN_RAG_DOCUMENTS = [
  {
    id: 'rag_cr_emergencias_vet',
    title: 'Emergencias Veterinarias y Primeros Auxilios en Costa Rica (GAM)',
    category: 'salud_emergencias',
    source_type: 'builtin',
    source_ref: 'synodos://docs/emergencias-vet-cr',
    tags: 'emergencia,veterinario,urgencias,hospital una,911,golpe de calor,intoxicacion,costa rica',
    content: [
      'En Costa Rica, ante una emergencia veterinaria grave (convulsiones, dificultad respiratoria, sangrado activo, intoxicación, golpe de calor o trauma), se debe acudir de inmediato a un hospital veterinario 24 horas.',
      'Referencias principales en el GAM: Hospital de Especies Menores y Silvestres de la Universidad Nacional (UNA, Heredia) teléfono 2277-3600; emergencias generales en Costa Rica 9-1-1.',
      'Signos de golpe de calor en perros: jadeo excesivo, encías rojo brillante o pálidas, babeo espeso, tambaleo, vómito o colapso. Primer auxilio inmediato mientras se traslada al veterinario: mover a sombra ventilada, mojar patas, abdomen e ingle con agua fresca (nunca agua helada ni hielo directo) y ofrecer sorbos pequeños de agua.',
      'Argos y Synodos Pet OS brindan orientación informativa y nunca sustituyen un diagnóstico ni tratamiento médico veterinario presencial.',
    ].join('\n\n'),
  },
  {
    id: 'rag_cr_toxicos_mascotas',
    title: 'Alimentos y Plantas Tóxicas Comunes para Perros y Gatos',
    category: 'salud_prevencion',
    source_type: 'builtin',
    source_ref: 'synodos://docs/toxicos-mascotas',
    tags: 'toxico,veneno,chocolate,uvas,cebolla,ajo,xilitol,aguacate,cafe,lirios,perro,gato',
    content: [
      'Alimentos peligrosos o tóxicos para perros y gatos: chocolate y cacao (teobromina), café y cafeína, uvas y pasas (riesgo de fallo renal agudo), cebolla, ajo y cebollino, xilitol (edulcorante en chicles y productos sin azúcar), nueces de macadamia, alcohol y masa cruda con levadura.',
      'En gatos, los lirios (Lilium y Hemerocallis) son altamente nefrotóxicos incluso en cantidades mínimas de polen o agua del florero.',
      'Si una mascota ingirió una sustancia sospechosa, NO inducir el vómito sin indicación de un médico veterinario; guardar el empaque o foto de la planta y trasladar a urgencias veterinarias de inmediato.',
    ].join('\n\n'),
  },
  {
    id: 'rag_cr_asfalto_clima_gam',
    title: 'Guía de Clima Urbano GAM, Asfalto Caliente y Aguaceros Ticos',
    category: 'clima_paseos',
    source_type: 'builtin',
    source_ref: 'synodos://docs/clima-asfalto-gam',
    tags: 'asfalto,calor,lluvia,aguacero,almohadillas,patas,hidratacion,paseo,gam,san jose',
    content: [
      'Regla de los 5 segundos para paseos en el GAM: coloca el dorso de tu mano sobre la acera o asfalto durante 5 segundos; si quema tu mano, puede quemar las almohadillas de tu perro.',
      'Cuando el ambiente supera los 28 °C a pleno sol en San José, Escazú, Santa Ana o Alajuela, el asfalto negro puede superar los 48–55 °C. Se recomienda pasear antes de las 9:00 a.m. o después de las 4:30 p.m., priorizando rutas con sombra y llevando agua fresca portátil.',
      'En época lluviosa (mayo a noviembre en Costa Rica), conviene revisar la ventana seca del Radar de Clima en Synodos antes de salir, secar bien entre los dedos y orejas de la mascota al regresar para evitar dermatitis u otitis, y evitar corrientes de agua estancada.',
    ].join('\n\n'),
  },
  {
    id: 'rag_cr_etiqueta_terrazas',
    title: 'Etiqueta Pet-Friendly en Terrazas, Cafeterías y Restaurantes de Costa Rica',
    category: 'terrazas_pet_friendly',
    source_type: 'builtin',
    source_ref: 'synodos://docs/etiqueta-terrazas',
    tags: 'terraza,restaurante,cafe,pet friendly,correa,ley 7600,comercio,normas,escalante,escazu',
    content: [
      'Buenas prácticas para disfrutar terrazas y cafeterías pet-friendly en Costa Rica: mantener siempre a la mascota con correa corta o arnés seguro, llevar bolsas biodegradables y plato portátil de agua, y evitar que suba a sillas o mesas del restaurante.',
      'Antes de visitar un local con un perro nervioso o sensible al ruido, revisa en Synodos si cuenta con terraza abierta, sombra o nivel acústico moderado.',
      'En Costa Rica, los perros guía y de asistencia certificados tienen derecho de acceso protegido bajo la Ley 7600 de Igualdad de Oportunidades para las Personas con Discapacidad.',
    ].join('\n\n'),
  },
  {
    id: 'rag_synodos_plataforma_privacidad',
    title: 'Plataforma Synodos Pet OS, Seguridad de Cuenta y Privacidad (Ley 8968)',
    category: 'plataforma_ayuda',
    source_type: 'builtin',
    source_ref: 'synodos://docs/plataforma-synodos',
    tags: 'synodos,cuenta,contraseña,recuperar,ley 8968,privacidad,boveda,triaje,argos,ayuda',
    content: [
      'Synodos Pet OS integra: catálogo verificado de restaurantes y terrazas pet-friendly en Costa Rica con fotografías reales, Mapa en Vivo del GAM, Radar de Clima y Terrazas, Copiloto IA Argos, Pre-Triaje Visual informativo de mascotas y Bóveda Veterinaria.',
      'Seguridad y recuperación de cuenta: las contraseñas se protegen con cifrado moderno (HMAC-SHA256 + bcrypt), y si un usuario olvida su contraseña puede solicitar un código temporal de 15 minutos desde la pantalla de Acceso, el cual llega automáticamente a su correo electrónico.',
      'En cumplimiento de la Ley 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales de Costa Rica, el usuario puede gestionar su consentimiento y solicitar la eliminación definitiva de su cuenta y datos desde su perfil.',
    ].join('\n\n'),
  },
  {
    id: 'rag_cr_zonas_gam',
    title: 'Guía de Zonas Pet-Friendly Populares del Gran Área Metropolitana (GAM)',
    category: 'terrazas_pet_friendly',
    source_type: 'builtin',
    source_ref: 'synodos://docs/zonas-gam-pet',
    tags: 'barrio escalante,escazu,santa ana,heredia,curridabat,san pedro,rohrmoser,alajuela,cartago,gam',
    content: [
      'Zonas destacadas del GAM con alta oferta gastronómica y terrazas pet-friendly en el catálogo de Synodos:',
      '- Barrio Escalante y Los Yoses (San José): fuerte oferta de café de especialidad, brunch y terrazas caminables.',
      '- Escazú y Santa Ana (Oeste): plazas al aire libre, restaurantes familiares con amplias terrazas y parques cercanos.',
      '- Rohrmoser y Sabana: parques amplios para caminar temprano y cafeterías de barrio.',
      '- Curridabat y San Pedro (Este): ambiente universitario, cafeterías y restaurantes casuales.',
      '- Heredia, Alajuela y Cartago: clima fresco en zonas altas y oferta variada de sodas, cafés y restaurantes con patio.',
    ].join('\n\n'),
  },
];

module.exports = { BUILTIN_RAG_DOCUMENTS };
