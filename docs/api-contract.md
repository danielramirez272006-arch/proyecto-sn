# Contrato de API y Especificación OpenAPI — Sistema de Sinergia Urbana

**Versión:** 1.2.0 (Enterprise MVP)  
**Entorno Base:** `http://localhost:4000/api`  
**Swagger UI Interactivo:** `http://localhost:4000/api/docs`  
**OpenAPI Spec JSON:** `http://localhost:4000/api/docs/openapi.json`  
**Métricas Prometheus:** `http://localhost:4000/api/metrics`  
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
- **`GET /api/health/db`**: Estado de conexión a la base de datos relacional.
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
