# 06 — Catálogo Técnico de los 8 Agentes de IA Funcionales

Todos los agentes de IA de **GoToX Pet OS** se encuentran centralizados y orquestados en [`backend/src/services/ai-agents-hub-service.js`](../../backend/src/services/ai-agents-hub-service.js), expuestos mediante:
- `GET /api/agents` (listado de los 8 agentes y roles autorizados)
- `POST /api/agents/:agentName/run` (ejecución protegida con JWT, RBAC y `aiLimiter`)
- `GET /api/agents/logs` (bitácora administrativa desde `ai_interaction_logs`)

### Reglas Transversales de Privacidad y Auditoría
1. **Bitácora Obligatoria en BD (`ai_interaction_logs`)**: Cada ejecución registra `agent_name`, `invoked_by`, `invoked_role`, `input_summary`, `output_summary`, `provider`, `model`, `latency_ms`, `status` y `created_at`.
2. **Anonimización de PII (`sanitizePiiForPrompt`)**: Antes de enviar prompts a Google Gemini o DeepSeek y antes de guardar en bitácora, se redactan automáticamente correos (`[EMAIL_REDACTADO]`), teléfonos de Costa Rica (`[TELEFONO_REDACTADO]`) y cédulas (`[CEDULA_REDACTADA]`).

---

## Fichas Técnicas de los 8 Agentes

### 1. `bruno-concierge` — Copiloto Bruno (Concierge Bienestar Pet)
- **Objetivo de negocio:** Orientar a los tutores sobre bienestar animal, condiciones térmicas del asfalto y salidas pet-friendly en el GAM.
- **Rol autorizado:** `client`, `organizer`, `merchant`, `business_owner`, `admin`.
- **Datos de entrada:** `{ "message": "texto de consulta", "session_id": "opcional" }`.
- **Resultado esperado:** Respuesta contextual en lenguaje natural (`reply`) y modo de ejecución (`gemini_ai` o `heuristic_fallback`).
- **Modelo / Proveedor IA:** Google Gemini (`gemini-2.0-flash`) con respaldo heurístico local.
- **Protección de datos (PII):** Redacción previa de correos, teléfonos y cédulas con `sanitizePiiForPrompt` antes de invocar a Gemini.

### 2. `video-analyzer` — Analizador de Videos Veterinarios (YouTube)
- **Objetivo de negocio:** Extraer especie, tema veterinario, resumen y fragmentos con marcas de tiempo para el catálogo verificado de videos educativos.
- **Rol autorizado:** `admin`.
- **Datos de entrada:** `{ "youtube_url": "https://www.youtube.com/watch?v=...", "title": "...", "duration_seconds": 240 }`.
- **Resultado esperado:** JSON estructurado con `species`, `topic`, `summary` y arreglo `fragments[]` con `start_seconds`.
- **Modelo / Proveedor IA:** Google Gemini (`gemini-2.0-flash`).
- **Protección de datos (PII):** Solo procesa metadatos públicos de YouTube; ningún dato personal de usuario se envía al modelo.

### 3. `auto-tagger` — Clasificador Semántico de Comercios (`AutoTaggerAI`)
- **Objetivo de negocio:** Sugerir etiquetas de terraza, nivel acústico y compatibilidad pet-friendly para acelerar la curación del catálogo.
- **Rol autorizado:** `admin`.
- **Datos de entrada:** `{ "name": "Nombre local", "description": "...", "category": "cafe" }`.
- **Resultado esperado:** Etiquetas sugeridas (`tags`) y puntuación de confianza (`confidence`).
- **Modelo / Proveedor IA:** DeepSeek (`deepseek-chat`) con respaldo heurístico.
- **Protección de datos (PII):** Se redacta cualquier correo o teléfono personal presente en descripciones comerciales antes del prompt.

### 4. `propose-alternative` — Agente de Planes Alternativos por Clima/Aforo
- **Objetivo de negocio:** Proponer establecimientos cubiertos o más silenciosos cuando un aguacero o saturación afecta una salida grupal.
- **Rol autorizado:** `client`, `organizer`, `admin`.
- **Datos de entrada:** `{ "plan_id": "opcional", "reason": "Lluvia en Escalante" }`.
- **Resultado esperado:** Lista priorizada de locales alternativos (`alternatives[]`) con zona y referencia acústica.
- **Modelo / Proveedor IA:** DeepSeek (`deepseek-chat`) con motor de reglas local.
- **Protección de datos (PII):** Solo utiliza IDs internos de plan y zona geográfica agregada, sin nombres ni correos de invitados.

### 5. `daily-briefing` — Editor de Boletín Diario GAM (`Weather & Ops`)
- **Objetivo de negocio:** Consolidar el resumen operativo diario del GAM (clima, riesgo de quemadura podal y estado de terrazas) para el panel y n8n.
- **Rol autorizado:** `admin`.
- **Datos de entrada:** `{ "weather_snapshot": { ... } }` (opcional).
- **Resultado esperado:** Boletín estructurado con fecha, zona y recomendaciones preventivas del día.
- **Modelo / Proveedor IA:** DeepSeek (`deepseek-chat`).
- **Protección de datos (PII):** Consume únicamente telemetría ambiental agregada del GAM; cero datos personales.

### 6. `lost-pet-matcher` — Matcher Visual de Mascotas Extraviadas (SOS)
- **Objetivo de negocio:** Aumentar la probabilidad de reencuentro comparando reportes de mascotas extraviadas vs encontradas por características físicas y radio GPS.
- **Rol autorizado:** `client`, `organizer`, `admin`.
- **Datos de entrada:** `{ "lost_pet": { species, breed, color, lat, lng }, "found_pets": [...], "max_distance_km": 5 }`.
- **Resultado esperado:** Lista ordenada de coincidencias (`matches[]`) con puntaje de similitud y distancia.
- **Modelo / Proveedor IA:** DeepSeek (`deepseek-chat`) + distancia Haversine.
- **Protección de datos (PII):** Solo envía atributos físicos del animal y coordenadas aproximadas; se excluyen teléfonos y nombres del dueño.

### 7. `invoice-extractor` — Extractor de Facturas y Comprobantes SINPE
- **Objetivo de negocio:** Leer montos, IVA (13%) y servicio (10%) de tickets o comprobantes para automatizar la división de cuentas grupales.
- **Rol autorizado:** `client`, `organizer`, `merchant`, `admin`.
- **Datos de entrada:** `{ "text": "texto de factura o comprobante" }`.
- **Resultado esperado:** Desglose de ítems, subtotal, impuestos y total en colones (`CRC`).
- **Modelo / Proveedor IA:** DeepSeek (`deepseek-chat`) con parser determinista de respaldo.
- **Protección de datos (PII):** Redacta correos, números de teléfono SINPE y cédulas antes de enviar el texto al modelo.

### 8. `report-consensus` — Moderador de Consenso de Reportes Urbanos
- **Objetivo de negocio:** Validar la confiabilidad de reportes ciudadanos (ruido, calor de calzada, incidencias) cruzando múltiples fuentes y reputación GPS.
- **Rol autorizado:** `admin`.
- **Datos de entrada:** `{ "source": "...", "count": 3 }` (opcional).
- **Resultado esperado:** Dictamen de consenso (`consensus_status`, `evaluated: true`) y resumen de reportes procesados.
- **Modelo / Proveedor IA:** DeepSeek (`deepseek-chat`).
- **Protección de datos (PII):** Evalúa metadatos agregados e identificadores internos opacos, sin exponer identidades de ciudadanos.
