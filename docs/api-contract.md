# Contrato de API y Especificación OpenAPI — Sistema de Sinergia Urbana

**Versión:** 1.0.0 (MVP)  
**Entorno Base:** `http://localhost:4000/api`  
**Zona Horaria Oficial:** `America/Costa_Rica` (Almacenamiento interno en UTC ISO-8601)  
**Moneda Principal:** Colones Costarricenses (`CRC`), con soporte de conversión oficial BCCR/Hacienda a Dólares (`USD`).  

---

## 1. Convenciones y Formato Estandarizado de Respuesta

Todas las respuestas del backend siguen estrictamente la estructura envolvente:

### Respuesta Exitosa (`ok: true`)
```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-12T15:30:00.000Z",
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
    "timestamp": "2026-11-12T15:30:00.000Z"
  },
  "error": {
    "code": "STALE_REVISION_CONFLICT",
    "message": "Conflicto: La propuesta se calculó sobre una versión previa y el plan ya cambió.",
    "details": { "current_revision": 2 }
  }
}
```

---

## 2. Matriz de Roles y Autenticación

| Rol | Método de Identificación | Permisos |
|---|---|---|
| **Visitante** | Sin credenciales | Consulta pública de lugares, eventos, clima y vista del plan por código. |
| **Invitado** | Cabecera `x-guest-token: tok_guest_...` | Votar opciones (`can`, `prefer`, `cannot`), reconfirmar asistencia. No puede editar plan ni ver emails privados. |
| **Organizador** | Bearer JWT / Sesión de usuario | Crear plan, invocar IA para alternativas, confirmar opción definitiva, editar paradas manualmente, aceptar/rechazar propuestas. |
| **Comercio** | Bearer JWT (`role: merchant`) | Proponer correcciones de local (`POST /api/businesses/place-corrections`) con evidencia. |
| **Admin** | Bearer JWT (`role: admin`) | CRUD de catálogo, candado `verified_by_admin`, reprogramar/cancelar eventos, aprobar correcciones, auditar webhooks y telemetría de agentes. |

---

## 3. Endpoints Principales [MVP]

### 3.1 Salud y Estado de Servicios
- **`GET /api/health`**
  - Chequeo general del servidor HTTP y tiempo activo.
- **`GET /api/health/db`**
  - Chequeo de disponibilidad de la base de datos (MySQL 8 / SQLite integrado).

### 3.2 Catálogo de Lugares y Eventos
- **`GET /api/places`**
  - **Query Params:** `category` (`cafe`, `feria`, `veterinaria`), `verified_only` (`true`/`false`), `search`, `limit`, `offset`.
  - Devuelve locales con su candado `verified_by_admin` y metadatos de verificación por atributo (`pet_friendly`, `ley_7600_ramp`, `sinpe_movil`).
- **`GET /api/events`**
  - **Query Params:** `status` (`published`, `rescheduled`, `cancelled`), `category`, `fromDate`.
- **`GET /api/events/:id`**

### 3.3 Planes Grupales (`social-dining`)
- **`POST /api/social/plans`**
  - Crea un nuevo plan con código único compartible (ej. `PLAN-CR-772`).
  - **Body:** `{ title, budget_crc, options: [ { title, stops: [ { place_id, event_id, start_time, end_time } ] } ] }`
- **`GET /api/social/plans/:code`**
  - Obtiene el plan completo con opciones, paradas, conteo de votos agregados y propuesta activa si existe. Máscara datos privados si quien consulta no es organizador.
- **`POST /api/social/plans/:code/guests`**
  - Onboarding de invitado. Devuelve `guest_token`.
- **`PUT /api/social/plans/:code/votes/:optionId`**
  - Emite o actualiza voto (`vote_type`: `can`, `prefer`, `cannot`). Es idempotente y no duplica votos.
- **`POST /api/social/plans/:code/confirm`**
  - Confirmación del organizador (`selected_option_id`). Genera snapshot inmutable de paradas e incrementa la revisión.
- **`PUT /api/social/plans/:code`**
  - Edición manual por parte del organizador (`title`, `budget_crc`, `selected_option_id`).
- **`POST /api/social/plans/:code/proposals/:id/decision`**
  - Acepta o rechaza propuesta alternativa. Si `expected_revision` no coincide con la actual, devuelve `409 Conflict`.
- **`GET /api/social/plans/:code/stream`**
  - Conexión Server-Sent Events (SSE) para actualizaciones en vivo (votos, confirmación, propuestas).

### 3.4 Herramientas de Mesa y Finanzas
- **`POST /api/social/midpoint`**
  - Triangula el punto medio justo de múltiples coordenadas geográficas.
- **`POST /api/social/split-bill`**
  - Divide cuenta considerando 13% IVA y 10% servicio oficial de Costa Rica con escudo anti-doble propina.
- **`POST /api/social/sinpe-sms`**
  - Genera comandos y enlaces nativos SMS para SINPE Móvil (BAC, BNCR, BCR).

### 3.5 Copiloto IA y Voz
- **`POST /api/concierge/voice-intent`**
  - Recibe audio transcripto o texto y devuelve intención estructurada, presupuesto estimado en CRC y texto para síntesis de voz.
- **`POST /api/concierge/plan-drafts`**
  - Genera un borrador editable de salida con presupuesto desglosado.

### 3.6 Administración y Operaciones
- **`PATCH /api/admin/events/:id`**
  - Publica, reprograma o cancela eventos. Si se cancela o reprograma, el `plan-operations-agent` detecta automáticamente planes afectados y genera propuestas alternativas.
- **`POST /api/admin/places`**, **`PUT /api/admin/places/:id`**, **`PUT /api/admin/places/:id/lock`**
- **`GET /api/admin/duplicates`**, **`POST /api/admin/merge-duplicates`**
- **`GET /api/admin/corrections`**, **`POST /api/admin/corrections/:id/decision`**
- **`GET /api/admin/notifications`**, **`POST /api/admin/notifications/:id/retry`**

