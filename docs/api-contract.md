# Contrato de API y Especificación OpenAPI — Sistema de Sinergia Urbana

**Versión:** 1.6.0 (Enterprise Supabase, BCCR Live, Confort Urbano, Calidad de Aire, i18n 10 Idiomas, Hash Chain, Web Push, QR Criptográfico, Movilidad Verde & Webhooks)  
**Entorno Base:** `http://localhost:4000/api`  
**Swagger UI Interactivo:** `http://localhost:4000/api/docs`  
**OpenAPI Spec JSON:** `http://localhost:4000/api/docs/openapi.json`  
**Métricas Prometheus:** `http://localhost:4000/api/metrics`  
**Base de Datos Principal:** Supabase PostgreSQL 17 (`app_private` cerrado con RLS)  
**Motor de IA Principal:** DeepSeek AI (`deepseek-chat` V3 / `deepseek-reasoner` R1 con fallback heurístico resiliente $0)  
**Trazabilidad Distribuida:** Cabecera `x-request-id` (UUIDv4) inyectada en todas las peticiones y respuestas  
**Zona Horaria Oficial:** `America/Costa_Rica` (Almacenamiento interno en UTC ISO-8601)  
**Moneda Principal:** Colones Costarricenses (`CRC`), con soporte de conversión oficial BCCR/Hacienda a Dólares (`USD`).  

---

## 1. Convenciones y Formato Estandarizado de Respuesta

Todas las respuestas del backend siguen estrictamente la estructura envolvente con identificador único de trazabilidad:

### Respuesta Exitosa (`ok: true`)
```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-13T14:30:00.000Z",
    "request_id": "req_1773489200000_3a8f1b",
    "total": 3
  },
  "error": null
}
```

### Respuesta de Error (`ok: false`)
```json
{
  "ok": false,
  "data": null,
  "meta": {
    "timestamp": "2026-11-13T14:30:00.000Z",
    "request_id": "req_1773489200000_3a8f1b"
  },
  "error": {
    "code": "STALE_REVISION_CONFLICT",
    "message": "Conflicto: La propuesta se calculó sobre una versión previa y el plan ya cambió.",
    "details": { "current_revision": 2 }
  }
}
```

---

## 2. Matriz de Roles, Permisos y Autenticación

| Rol | Método de Identificación | Permisos Granulares |
|---|---|---|
| **Visitante** | Sin credenciales | `plans:view`, `places:view`, `events:view` |
| **Invitado** | Cabecera `x-guest-token: gst_tok_...` | `plans:vote` (sin cuenta requerida) |
| **Organizador** | Bearer JWT / Sesión de usuario | `plans:create`, `plans:vote`, `plans:confirm`, `plans:edit` |
| **Comercio** | Bearer JWT (`role: merchant`) | `businesses:claim`, `businesses:corrections` |
| **Admin** | Bearer JWT (`role: admin`) | Todos los permisos: `admin:agents`, `admin:telemetry`, `events:cancel`, `places:verify`, `audit:read` |

---

## 3. Endpoints Principales

### 3.1 Observabilidad, Diagnóstico y Documentación
- **`GET /api/docs`**: Interfaz web interactiva Swagger UI.
- **`GET /api/docs/openapi.json`**: Especificación OpenAPI 3.0.3 en formato JSON.
- **`GET /api/metrics`**: Métricas de rendimiento en formato estándar Prometheus (OpenMetrics).
- **`GET /api/health`**: Estado del servidor y modelo DeepSeek activo.
- **`GET /api/health/supabase`**: Estado en vivo de la conexión con Supabase Cloud (Auth & Storage).
- **`GET /api/health/db`**: Estado de conexión a la base de datos relacional (Supabase PostgreSQL con fallback a SQLite).
- **`GET /api/health/system`**: Telemetría completa (memoria RSS/Heap, CPU, estado de la base y tareas de agentes).

### 3.2 Autenticación, Hashing PBKDF2 y Sesiones
- **`POST /api/auth/login`**: Login con verificación PBKDF2 (100.000 iteraciones). Retorna Access Token + Refresh Token.
- **`POST /api/auth/register`**: Registro de usuarios con contraseña hasheada y sal criptográfica.
- **`POST /api/auth/refresh`**: Rotación segura de Refresh Token y renovación de Access Token.
- **`POST /api/auth/logout`**: Cierre de sesión y revocación del Refresh Token.
- **`GET /api/auth/me`**: Identificación del usuario o invitado activo.
- **`POST /api/auth/guest-session`**: Generación de token criptográfico temporal para votación sin registro.

### 3.3 Catálogo de Lugares y Eventos (Paginación + GPS)
- **`GET /api/places`**
  - **Query Params:** `category`, `verified_only`, `search`, `page`, `limit`, `lat`, `lng`, `radius_km`, `sort_by`, `sort_order`.
  - Soporta cálculo de distancia radial (Haversine) y metadatos de paginación (`total_pages`, `has_next_page`).
- **`GET /api/events`**: Consulta de eventos con filtros de fecha y categoría.
- **`GET /api/events/:id`**: Detalle de evento programado.

### 3.4 Planes Grupales (`social-dining`) con Transacciones ACID
- **`POST /api/social/plans`**: Creación atómica de plan, opciones y paradas con rollback automático ante fallos.
- **`GET /api/social/plans/:code`**: Detalle completo con opciones, paradas, votos y propuesta activa.
- **`PUT /api/social/plans/:code/votes/:optionId`**: Votación idempotente (`can`, `prefer`, `cannot`).
- **`POST /api/social/plans/:code/confirm`**: Confirmación del organizador con snapshot inmutable de paradas.
- **`POST /api/social/plans/:code/proposals/:id/decision`**: Decisión sobre propuesta IA con control de concurrencia optimista (409 Conflict).
- **`GET /api/social/plans/:code/stream`**: Canal Server-Sent Events (SSE) para actualizaciones en vivo.

### 3.5 Copiloto DeepSeek AI (V3 / R1)
- **`GET /api/concierge/status`**: Estado, modelo activo y métricas del motor DeepSeek.
- **`POST /api/concierge/voice-intent`**: Clasificación de intenciones por voz/texto en lenguaje coloquial tico.
- **`POST /api/concierge/chat`**: Conversación multi-turn con memoria de sesión (`session_id`).
- **`POST /api/concierge/multi-day-itinerary`**: Generador de itinerarios de 1 a 3 días con desglose de presupuesto en CRC.
- **`POST /api/concierge/deep-reason`**: Razonamiento analítico con DeepSeek R1 para problemas complejos de optimización de rutas y restricciones.

### 3.6 Rescate Urbano y Auxilio Ciudadano (S.O.S.)
- **`GET /api/rescue/roadside`**: Red de auxilio vial y grúas 24/7 en Costa Rica.
- **`GET /api/rescue/survival-stops`**: Paradas con baños Ley 7600 y cajeros SINPE.
- **`GET /api/rescue/sos`**: Feed de alertas comunitarias abiertas.
- **`POST /api/rescue/sos`**: Crear nueva alerta ciudadana con difusión inmediata por SSE.

### 3.7 Administración y Auditoría
- **`GET /api/audit/history`**: Pista inmutable de auditoría (quién, qué IP, qué cambió, timestamp).
- **`GET /api/admin/agents/status`**: Estado del orquestador y tareas en background.
- **`POST /api/admin/agents/:jobName/run`**: Ejecución manual forzada de agentes autónomos.

### 3.8 Internacionalización Dinámica (i18n — 10 Idiomas Oficiales)
- **`GET /api/i18n/languages`**: Listado de los 10 idiomas oficiales (`es`, `en`, `fr`, `de`, `pt`, `it`, `zh`, `ja`, `ko`, `ru`) con metadatos.
- **`GET /api/i18n/translations/:lang`**: Diccionario completo de traducciones para hidratación del cliente.
- **`GET /api/i18n/detect`**: Detección de idioma preferido según cabeceras `Accept-Language`, `x-language` o query param `?lang=`.
- **`POST /api/i18n/translate`**: Traducción de claves puntuales en tiempo real.

### 3.9 Funciones Enterprise, Inteligencia DeepSeek y Formatos Abiertos
- **`GET /api/health/deep`**: Diagnóstico de latencia profunda en paralelo (PostgreSQL, Supabase Cloud y DeepSeek AI en ms).
- **`GET /api/places/smart-search`**: Búsqueda semántica de lugares mediante lenguaje natural impulsada por DeepSeek AI.
- **`GET /api/places/export/geojson`**: Exportador estándar RFC 7946 GeoJSON de lugares para Leaflet, Mapbox o GIS.
- **`GET /api/events/export/ics`**: Exportador de calendario RFC 5545 iCalendar para Google Calendar y Apple Calendar.
- **`GET /api/events/:id/export/ics`**: Exportador de evento individual en formato `.ics`.
- **`POST /api/social/scan-invoice`**: Extractor OCR inteligente de facturas y comprobantes SINPE Móvil con desglose tributario de Costa Rica.
- **`POST /api/rescue/match-pet`**: Coincidencia visual y morfológica de mascotas extraviadas con filtrado de distancia geográfica.
- **`POST /api/storage/upload`**: Subida de archivos e imágenes a Supabase Storage con verificación MIME y fallback.
- **`POST /api/webhooks/supabase`**: Receptor de webhooks de Supabase con firma HMAC-SHA256 y difusión en vivo vía SSE.

### 3.10 Auditoría Inmutable Criptográfica (Hash Chain Ledger)
- **`GET /api/audit/verify-chain`**: Verificación matemática de la cadena inmutable de hashes SHA-256 (`genesis_hash` a `latest_hash`).
- **`POST /api/audit/chain`**: Registro de un nuevo bloque encadenado con hash canónico de datos.
- **`GET /api/audit/chain/:entityType/:recordId`**: Historial completo de bloques auditados para una entidad específica.

### 3.11 Notificaciones Multicanal y Patrón Outbox
- **`GET /api/notifications/vapid-public-key`**: Retorna la clave pública VAPID (RFC 8292) para Web Push en navegadores.
- **`POST /api/notifications/subscribe`**: Registro o actualización de una suscripción Push del navegador.
- **`POST /api/notifications/queue`**: Encolamiento resiliente en la tabla Outbox (`email`, `webpush`, `whatsapp`).
- **`POST /api/notifications/outbox/process`**: Despacho de lotes pendientes con idempotencia y reintentos automáticos.
- **`GET /api/notifications/outbox/status`**: Estado, suscriptores activos y métricas de entrega.

### 3.12 Seguridad QR Criptográfico y Canje Único
- **`POST /api/security/qr/generate`**: Generación de token QR firmado con HMAC-SHA256, expiración (TTL) y previsualización SVG.
- **`GET /api/security/qr/inspect/:token`**: Inspección y validación de firma sin consumir el código QR.
- **`POST /api/security/qr/redeem`**: Canje de un solo uso con protección contra doble gasto (idempotente).

### 3.13 Movilidad Sostenible y Huella de Carbono (Costa Rica MINAE / IMN)
- **`GET /api/mobility/gam-transit-factors`**: Factores oficiales de emisión (MINAE/IMN), matriz 99% renovable y costo de gasolina RECOPE.
- **`POST /api/mobility/carbon-footprint`**: Cálculo comparativo de emisiones ahorradas ($\text{CO}_2$ en gramos/kg) y colones (CRC) por compartir vehículo (*carpool*), usar autobús o tren urbano Incofer.
- **`GET /api/mobility/badges/:userId`**: Resumen de impacto ecológico acumulado y condecoraciones verdes ganadas.

### 3.14 Motor de Webhooks Salientes para Comercios Locales (*Outbound Webhooks*)
- **`POST /api/merchants/webhooks/subscriptions`**: Registro de URL de callback y generación de secreto de firma `sec_...`.
- **`GET /api/merchants/webhooks/subscriptions`**: Listado de webhooks activos para un comercio.
- **`DELETE /api/merchants/webhooks/subscriptions/:id`**: Revocación de webhook.
- **`POST /api/merchants/webhooks/dispatch`**: Despacho de eventos firmados con `X-Sinergia-Signature` (HMAC-SHA256).
- **`GET /api/merchants/webhooks/deliveries`**: Pista de auditoría con código HTTP de respuesta, duración en ms y estado de entrega.

### 3.15 Motor Financiero BCCR, Multi-divisa y Redondeo en Efectivo
- **`GET /api/finance/exchange-rates`**: Tipos de cambio compra/venta del Banco Central de Costa Rica en vivo y tasas de paridad global (USD, EUR, GBP, CAD).
- **`POST /api/finance/convert`**: Conversión dinámica entre divisas en tiempo real.
- **`POST /api/finance/cash-rounding`**: Redondeo oficial en efectivo del BCCR para eliminación de monedas de ₡1 y ₡2 al múltiplo de ₡5.
- **`POST /api/finance/split-bill-cr`**: División de cuentas de restaurante con cálculo de 13% IVA, 10% propina legal de mesa y desglose en efectivo vs tarjeta.

### 3.16 Clima Satelital, Confort al Aire Libre y Calidad del Aire (Open-Meteo)
- **`GET /api/weather/comfort-index`**: Índice de confort para salidas (0 a 100), alerta temprana de aguacero vespertino del Valle Central y radiación UV extrema.
- **`GET /api/weather/air-quality`**: Calidad del aire en el GAM, material particulado $PM_{2.5}$ / $PM_{10}$, ozono y recomendación deportiva.

### 3.17 Geolocalización Territorial Inversa y Navegación Universal
- **`GET /api/places/reverse-geocode`**: Resolución territorial de coordenadas GPS en provincia, cantón, distrito y código postal costarricense.
- **`GET /api/places/navigation-links`**: Enlaces directos de navegación para Waze, Google Maps, Apple Maps y códigos QR de geolocalización.

### 3.18 Verificación Tributaria de Comercios y Cédulas (Hacienda CR)
- **`GET /api/businesses/verify-id/:id`**: Consulta oficial en el padrón del Ministerio de Hacienda para cédulas físicas (9 dígitos) y jurídicas (10 dígitos). Retorna razón social legal, estado tributario y actividades económicas registradas.
