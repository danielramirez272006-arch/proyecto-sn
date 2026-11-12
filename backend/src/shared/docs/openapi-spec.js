module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Sinergia Urbana Costa Rica - Backend API",
    version: "1.0.0",
    description: "API REST, Copiloto DeepSeek AI y Conectores Abiertos para coordinación social, rescate urbano y comercio local en Costa Rica.",
    contact: {
      name: "Sinergia Urbana Dev Team",
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
    { name: "Salud y Diagnóstico", description: "Verificación de latencia, memoria y disponibilidad" },
    { name: "Catálogo y Lugares", description: "Lugares, ferias del agricultor y cafeterías de especialidad" },
    { name: "Planes Grupales (Social Dining)", description: "Coordinación, votación y confirmación de planes" },
    { name: "Eventos Pop-Up", description: "Gestión y alerta de eventos en vivo" },
    { name: "DeepSeek AI Copiloto", description: "Clasificación de intenciones por voz y borrador de salidas" },
    { name: "Agentes Autónomos", description: "Control y monitoreo de tareas en background" },
    { name: "Rescate Urbano", description: "Mascotas perdidas, auxilio vial y emergencias" },
    { name: "Administración", description: "Operaciones reservadas para administradores y moderadores" }
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Salud y Diagnóstico"],
        summary: "Chequeo básico de salud del backend",
        responses: {
          "200": {
            description: "Servidor operativo",
            content: { "application/json": {} }
          }
        }
      }
    },
    "/health/db": {
      get: {
        tags: ["Salud y Diagnóstico"],
        summary: "Chequeo de conectividad a la base de datos (MySQL / SQLite)",
        responses: {
          "200": { description: "Base de datos conectada y operativa" }
        }
      }
    },
    "/health/system": {
      get: {
        tags: ["Salud y Diagnóstico"],
        summary: "Telemetría completa de memoria, DeepSeek AI y agentes",
        responses: {
          "200": { description: "Métricas del sistema" }
        }
      }
    },
    "/places": {
      get: {
        tags: ["Catálogo y Lugares"],
        summary: "Listar lugares del catálogo urbano",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" }, description: "Filtrar por categoría (cafe, feria, vet, etc.)" },
          { name: "verified_only", in: "query", schema: { type: "boolean" }, description: "Solo lugares verificados oficialmente" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Búsqueda por texto" },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } }
        ],
        responses: {
          "200": { description: "Lista de lugares coincidentes" }
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
        tags: ["DeepSeek AI Copiloto"],
        summary: "Clasificar transcripción de voz o texto con DeepSeek",
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
        tags: ["DeepSeek AI Copiloto"],
        summary: "Consultar estado, modelo y métricas del motor DeepSeek AI",
        responses: {
          "200": { description: "Estado y telemetría de DeepSeek" }
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
    }
  }
};
