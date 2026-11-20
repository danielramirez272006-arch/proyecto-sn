/**
 * Catálogo curado de perfiles biométricos y galería fija de fotografías verificadas (HTTP 200 OK)
 * por raza para Costa Rica (GAM).
 * - Al seleccionar cualquier raza, muestra directamente sus 3 fotografías reales verificadas.
 */

export const PERFILES_RAZAS_CANINAS = [
  {
    id: 'golden-retriever',
    nombre: 'Golden Retriever',
    pesoPromedioKg: 29.5,
    rangoPeso: '25 - 34 kg',
    esperanzaVida: '10 - 12 años',
    colorMantoSugerido: 'Dorado Claro / Crema',
    nivelEnergia: 'Alto',
    toleranciaCalor: 'Media-Baja (Sensible al asfalto > 26 °C)',
    temperamento: 'Sociable, afectuoso, inteligente y paciente en terrazas',
    cuidadosGam: 'Cepillado frecuente, hidratación constante y evitar caminatas entre 11:00 a.m. y 2:30 p.m.',
    fotos: [
      'https://images.dog.ceo/breeds/retriever-golden/n02099601_8181.jpg',
      'https://images.dog.ceo/breeds/retriever-golden/z6a_3963_200731.jpg',
      'https://images.dog.ceo/breeds/retriever-golden/n02099601_5876.jpg'
    ]
  },
  {
    id: 'labrador',
    nombre: 'Labrador Retriever',
    pesoPromedioKg: 30,
    rangoPeso: '25 - 36 kg',
    esperanzaVida: '10 - 13 años',
    colorMantoSugerido: 'Amarillo / Chocolate / Negro',
    nivelEnergia: 'Alto',
    toleranciaCalor: 'Media',
    temperamento: 'Amigable, entusiasta, juguetón y adaptable',
    cuidadosGam: 'Control de peso y ejercicio diario en parques arbolados como La Sabana o Parque del Este.',
    fotos: [
      'https://images.dog.ceo/breeds/labrador/n02099712_2473.jpg',
      'https://images.dog.ceo/breeds/labrador/n02099712_5021.jpg',
      'https://images.dog.ceo/breeds/labrador/n02099712_610.jpg'
    ]
  },
  {
    id: 'french-bulldog',
    nombre: 'Bulldog Francés',
    pesoPromedioKg: 11,
    rangoPeso: '9 - 13 kg',
    esperanzaVida: '10 - 12 años',
    colorMantoSugerido: 'Leonado / Atigrado / Blanco',
    nivelEnergia: 'Moderado-Bajo',
    toleranciaCalor: 'Baja (Braquicéfalo - Sensible al calor)',
    temperamento: 'Tranquilo, cariñoso, ideal para cafeterías tranquilas (< 55 dB)',
    cuidadosGam: 'Priorizar terrazas ventiladas o bajo techo; evitar humedad alta y calor del mediodía.',
    fotos: [
      'https://images.dog.ceo/breeds/bulldog-french/n02108915_5667.jpg',
      'https://images.dog.ceo/breeds/bulldog-french/n02108915_3382.jpg',
      'https://images.dog.ceo/breeds/bulldog-french/n02108915_2980.jpg'
    ]
  },
  {
    id: 'beagle',
    nombre: 'Beagle',
    pesoPromedioKg: 11.5,
    rangoPeso: '9 - 14 kg',
    esperanzaVida: '12 - 15 años',
    colorMantoSugerido: 'Tricolor (Blanco, Negro y Fuego)',
    nivelEnergia: 'Alto',
    toleranciaCalor: 'Media-Alta',
    temperamento: 'Curioso, alegre, olfato activo y muy sociable con otros perros',
    cuidadosGam: 'Usar siempre correa segura con arnés y placa QR; su instinto olfativo puede distraerlo.',
    fotos: [
      'https://images.dog.ceo/breeds/beagle/n02088364_16635.jpg',
      'https://images.dog.ceo/breeds/beagle/n02088364_8443.jpg',
      'https://images.dog.ceo/breeds/beagle/n02088364_6089.jpg'
    ]
  },
  {
    id: 'poodle',
    nombre: 'Poodle (Caniche)',
    pesoPromedioKg: 12,
    rangoPeso: '4 - 22 kg',
    esperanzaVida: '12 - 15 años',
    colorMantoSugerido: 'Blanco / Apricot / Negro',
    nivelEnergia: 'Moderado-Alto',
    toleranciaCalor: 'Media',
    temperamento: 'Muy inteligente, hipoalergénico, atento y educado en restaurantes',
    cuidadosGam: 'Secado cuidadoso del manto en época lluviosa del GAM para proteger la piel.',
    fotos: [
      'https://images.dog.ceo/breeds/poodle-standard/n02113799_3055.jpg',
      'https://images.dog.ceo/breeds/poodle-standard/n02113799_4904.jpg',
      'https://images.dog.ceo/breeds/poodle-standard/n02113799_2321.jpg'
    ]
  },
  {
    id: 'german-shepherd',
    nombre: 'Pastor Alemán',
    pesoPromedioKg: 34,
    rangoPeso: '28 - 40 kg',
    esperanzaVida: '9 - 13 años',
    colorMantoSugerido: 'Negro y Fuego / Sable',
    nivelEnergia: 'Muy Alto',
    toleranciaCalor: 'Media',
    temperamento: 'Leal, protector, inteligente y atento a su tutor',
    cuidadosGam: 'Requiere terrazas amplias con buen espacio entre mesas y caminatas matutinas.',
    fotos: [
      'https://images.dog.ceo/breeds/german-shepherd/n02106662_9481.jpg',
      'https://images.dog.ceo/breeds/german-shepherd/n02106662_15647.jpg',
      'https://images.dog.ceo/breeds/german-shepherd/n02106662_14930.jpg'
    ]
  },
  {
    id: 'husky',
    nombre: 'Husky Siberiano',
    pesoPromedioKg: 23,
    rangoPeso: '18 - 27 kg',
    esperanzaVida: '12 - 14 años',
    colorMantoSugerido: 'Blanco y Gris / Negro',
    nivelEnergia: 'Muy Alto',
    toleranciaCalor: 'Baja (Doble manto nórdico)',
    temperamento: 'Expresivo, activo, sociable e independiente',
    cuidadosGam: 'Salidas preferiblemente temprano o al atardecer (< 22 °C) y agua fría permanente.',
    fotos: [
      'https://images.dog.ceo/breeds/husky/n02110185_11138.jpg',
      'https://images.dog.ceo/breeds/husky/n02110185_15063.jpg',
      'https://images.dog.ceo/breeds/husky/n02110185_9001.jpg'
    ]
  },
  {
    id: 'dachshund',
    nombre: 'Dachshund (Salchicha)',
    pesoPromedioKg: 8.5,
    rangoPeso: '5 - 11 kg',
    esperanzaVida: '12 - 16 años',
    colorMantoSugerido: 'Caoba / Negro y Fuego',
    nivelEnergia: 'Moderado',
    toleranciaCalor: 'Media',
    temperamento: 'Valiente, cariñoso, alerta y excelente compañero urbano',
    cuidadosGam: 'Preferir locales con rampa de acceso para cuidar su columna vertebral (evitar gradas altas).',
    fotos: [
      'https://images.dog.ceo/breeds/dachshund/dog-495122_640.jpg',
      'https://images.dog.ceo/breeds/dachshund/foxhound-53951_640.jpg',
      'https://images.dog.ceo/breeds/dachshund/sadie.jpg'
    ]
  },
  {
    id: 'pug',
    nombre: 'Pug (Carlino)',
    pesoPromedioKg: 7.5,
    rangoPeso: '6 - 9 kg',
    esperanzaVida: '12 - 15 años',
    colorMantoSugerido: 'Arena / Negro',
    nivelEnergia: 'Bajo',
    toleranciaCalor: 'Baja (Braquicéfalo)',
    temperamento: 'Encantador, dócil, silencioso y amante de espacios bajo techo',
    cuidadosGam: 'Vigilar respiración en días húmedos y elegir cafeterías frescas con sombra total.',
    fotos: [
      'https://images.dog.ceo/breeds/pug/img_3507.jpg',
      'https://images.dog.ceo/breeds/pug/roxycruising.jpg',
      'https://images.dog.ceo/breeds/pug/n02110958_630.jpg'
    ]
  },
  {
    id: 'shiba',
    nombre: 'Shiba Inu',
    pesoPromedioKg: 10,
    rangoPeso: '8 - 11 kg',
    esperanzaVida: '13 - 16 años',
    colorMantoSugerido: 'Rojo Sésamo / Crema',
    nivelEnergia: 'Moderado-Alto',
    toleranciaCalor: 'Media',
    temperamento: 'Limpio, ágil, reservado y muy leal',
    cuidadosGam: 'Prefiere esquinas tranquilas con bajo nivel de decibelios (< 52 dB).',
    fotos: [
      'https://images.dog.ceo/breeds/shiba/shiba-16.jpg',
      'https://images.dog.ceo/breeds/shiba/shiba-9.jpg',
      'https://images.dog.ceo/breeds/shiba/shiba-5.jpg'
    ]
  },
  {
    id: 'corgi',
    nombre: 'Welsh Corgi Pembroke',
    pesoPromedioKg: 12.5,
    rangoPeso: '10 - 14 kg',
    esperanzaVida: '12 - 15 años',
    colorMantoSugerido: 'Rojo y Blanco / Tricolor',
    nivelEnergia: 'Alto',
    toleranciaCalor: 'Media',
    temperamento: 'Inteligente, afectuoso, activo y sociable',
    cuidadosGam: 'Excelente en terrazas pet-friendly; cuidar su hidratación tras caminatas.',
    fotos: [
      'https://images.dog.ceo/breeds/pembroke/n02113023_2974.jpg',
      'https://images.dog.ceo/breeds/pembroke/n02113023_2330.jpg',
      'https://images.dog.ceo/breeds/pembroke/n02113023_597.jpg'
    ]
  },
  {
    id: 'border-collie',
    nombre: 'Border Collie',
    pesoPromedioKg: 18,
    rangoPeso: '14 - 22 kg',
    esperanzaVida: '12 - 15 años',
    colorMantoSugerido: 'Blanco y Negro / Merle',
    nivelEnergia: 'Muy Alto',
    toleranciaCalor: 'Media',
    temperamento: 'Ágil, obediente, brillante y sensible a ruidos bruscos',
    cuidadosGam: 'Combinar visita a cafetería con sesión de juego en parque; evitar zonas con ruido > 60 dB.',
    fotos: [
      'https://images.dog.ceo/breeds/collie-border/n02106166_6437.jpg',
      'https://images.dog.ceo/breeds/collie-border/n02106166_6512.jpg',
      'https://images.dog.ceo/breeds/collie-border/n02106166_855.jpg'
    ]
  },
  {
    id: 'chihuahua',
    nombre: 'Chihuahua',
    pesoPromedioKg: 2.8,
    rangoPeso: '1.8 - 3.5 kg',
    esperanzaVida: '14 - 17 años',
    colorMantoSugerido: 'Crema / Café / Negro',
    nivelEnergia: 'Moderado',
    toleranciaCalor: 'Alta (Sensible al frío y viento nocturno)',
    temperamento: 'Apegado a su tutor, alerta y fácil de transportar en todo el GAM',
    cuidadosGam: 'Llevar manta ligera para tardes frescas o lluviosas en San Pedro y Escalante.',
    fotos: [
      'https://images.dog.ceo/breeds/chihuahua/n02085620_4814.jpg',
      'https://images.dog.ceo/breeds/chihuahua/n02085620_7292.jpg',
      'https://images.dog.ceo/breeds/chihuahua/n02085620_4673.jpg'
    ]
  },
  {
    id: 'schnauzer',
    nombre: 'Schnauzer Miniatura',
    pesoPromedioKg: 7.5,
    rangoPeso: '6 - 9 kg',
    esperanzaVida: '12 - 15 años',
    colorMantoSugerido: 'Sal y Pimienta / Negro / Blanco',
    nivelEnergia: 'Moderado-Alto',
    toleranciaCalor: 'Media-Alta',
    temperamento: 'Amigable, inteligente, alerta y muy popular en hogares de Costa Rica',
    cuidadosGam: 'Limpiar barbas después de hidratarse en los bowls de las terrazas certificadas.',
    fotos: [
      'https://images.dog.ceo/breeds/schnauzer-miniature/n02097047_6553.jpg',
      'https://images.dog.ceo/breeds/schnauzer-miniature/n02097047_4563.jpg',
      'https://images.dog.ceo/breeds/schnauzer-miniature/n02097047_1626.jpg'
    ]
  },
  {
    id: 'yorkshire',
    nombre: 'Yorkshire Terrier',
    pesoPromedioKg: 3.2,
    rangoPeso: '2 - 4 kg',
    esperanzaVida: '13 - 16 años',
    colorMantoSugerido: 'Azul Acero y Fuego',
    nivelEnergia: 'Moderado',
    toleranciaCalor: 'Media',
    temperamento: 'Cariñoso, vivaz y cómodo tanto en interiores como en terrazas',
    cuidadosGam: 'Ideal para cafeterías boutique y salidas bajo techo en días de lluvia.',
    fotos: [
      'https://images.dog.ceo/breeds/terrier-yorkshire/n02094433_10184.jpg',
      'https://images.dog.ceo/breeds/terrier-yorkshire/n02094433_1824.jpg',
      'https://images.dog.ceo/breeds/terrier-yorkshire/n02094433_3766.jpg'
    ]
  },
  {
    id: 'mestizo-zaguates',
    nombre: 'Mestizo / Zaguate Costarricense',
    pesoPromedioKg: 16,
    rangoPeso: '8 - 25 kg',
    esperanzaVida: '13 - 16 años',
    colorMantoSugerido: 'Variado / Tricolor / Miel',
    nivelEnergia: 'Alto',
    toleranciaCalor: 'Alta (Excelente adaptación al clima del GAM)',
    temperamento: 'Noble, resiliente, leal, equilibrado y sumamente agradecido',
    cuidadosGam: 'Excelente adaptación al microclima de San José; mantener vacunas y microchip al día.',
    fotos: [
      'https://images.dog.ceo/breeds/mix/noah01.jpg',
      'https://images.dog.ceo/breeds/mix/milka3.jpg',
      'https://images.dog.ceo/breeds/mix/lunaandbaldur.jpg'
    ]
  }
];

/**
 * Busca el perfil curado de una raza por nombre o ID.
 */
export function buscarPerfilRaza(nombreOId = '') {
  const limpio = String(nombreOId || '').trim().toLowerCase();
  if (!limpio) return null;
  return (
    PERFILES_RAZAS_CANINAS.find(
      (r) =>
        r.id === limpio ||
        r.nombre.toLowerCase() === limpio ||
        r.nombre.toLowerCase().includes(limpio) ||
        limpio.includes(r.nombre.toLowerCase().split(' ')[0])
    ) || null
  );
}
