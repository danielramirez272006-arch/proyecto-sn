# Recorrido de Prueba y Lista de Verificación MVP

Esta guía permite al equipo frontend y evaluadores reproducir y validar el 100% de los flujos del sistema en local.

---

## 1. Orden de Puesta en Marcha

```bash
# 1. Posicionarse en el backend
cd backend

# 2. Instalar dependencias (si es primera vez)
npm install

# 3. Aplicar migraciones y seeds del catálogo (1 feria, 2 cafés, 1 plan demo)
npm run migrate
npm run seed

# 4. Iniciar servidor de desarrollo
npm run dev
```

El servidor quedará escuchando en `http://localhost:4000`.
- **Swagger UI Interactivo:** `http://localhost:4000/api/docs`
- **Especificación OpenAPI 3.0:** `http://localhost:4000/api/docs/openapi.json`
- **Chequeo de Salud y Telemetría:** `http://localhost:4000/api/health/system`

---

## 2. Recorrido de Prueba Paso a Paso (Flujo Crítico)

### Paso 1: Verificación de Salud, Base de Datos y DeepSeek AI
- Ejecutar: `GET http://localhost:4000/api/health`
  - Respuesta esperada: `{ ok: true, data: { status: "healthy", ai_copilot: "DeepSeek AI Active" } }`
- Ejecutar: `GET http://localhost:4000/api/health/db`
  - Respuesta esperada: `{ ok: true, data: { ok: true, status: "connected" } }`
- Ejecutar: `GET http://localhost:4000/api/concierge/status`
  - Respuesta esperada: `{ ok: true, data: { provider: "DeepSeek", activeModel: "deepseek-chat" } }`

### Paso 2: Consulta del Catálogo Semilla
- Ejecutar: `GET http://localhost:4000/api/places`
  - Verificar: 3 lugares cargados (`plc_feria_1`, `plc_cafe_1`, `plc_cafe_2`) con `verified_by_admin: true` y sus metadatos por atributo.
- Ejecutar: `GET http://localhost:4000/api/events`
  - Verificar: Evento `evt_feria_sabado_1` en estado `published`.

### Paso 3: Plan Demo y Votación Idempotente
- Ejecutar: `GET http://localhost:4000/api/social/plans/PLAN-CR-772`
- Unirse como invitado:
  - `POST http://localhost:4000/api/social/plans/PLAN-CR-772/guests` con `{ "name": "Elena Rojas" }`
  - Guardar el `guest_token` devuelto (o usar `POST /api/auth/guest-session`).
- Votar:
  - `PUT http://localhost:4000/api/social/plans/PLAN-CR-772/votes/opt_demo_1`
  - Cabecera: `x-guest-token: <guest_token>`
  - Body: `{ "vote_type": "prefer" }`
- Votar de nuevo por la misma opción con `"vote_type": "can"`:
  - Verificar que el total de votos se actualiza y no se duplica el conteo.

### Paso 4: Confirmación del Plan por el Organizador
- `POST http://localhost:4000/api/social/plans/PLAN-CR-772/confirm`
- Body: `{ "selected_option_id": "opt_demo_1" }`
- Verificar: El plan pasa a `status: "confirmed"`, su `revision` pasa a `2`, y las paradas guardan su snapshot inmutable.

### Paso 5: Cancelación de Evento y Propuesta Automática de DeepSeek IA
- El Administrador cancela el evento debido a alerta meteorológica:
  - `PATCH http://localhost:4000/api/admin/events/evt_feria_sabado_1`
  - Cabecera: `Authorization: Bearer <token_admin>`
  - Body: `{ "status": "cancelled" }`
- El agente de operaciones detecta el plan `PLAN-CR-772` afectado y crea una propuesta en `plan_proposals` ligada a la revisión vigente.
- Consultar de nuevo el plan: `GET http://localhost:4000/api/social/plans/PLAN-CR-772`
- Verificar que `active_proposal` contiene la alternativa bajo techo con su motivo.

### Paso 6: Aceptación de la Propuesta y Control de Concurrencia
- Si se envía `expected_revision: 1` (desactualizada):
  - Devuelve `409 Conflict` con `{ "current_revision": 2 }`.
- Si se envía `expected_revision: 2` (correcta):
  - Transición atómica exitosa.
  - El plan incrementa a `revision: 3`.
  - La propuesta pasa a `accepted`.
  - Los invitados pasan a `attendance_status: "needs_reconfirmation"`.
  - Se encolan avisos de cambio aprobado en la tabla `notification_outbox` con clave de idempotencia única.

### Paso 7: Comprobación con Proveedores Externos Desconectados
- Desconectar internet o apagar servicios externos.
- El backend sigue permitiendo abrir el plan, votar, editar manualmente y encolar avisos usando sus respaldos locales con $0 costo.

---

## 3. Estado de la Suite de Pruebas Automatizadas

Ejecutar desde el directorio raíz o `backend/`:
```bash
npm run test:backend
```
Resultado: **26/26 pruebas superadas** con cobertura de:
- Migraciones y seeds iniciales.
- Creación, votación idempotente y confirmación inmutable de planes grupales.
- Concurrencia optimista (409 Conflict).
- Conexión y métricas de DeepSeek AI.
- Orquestador de agentes autónomos y ejecución manual de tareas.
- Endpoints de auxilio y rescate ciudadano S.O.S.
- Documentación OpenAPI 3.0 en vivo.
