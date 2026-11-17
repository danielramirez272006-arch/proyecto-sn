/**
 * Catálogo Integral de Lugares, Actividades y Experiencias — GoToX
 * Incluye opciones para usuarios con y sin mascotas, con información verificada
 * de precios, horarios, clima, accesibilidad, acústica y coordenadas en el GAM.
 */

export const LUGARES_GOTOX = [
  {
    id: "franco-cafe",
    nombre: "Franco Café",
    categoria: "Café & Brunch",
    tipoActividad: "cafe",
    zona: "Barrio Escalante",
    canton: "San José",
    direccion: "Calle 33, Avenida 7, Barrio Escalante",
    lat: 9.9352,
    lng: -84.0628,
    precioNivel: "$$",
    rangoPrecio: "₡4.500 - ₡9.500",
    horario: "07:30 - 20:00",
    tiempoEstimado: "1 - 2 horas",
    condicionClima: "terraza-techada", // 'bajo-techo' | 'terraza-techada' | 'aire-libre'
    petFriendly: "si", // 'si' | 'solo-humanos' | 'mascotas-pequenas'
    politicaPet: "Perros de todos los tamaños con correa. Menú barista canino y estación de agua filtrada.",
    accesibilidad: {
      rampa: true,
      acusticaTranquila: true,
      sillaRuedas: true,
      estacionamientoPreferencial: true
    },
    nivelRuido: "Silencioso",
    decibelios: 46,
    aforoActual: 4,
    aforoMax: 8,
    puntuacion: 4.9,
    verificado: true,
    insignia: "Certificación Oro Pet-OS",
    telefono: "+506 2253-4010",
    descripcion: "Cafetería botánica de especialidad con microclima fresco, repostería artesanal y terraza sombreada ideal para trabajar o disfrutar en compañía.",
    servicios: ["WiFi fibra óptica", "Bowls térmicos caninos", "Opciones veganas & gluten-free", "Tomas de corriente"],
    imagen: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
    galeria: [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "el-arbol-de-seda",
    nombre: "El Árbol de Seda",
    categoria: "Restaurante Vegetariano & Bistro",
    tipoActividad: "gastronomia",
    zona: "Barrio Escalante",
    canton: "San José",
    direccion: "Calle 35, Frente a Plaza Farolito, Barrio Escalante",
    lat: 9.9348,
    lng: -84.0615,
    precioNivel: "$$",
    rangoPrecio: "₡6.000 - ₡12.000",
    horario: "11:30 - 21:00",
    tiempoEstimado: "1 - 2 horas",
    condicionClima: "bajo-techo",
    petFriendly: "si",
    politicaPet: "Patio empedrado vegetal aislado del tráfico. Máximo 2 perros por mesa, preferente razas tranquilas.",
    accesibilidad: {
      rampa: true,
      acusticaTranquila: true,
      sillaRuedas: true,
      estacionamientoPreferencial: false
    },
    nivelRuido: "Ultra Silencioso",
    decibelios: 42,
    aforoActual: 2,
    aforoMax: 6,
    puntuacion: 4.8,
    verificado: true,
    insignia: "Refugio Acústico Certificado",
    telefono: "+506 2224-6385",
    descripcion: "Bistro vegetal de autor con cocina estacional, coctelería botánica sin alcohol y atmósfera pacífica en un jardín interior colonial.",
    servicios: ["Menú 100% vegetariano/vegano", "Agua con electrolitos para mascotas", "Piso atérmico", "Bocadillos horneados"],
    imagen: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    galeria: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "apotecario",
    nombre: "Apotecario Cervecería & Fermentos",
    categoria: "Gastropub & Artesanal",
    tipoActividad: "gastronomia",
    zona: "Barrio California",
    canton: "San José",
    direccion: "Avenida Central, Calle 23, Barrio California",
    lat: 9.9328,
    lng: -84.0692,
    precioNivel: "$$",
    rangoPrecio: "₡5.000 - ₡14.000",
    horario: "16:00 - 23:30",
    tiempoEstimado: "2 - 3 horas",
    condicionClima: "terraza-techada",
    petFriendly: "si",
    politicaPet: "Nave abierta con anclajes confortables en patas de mesa. Excelente para perros sociables.",
    accesibilidad: {
      rampa: true,
      acusticaTranquila: false,
      sillaRuedas: true,
      estacionamientoPreferencial: true
    },
    nivelRuido: "Moderado",
    decibelios: 58,
    aforoActual: 5,
    aforoMax: 10,
    puntuacion: 4.7,
    verificado: true,
    insignia: "Social Seguro Pet-OS",
    telefono: "+506 2221-5080",
    descripcion: "Microcervecería costarricense con panes de masa madre, kombuchas de la casa y un galpón abierto de arquitectura industrial urbana.",
    servicios: ["Cerveza artesanal de barril", "Anclajes seguros", "Comida reconfortante", "Música indie moderada"],
    imagen: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=800&q=80",
    galeria: [
      "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1574096079513-d8259312b785?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "cafe-miel-garage",
    nombre: "Café Miel Garage Amón",
    categoria: "Café de Especialidad & Postres",
    tipoActividad: "cafe",
    zona: "Barrio Amón",
    canton: "San José",
    direccion: "Avenida 9, Calle 3 bis, Barrio Amón",
    lat: 9.9385,
    lng: -84.0772,
    precioNivel: "$",
    rangoPrecio: "₡2.800 - ₡6.500",
    horario: "09:00 - 18:30",
    tiempoEstimado: "Menos de 1 hora",
    condicionClima: "bajo-techo",
    petFriendly: "si",
    politicaPet: "Se admite un perro por mesa en terraza exterior techada. Bocaditos de calabaza de cortesía.",
    accesibilidad: {
      rampa: false,
      acusticaTranquila: true,
      sillaRuedas: false,
      estacionamientoPreferencial: false
    },
    nivelRuido: "Moderado",
    decibelios: 51,
    aforoActual: 3,
    aforoMax: 5,
    puntuacion: 4.6,
    verificado: true,
    insignia: "Patrimonio Amigable",
    telefono: "+506 2256-8912",
    descripcion: "Famoso rincón josefino con postres golosos, café de Tarrazú y atmósfera victoriana en el corazón arquitectónico de Barrio Amón.",
    servicios: ["Café chorreado premium", "Pasteles y galletas", "Terraza techada de ladrillo"],
    imagen: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
    galeria: [
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "museo-arte-costarricense",
    nombre: "Museo de Arte Costarricense & Jardín de Esculturas",
    categoria: "Museo & Cultura",
    tipoActividad: "cultural",
    zona: "La Sabana",
    canton: "San José",
    direccion: "Parque Metropolitano La Sabana, Antiguo Aeropuerto",
    lat: 9.9347,
    lng: -84.1011,
    precioNivel: "$",
    rangoPrecio: "Entrada Gratuita",
    horario: "09:00 - 16:00 (Mar a Dom)",
    tiempoEstimado: "1 - 2 horas",
    condicionClima: "bajo-techo",
    petFriendly: "solo-humanos", // ¡Ideal para personas sin mascotas!
    politicaPet: "Solo se admiten perros guía y de servicio con credencial dentro de las salas. El Jardín de Esculturas exterior es pet-friendly con correa.",
    accesibilidad: {
      rampa: true,
      acusticaTranquila: true,
      sillaRuedas: true,
      estacionamientoPreferencial: true
    },
    nivelRuido: "Ultra Silencioso",
    decibelios: 38,
    aforoActual: 18,
    aforoMax: 80,
    puntuacion: 4.9,
    verificado: true,
    insignia: "Patrimonio Nacional",
    telefono: "+506 2459-3540",
    descripcion: "Antigua torre de control del aeropuerto de La Sabana, hoy convertida en el recinto de arte más bello del país, con el imponente Salón Dorado y jardines abiertos.",
    servicios: ["Visitas guiadas gratuitas", "Rampa en todas las salas", "Audio-guías", "Parqueo público cercano"],
    imagen: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80",
    galeria: [
      "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "parque-la-sabana-lago",
    nombre: "Circuito La Sabana & Lago Central",
    categoria: "Parque & Aire Libre",
    tipoActividad: "aire-libre",
    zona: "La Sabana",
    canton: "San José",
    direccion: "Costado Oeste de San José, Sabana Norte/Sur",
    lat: 9.9360,
    lng: -84.1040,
    precioNivel: "$",
    rangoPrecio: "Acceso Libre",
    horario: "05:00 - 21:00",
    tiempoEstimado: "Tarde completa",
    condicionClima: "aire-libre",
    petFriendly: "si",
    politicaPet: "El pulmón verde de San José. Sendero perimetral de 4.2 km ideal para caminatas, trote y recreación con mascotas.",
    accesibilidad: {
      rampa: true,
      acusticaTranquila: true,
      sillaRuedas: true,
      estacionamientoPreferencial: true
    },
    nivelRuido: "Silencioso",
    decibelios: 48,
    aforoActual: 65,
    aforoMax: 500,
    puntuacion: 4.8,
    verificado: true,
    insignia: "Espacio Urbano Seguro",
    telefono: "+506 2549-0700",
    descripcion: "El parque metropolitano más grande del país con senderos pavimentados arbolados, lagos y zonas de descanso sin tráfico vehicular.",
    servicios: ["Senderos accesibles", "Bancas con sombra", "Fuentes de hidratación", "Seguridad municipal"],
    imagen: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80",
    galeria: [
      "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "teatro-nacional-bistro",
    nombre: "Café del Teatro Nacional",
    categoria: "Café Histórico & Gastronomía",
    tipoActividad: "cultural",
    zona: "San José Centro",
    canton: "San José",
    direccion: "Avenida 2, Calles 1 y 3, Casco Histórico",
    lat: 9.9332,
    lng: -84.0770,
    precioNivel: "$$$",
    rangoPrecio: "₡8.000 - ₡18.000",
    horario: "09:00 - 19:00",
    tiempoEstimado: "1 - 2 horas",
    condicionClima: "bajo-techo",
    petFriendly: "solo-humanos", // ¡Exclusivo para personas sin mascotas!
    politicaPet: "Por ser Monumento Histórico Nacional con obras pictóricas del siglo XIX, no se admiten mascotas salvo perros guía.",
    accesibilidad: {
      rampa: true,
      acusticaTranquila: true,
      sillaRuedas: true,
      estacionamientoPreferencial: false
    },
    nivelRuido: "Silencioso",
    decibelios: 44,
    aforoActual: 14,
    aforoMax: 30,
    puntuacion: 4.9,
    verificado: true,
    insignia: "Monumento Nacional",
    telefono: "+506 2010-1110",
    descripcion: "Café de alta alcurnia dentro del mayor tesoro arquitectónico neoclásico de Costa Rica, con frescos de Villa, mármoles de Carrara y pastelería fina.",
    servicios: ["Café gourmet galardonado", "Música clásica en vivo ocasional", "Wi-Fi", "Aire acondicionado"],
    imagen: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80",
    galeria: [
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "pet-park-wellness-rohrmoser",
    nombre: "Pet Park & Wellness Rohrmoser",
    categoria: "Parque Canino & Bienestar",
    tipoActividad: "aire-libre",
    zona: "Rohrmoser",
    canton: "San José",
    direccion: "Bulevar de Rohrmoser, entre Calles 68 y 72",
    lat: 9.9402,
    lng: -84.1180,
    precioNivel: "$",
    rangoPrecio: "Acceso Libre",
    horario: "06:00 - 20:00",
    tiempoEstimado: "1 - 2 horas",
    condicionClima: "aire-libre",
    petFriendly: "si",
    politicaPet: "Parque 100% cercado con doble esclusa de seguridad, áreas separadas para perros grandes y pequeños y bebederos de pedal.",
    accesibilidad: {
      rampa: true,
      acusticaTranquila: true,
      sillaRuedas: true,
      estacionamientoPreferencial: true
    },
    nivelRuido: "Moderado",
    decibelios: 49,
    aforoActual: 12,
    aforoMax: 20,
    puntuacion: 4.9,
    verificado: true,
    insignia: "Parque Certificado GAM",
    telefono: "+506 2547-6000",
    descripcion: "Espacio público modelo de bienestar animal en el GAM con pista de agilidad, arena lavada, sombra de higuerones y dispensadores sanitarios.",
    servicios: ["Circuito Agility", "Doble puerta de seguridad", "Pasto bermuda y arena", "Bebederos automáticos"],
    imagen: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80",
    galeria: [
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "mercado-escalante-gastronomia",
    nombre: "Mercado Gastronómico Calle 33",
    categoria: "Mercado Urbano & Comidas",
    tipoActividad: "gastronomia",
    zona: "Barrio Escalante",
    canton: "San José",
    direccion: "Calle 33, Barrio Escalante",
    lat: 9.9360,
    lng: -84.0620,
    precioNivel: "$$",
    rangoPrecio: "₡4.000 - ₡11.000",
    horario: "12:00 - 23:00",
    tiempoEstimado: "1 - 2 horas",
    condicionClima: "bajo-techo",
    petFriendly: "si",
    politicaPet: "Patios comunes techados admiten mascotas con correa. Gran variedad culinaria para todos los gustos.",
    accesibilidad: {
      rampa: true,
      acusticaTranquila: false,
      sillaRuedas: true,
      estacionamientoPreferencial: true
    },
    nivelRuido: "Moderado",
    decibelios: 56,
    aforoActual: 32,
    aforoMax: 70,
    puntuacion: 4.7,
    verificado: true,
    insignia: "Paseo Gastronómico",
    telefono: "+506 2283-9900",
    descripcion: "Espacio multicultural con 8 conceptos gastronómicos bajo un mismo techo: tacos al pastor, ramen, ceviches costarricenses, pizzas y cócteles.",
    servicios: ["Múltiples opciones culinarias", "Pet-friendly techado", "Pago con tarjeta / SINPE", "Parqueo de bicicletas"],
    imagen: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    galeria: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"
    ]
  }
];

export const CATEGORIAS_DESCUBRIMIENTO = [
  { id: "todas", label: "Todos los Lugares", icon: "Compass" },
  { id: "gastronomia", label: "Gastronomía & Restaurantes", icon: "UtensilsCrossed" },
  { id: "cafe", label: "Café & Brunch", icon: "Coffee" },
  { id: "aire-libre", label: "Parques & Aire Libre", icon: "Trees" },
  { id: "cultural", label: "Cultura & Museos", icon: "Landmark" },
  { id: "pet-friendly", label: "100% Pet-Friendly", icon: "Dog" },
  { id: "bajo-techo", label: "Actividades Bajo Techo (Lluvia)", icon: "CloudRain" }
];

export const CONSULTAS_RAPIDAS_SUGERIDAS = [
  { texto: "Quiero salir a comer", filtro: { categoria: "gastronomia" } },
  { texto: "Busco algo económico cerca de mí", filtro: { precioNivel: "$" } },
  { texto: "Quiero salir con mi perro", filtro: { petFriendly: "si" } },
  { texto: "Necesito una actividad bajo techo", filtro: { condicionClima: "bajo-techo" } },
  { texto: "Tengo dos horas libres", filtro: { tiempoEstimado: "1 - 2 horas" } },
  { texto: "Café tranquilo para trabajar", filtro: { categoria: "cafe", nivelRuido: "Silencioso" } }
];
