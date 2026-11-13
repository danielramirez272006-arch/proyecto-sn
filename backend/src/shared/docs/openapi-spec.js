module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Sinergia Urbana Costa Rica - Backend Enterprise API",
    version: "1.9.0",
    description: "API REST Enterprise, Copiloto Cliente Google Gemini AI, IA Administrativa DeepSeek V3/R1, Videos de Cuidado de Mascotas, Transacciones ACID, BCCR, Feriados CR, Monitor Sísmico, Rutas Óptimas, SINPE QR, Confort Urbano, Calidad de Aire, Auditoría Inmutable y Métricas Prometheus para Costa Rica.",
    contact: {
      name: "Sinergia Urbana Core Engineering Team",
      url: "https://github.com/danielramirez272006-arch/proyecto-sn"
    }
  },
  servers: [
    {
      url: "/api",
      description: "Servidor API Local / Producción"
    }
  ],
  tags: [
    { name: "Salud, Métricas y Diagnóstico", description: "Métricas Prometheus, telemetría y verificación de latencia" },
    { name: "Autenticación y Sesiones", description: "PBKDF2 Hashing, JWT, rotación de Refresh Tokens y sesiones de invitado" },
    { name: "Catálogo y Lugares", description: "Búsqueda radial GPS, paginación avanzada y comercios verificados" },
    { name: "Planes Grupales (Social Dining)", description: "Coordinación transaccional, votación idempotente y confirmación inmutable" },
    { name: "Google Gemini Copiloto (Cliente)", description: "Copiloto conversacional de clientes: Chat multi-turn, clasificador de voz e itinerarios con Google Gemini" },
    { name: "DeepSeek AI (Admin y Agentes)", description: "Motor de razonamiento para administradores, moderadores y agentes autónomos" },
    { name: "Agentes Autónomos", description: "Scheduler y monitoreo de tareas periódicas en background" },
    { name: "Rescate Urbano", description: "Alertas ciudadanas SOS en tiempo real y auxilio vial" },
    { name: "Auditoría y Administración", description: "Pista inmutable de auditoría y operaciones de control" },
    { name: "Internacionalización (i18n)", description: "Soporte multilingüe para 10 idiomas, diccionarios y traducción automática" },
    { name: "Auditoría Criptográfica", description: "Hash Chain Ledger inmutable y verificación matemática de integridad" },
    { name: "Notificaciones Multicanal", description: "Web Push RFC 8292 VAPID, WhatsApp/SMS y cola Outbox resiliente" },
    { name: "Seguridad QR Criptográfico", description: "Generación y validación de tokens QR con HMAC-SHA256 y canje único" },
    { name: "Movilidad Sostenible", description: "Factores oficiales de emisión Costa Rica (MINAE/IMN), huella de CO2 y ahorro CRC" },
    { name: "Webhooks para Comercios", description: "Webhooks salientes firmados criptográficamente para socios locales" },
    { name: "Finanzas y BCCR", description: "Tipo de cambio oficial BCCR, multi-divisa y redondeo de efectivo" },
    { name: "Clima y Confort Urbano", description: "Open-Meteo satelital, alerta de aguaceros y calidad del aire GAM" },
    { name: "Geolocalización y Navegación", description: "Geocodificación territorial tica y deep-links para Waze/Google Maps" },
    { name: "Verificación Tributaria", description: "Consulta pública ante el Ministerio de Hacienda para cédulas físicas y jurídicas" },
    { name: "Calendario y Feriados CR", description: "Feriados patrios oficiales y suspensión de restricción vehicular en San José" },
    { name: "Optimización de Rutas", description: "Heurística de viaje óptimo para paradas múltiples de grupos" },
    { name: "Pagos SINPE Móvil", description: "Comandos nativos para los 7 principales bancos de Costa Rica y códigos QR" },
    { name: "Videos de Cuidado Animal", description: "Catálogo verificado de videos educativos de YouTube, análisis con Gemini y función «Pregúntale al video»" }
  ],
  paths: {
    "/metrics": {
      get: {
        tags: ["Salud, Métricas y Diagnóstico"],
        summary: "Métricas en formato estándar Prometheus (OpenMetrics)",
        responses: {
          "200": {
            description: "Texto plano con métricas de CPU, memoria, requests HTTP y DeepSeek AI",
            content: { "text/plain": {} }
          }
        }
      }
    },
    "/health": {
      get: {
        tags: ["Salud, Métricas y Diagnóstico"],
        summary: "Chequeo básico de salud del backend",
        responses: {
          "200": { description: "Servidor operativo con DeepSeek AI activo" }
        }
      }
    },
    "/health/db": {
      get: {
        tags: ["Salud, Métricas y Diagnóstico"],
        summary: "Chequeo de conectividad a la base de datos (MySQL / SQLite)",
        responses: {
          "200": { description: "Base de datos relacional conectada y operativa" }
        }
      }
    },
    "/health/supabase": {
      get: {
        tags: ["Salud, Métricas y Diagnóstico"],
        summary: "Chequeo de conexión y autenticación con Supabase Cloud (Auth & Storage)",
        responses: {
          "200": { description: "Estado y proveedor de Supabase" }
        }
      }
    },
    "/health/system": {
      get: {
        tags: ["Salud, Métricas y Diagnóstico"],
        summary: "Telemetría completa de memoria RAM, base de datos, DeepSeek y scheduler",
        responses: {
          "200": { description: "Métricas del sistema" }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Autenticación y Sesiones"],
        summary: "Inicio de sesión seguro con verificación PBKDF2 y emisión de Access + Refresh Tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "organizer@ejemplo.cr" },
                  password: { type: "string", example: "password123" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Sesión iniciada con token JWT y refresh_token" }
        }
      }
    },
    "/auth/refresh": {
      post: {
        tags: ["Autenticación y Sesiones"],
        summary: "Rotación segura de Refresh Token y renovación de Access Token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refresh_token"],
                properties: {
                  refresh_token: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Nuevos tokens emitidos y anterior revocado" }
        }
      }
    },
    "/auth/logout": {
      post: {
        tags: ["Autenticación y Sesiones"],
        summary: "Cierre de sesión y revocación del Refresh Token",
        responses: {
          "200": { description: "Sesión revocada exitosamente" }
        }
      }
    },
    "/places": {
      get: {
        tags: ["Catálogo y Lugares"],
        summary: "Listar lugares con paginación avanzada y búsqueda radial GPS",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "lat", in: "query", schema: { type: "number" }, description: "Latitud GPS de origen" },
          { name: "lng", in: "query", schema: { type: "number" }, description: "Longitud GPS de origen" },
          { name: "radius_km", in: "query", schema: { type: "number" }, description: "Radio de búsqueda en km" },
          { name: "sort_by", in: "query", schema: { type: "string", default: "name" } },
          { name: "sort_order", in: "query", schema: { type: "string", enum: ["ASC", "DESC"], default: "ASC" } }
        ],
        responses: {
          "200": { description: "Lista paginada con metadatos y cálculo de distancia en km" }
        }
      }
    },
    "/social/plans": {
      post: {
        tags: ["Planes Grupales (Social Dining)"],
        summary: "Crear un nuevo plan grupal con opciones de paradas",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string", example: "Tarde de café y feria" },
                  description: { type: "string" },
                  organizer_name: { type: "string", example: "Daniel" },
                  organizer_email: { type: "string", example: "organizer@ejemplo.cr" },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", example: "Opción A: Café El Roble" },
                        proposed_time: { type: "string", format: "date-time" },
                        stops: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              place_id: { type: "string" },
                              order_index: { type: "integer" },
                              activity_type: { type: "string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Plan creado exitosamente con código único de invitación" }
        }
      }
    },
    "/social/plans/{code}": {
      get: {
        tags: ["Planes Grupales (Social Dining)"],
        summary: "Obtener detalle completo de un plan grupal por código",
        parameters: [
          { name: "code", in: "path", required: true, schema: { type: "string" }, example: "PLAN-DEMO-2026" }
        ],
        responses: {
          "200": { description: "Detalle del plan con opciones y paradas" },
          "404": { description: "Plan no encontrado" }
        }
      }
    },
    "/social/plans/{code}/votes/{optionId}": {
      put: {
        tags: ["Planes Grupales (Social Dining)"],
        summary: "Emitir o actualizar voto (puedo, prefiero, no_puedo)",
        parameters: [
          { name: "code", in: "path", required: true, schema: { type: "string" } },
          { name: "optionId", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["guest_name", "vote_type"],
                properties: {
                  guest_name: { type: "string", example: "Luis" },
                  vote_type: { type: "string", enum: ["puedo", "prefiero", "no_puedo"], example: "prefiero" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Voto registrado exitosamente" }
        }
      }
    },
    "/social/plans/{code}/confirm": {
      post: {
        tags: ["Planes Grupales (Social Dining)"],
        summary: "Confirmar y cerrar el plan seleccionado (Solo organizador)",
        parameters: [
          { name: "code", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["selected_option_id"],
                properties: {
                  selected_option_id: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Plan confirmado con snapshot inmutable" }
        }
      }
    },
    "/concierge/voice-intent": {
      post: {
        tags: ["Google Gemini Copiloto (Cliente)"],
        summary: "Clasificar transcripción de voz o texto con Google Gemini (Cliente)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["text"],
                properties: {
                  text: { type: "string", example: "Busco un café con terraza pet-friendly para ir con mi perro" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Intención clasificada, filtros y presupuesto" }
        }
      }
    },
    "/concierge/status": {
      get: {
        tags: ["Google Gemini Copiloto (Cliente)"],
        summary: "Consultar estado, modelo y métricas del motor Google Gemini (Cliente)",
        responses: {
          "200": { description: "Estado y telemetría de Google Gemini" }
        }
      }
    },
    "/concierge/chat": {
      post: {
        tags: ["Google Gemini Copiloto (Cliente)"],
        summary: "Conversación contextual multi-turn persistente con Google Gemini (Cliente)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  session_id: { type: "string", example: "user_session_42" },
                  message: { type: "string", example: "¿Qué cafeterías con método V60 me recomiendas en San José?" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Respuesta del copiloto con sugerencias y contexto" }
        }
      }
    },
    "/concierge/multi-day-itinerary": {
      post: {
        tags: ["Google Gemini Copiloto (Cliente)"],
        summary: "Generador de itinerarios de múltiples días con presupuesto en colones y paradas",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  days: { type: "integer", default: 2 },
                  zone: { type: "string", default: "Gran Área Metropolitana" },
                  budget_crc: { type: "integer", default: 35000 }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Itinerario detallado día por día con tips de movilidad" }
        }
      }
    },
    "/admin/agents/status": {
      get: {
        tags: ["Agentes Autónomos"],
        summary: "Consultar estado de los agentes en background y tareas programadas",
        responses: {
          "200": { description: "Lista de tareas, última ejecución y resultado" }
        }
      }
    },
    "/admin/agents/{jobName}/run": {
      post: {
        tags: ["Agentes Autónomos"],
        summary: "Forzar ejecución manual inmediata de una tarea de agente",
        parameters: [
          { name: "jobName", in: "path", required: true, schema: { type: "string" }, example: "affected-plans-monitor" }
        ],
        responses: {
          "200": { description: "Tarea ejecutada correctamente" }
        }
      }
    },
    "/audit/history": {
      get: {
        tags: ["Auditoría y Administración"],
        summary: "Consultar la pista de auditoría inmutable de eventos del sistema (Admin)",
        responses: {
          "200": { description: "Historial de mutaciones, IPs y usuarios" }
        }
      }
    },
    "/storage/upload": {
      post: {
        tags: ["Almacenamiento y Archivos"],
        summary: "Subir archivo a Supabase Storage con fallback local",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["file_name", "content_base64"],
                properties: {
                  bucket: { type: "string", default: "receipts" },
                  file_name: { type: "string", example: "comprobante_sinpe.jpg" },
                  content_base64: { type: "string" },
                  content_type: { type: "string", default: "image/jpeg" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Archivo subido exitosamente con URL pública" },
          "400": { description: "Parámetros o tipo MIME inválido" },
          "413": { description: "Archivo excede el límite de 5MB" }
        }
      }
    },
    "/storage/status": {
      get: {
        tags: ["Almacenamiento y Archivos"],
        summary: "Estado del proveedor de almacenamiento y límites",
        responses: {
          "200": { description: "Proveedor activo y buckets permitidos" }
        }
      }
    },
    "/webhooks/supabase": {
      post: {
        tags: ["Webhooks y Sincronización"],
        summary: "Receptor de eventos de base de datos de Supabase",
        responses: {
          "200": { description: "Webhook procesado y retransmitido a SSE" }
        }
      }
    },
    "/cache/stats": {
      get: {
        tags: ["Salud, Métricas y Diagnóstico"],
        summary: "Estadísticas de aciertos y memoria de la caché TTL",
        responses: {
          "200": { description: "Hits, misses y ratio de acierto de caché" }
        }
      }
    },
    "/i18n/languages": {
      get: {
        tags: ["Internacionalización (i18n)"],
        summary: "Obtener la lista de los 10 idiomas oficiales soportados con metadatos y banderas",
        responses: {
          "200": { description: "Lista de idiomas disponibles y el idioma detectado para el cliente" }
        }
      }
    },
    "/i18n/translations/{lang}": {
      get: {
        tags: ["Internacionalización (i18n)"],
        summary: "Descargar el diccionario completo de traducciones para un idioma específico",
        parameters: [
          { name: "lang", in: "path", required: true, schema: { type: "string" }, example: "en" }
        ],
        responses: {
          "200": { description: "Diccionario JSON con todas las cadenas traducidas" }
        }
      }
    },
    "/i18n/detect": {
      get: {
        tags: ["Internacionalización (i18n)"],
        summary: "Detectar el idioma preferido del cliente según sus cabeceras Accept-Language",
        responses: {
          "200": { description: "Código de idioma detectado" }
        }
      }
    },
    "/i18n/translate": {
      post: {
        tags: ["Internacionalización (i18n)"],
        summary: "Traducir una clave a un idioma destino",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["key"],
                properties: {
                  key: { type: "string", example: "concierge.greeting" },
                  target_lang: { type: "string", example: "fr" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Texto traducido" }
        }
      }
    },
    "/health/deep": {
      get: {
        tags: ["Salud, Métricas y Diagnóstico"],
        summary: "Diagnóstico profundo de latencia y benchmarks en paralelo de PostgreSQL, Supabase y DeepSeek AI",
        responses: {
          "200": { description: "Tiempos de respuesta exactos en milisegundos por servicio" }
        }
      }
    },
    "/places/smart-search": {
      get: {
        tags: ["Catálogo y Lugares"],
        summary: "Búsqueda semántica con DeepSeek AI interpretando lenguaje natural y modismos ticos",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" }, example: "café pet friendly con wifi pa bretear" }
        ],
        responses: {
          "200": { description: "Lugares clasificados por afinidad semántica con match_score y justificación IA" }
        }
      }
    },
    "/places/export/geojson": {
      get: {
        tags: ["Catálogo y Lugares"],
        summary: "Exportar el catálogo completo de lugares verificados en formato estándar GeoJSON RFC 7946",
        responses: {
          "200": { description: "FeatureCollection GeoJSON compatible con Leaflet, Mapbox y QGIS" }
        }
      }
    },
    "/events/export/ics": {
      get: {
        tags: ["Catálogo y Lugares"],
        summary: "Exportar todos los eventos y ferias en formato estándar de calendario iCalendar RFC 5545 (.ics)",
        responses: {
          "200": { description: "Archivo iCalendar para Google Calendar / Apple Calendar" }
        }
      }
    },
    "/social/scan-invoice": {
      post: {
        tags: ["Planes Grupales (Social Dining)"],
        summary: "Escanear ticket, factura electrónica o comprobante SINPE con DeepSeek AI",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  text: { type: "string", example: "Restaurante El Roble Total ₡18,450 SINPE Movil 88881111" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Desglose tributario con subtotal, IVA 13%, servicio 10% y propina" }
        }
      }
    },
    "/rescue/match-pet": {
      post: {
        tags: ["Rescate Urbano"],
        summary: "Cruce inteligente de mascotas perdidas y encontradas con DeepSeek AI y radio GPS",
        responses: {
          "200": { description: "Coincidencias ordenadas por porcentaje de similitud y distancia" }
        }
      }
    },
    "/audit/verify-chain": {
      get: {
        tags: ["Auditoría Criptográfica"],
        summary: "Verificar la integridad matemática de toda la cadena de bloques de auditoría",
        responses: {
          "200": { description: "Estado de validez de la cadena de hashes SHA-256 inmutables" }
        }
      }
    },
    "/notifications/vapid-public-key": {
      get: {
        tags: ["Notificaciones Multicanal"],
        summary: "Obtener clave pública VAPID (RFC 8292) para suscripciones Web Push en el navegador",
        responses: {
          "200": { description: "Clave pública VAPID" }
        }
      }
    },
    "/security/qr/generate": {
      post: {
        tags: ["Seguridad QR Criptográfico"],
        summary: "Generar código QR firmado con HMAC-SHA256, expiración y payload personalizado",
        responses: {
          "201": { description: "Token firmado, URL de validación y preview SVG" }
        }
      }
    },
    "/security/qr/redeem": {
      post: {
        tags: ["Seguridad QR Criptográfico"],
        summary: "Canjear código QR con validación de un solo uso e idempotencia",
        responses: {
          "200": { description: "Comprobante de canje exitoso" }
        }
      }
    },
    "/mobility/carbon-footprint": {
      post: {
        tags: ["Movilidad Sostenible"],
        summary: "Calcular ahorro de CO2 (g/kg) y colones (CRC) según estándares oficiales MINAE/IMN de Costa Rica",
        responses: {
          "200": { description: "Cálculo comparativo vs línea base de auto particular" }
        }
      }
    },
    "/merchants/webhooks/subscriptions": {
      post: {
        tags: ["Webhooks para Comercios"],
        summary: "Registrar endpoint de webhook para un comercio aliado",
        responses: {
          "201": { description: "Suscripción creada con clave secreta compartida para verificación HMAC" }
        }
      }
    },
    "/pet-videos": {
      get: {
        tags: ["Videos de Cuidado Animal"],
        summary: "Listar catálogo de videos educativos aprobados con filtros por especie y tema",
        parameters: [
          { name: "species", in: "query", schema: { type: "string" }, description: "perro, gato, ave, conejo" },
          { name: "topic", in: "query", schema: { type: "string" }, description: "alimentacion, higiene, adiestramiento, primeros_auxilios" },
          { name: "search", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Lista de videos verificados con conteo de fragmentos" }
        }
      }
    },
    "/pet-videos/{id}": {
      get: {
        tags: ["Videos de Cuidado Animal"],
        summary: "Obtener detalle de un video aprobado y sus fragmentos verificados",
        responses: {
          "200": { description: "Ficha del video con fragmentos estructurados" },
          "404": { description: "Video no encontrado o no aprobado" }
        }
      }
    },
    "/pet-videos/{id}/questions": {
      post: {
        tags: ["Videos de Cuidado Animal"],
        summary: "Función «Pregúntale al video»: responde preguntas saltando al segundo exacto (startSeconds) o busca en otros videos",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["question"],
                properties: {
                  question: { type: "string", example: "¿Cada cuánto tiempo debo bañar a mi perro?" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Respuesta con startSeconds, match_source y advertencia clínica si aplica" }
        }
      }
    },
    "/pet-videos/{id}/report-broken": {
      post: {
        tags: ["Videos de Cuidado Animal"],
        summary: "Reportar enlace roto o video no disponible en YouTube",
        responses: {
          "200": { description: "Reporte registrado" }
        }
      }
    },
    "/admin/pet-videos/search-youtube": {
      get: {
        tags: ["Videos de Cuidado Animal"],
        summary: "Buscar videos públicos en YouTube Data API v3 (Solo Admin)",
        responses: {
          "200": { description: "Lista de resultados de YouTube" }
        }
      }
    },
    "/admin/pet-videos/register": {
      post: {
        tags: ["Videos de Cuidado Animal"],
        summary: "Registrar video pegando su URL de YouTube con deduplicación canónica (Solo Admin)",
        responses: {
          "201": { description: "Video registrado como borrador" }
        }
      }
    },
    "/admin/pet-videos/{id}/analyze": {
      post: {
        tags: ["Videos de Cuidado Animal"],
        summary: "Analizar video con Gemini multimodal y extraer fragmentos estructurados (Solo Admin)",
        responses: {
          "200": { description: "Resultado del análisis con especie, tema, resumen y fragmentos" }
        }
      }
    },
    "/admin/pet-videos/{id}/approve": {
      post: {
        tags: ["Videos de Cuidado Animal"],
        summary: "Aprobar ficha para publicación en el catálogo (Solo Admin)",
        responses: {
          "200": { description: "Ficha aprobada con registro de quién y cuándo" }
        }
      }
    },
    "/admin/pet-videos/{id}/retire": {
      post: {
        tags: ["Videos de Cuidado Animal"],
        summary: "Retirar video del catálogo público (Solo Admin)",
        responses: {
          "200": { description: "Video archivado" }
        }
      }
    }
  }
};
