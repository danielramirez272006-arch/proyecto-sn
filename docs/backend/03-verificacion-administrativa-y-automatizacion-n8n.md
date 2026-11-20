# 03 — Verificación Administrativa Pet-Friendly y Automatización n8n

## 1. Servicio de Verificación y Evidencia (`pet-verification-service.js`)

Ubicación: `backend/src/modules/admin-control/pet-verification-service.js`

A diferencia de un simple booleano `pet_friendly = true/false`, el backend mantiene un historial auditable de evidencias en la tabla `place_pet_evidence`. Cada modificación administrativa registra:

- `source_type`: `'business_confirmation'` (confirmado por el propietario/administrador del local) o `'admin_review'` (inspección del equipo GoToX).
- `access_status`: `'allowed'`, `'not_allowed'` o `'unknown'`.
- `conditions_json`:
  - `species_allowed`: arreglo de especies permitidas (ej. `["dog", "cat"]`).
  - `seating_access`: `'outdoor'`, `'indoor'` o `'both'`.
  - `max_pets`: cupo máximo de mascotas por mesa.
  - `size_or_weight_restriction`: texto claro con restricciones de peso o porte.
  - `leash_required` y `reservation_required`: booleanos explícitos.
  - `notes`: observaciones públicas para los tutores.
- `evidence_ref`: referencia documental obligatoria (correo, acta de inspección o enlace oficial).
- `expires_at`: fecha de vencimiento de la verificación (por defecto **180 días / 6 meses** desde su confirmación).

---

## 2. Ciclo de Vida de la Evidencia y Resolución de Conflictos

1. **Registro / Actualización de Política (`PUT /api/admin/places/:id/pet-policy`)**:
   - Marca como `outdated` las evidencias administrativas anteriores de ese local, inserta la nueva evidencia activa y sincroniza `places.attributes_metadata.pet_policy` y `places.verified_by_admin`.
2. **Confirmación de Vigencia Semestral (`POST /api/admin/places/:id/pet-confirm`)**:
   - Renueva la vigencia por otros 180 días y sella el registro en la pista de auditoría (`auditService`).
3. **Marcado de Evidencia Desactualizada (`POST /api/admin/places/:id/pet-outdated`)**:
   - Cambia el estado de la evidencia activa a `outdated`, retira el sello de confirmación vigente y emite un evento para re-verificación.
4. **Resolución de Contradicciones (`POST /api/admin/places/:id/pet-resolve-conflict`)**:
   - Cuando señales externas contradicen la política interna, permite al administrador fijar el veredicto definitivo y archivar las señales conflictivas.
5. **Retiro de Confirmación (`DELETE /api/admin/places/:id/pet-confirm`)**:
   - Revoca inmediatamente la insignia de verificación del comercio (`verified_by_admin = false`) y pasa el estado a `unknown` hasta nueva inspección.

---

## 3. Integración con Workflows de n8n y Scheduler Autónomo

### Tabla `automation_events` e Idempotencia
Para automatizar el seguimiento con comercios aliados mediante **n8n** sin duplicar correos ni webhooks:
- Cada evento emitido genera una clave única `dedupe_key` (por ejemplo, `pet_policy_expiring:LOC-001:2026-11`).
- Tipos de eventos emitidos automáticamente:
  - `PET_POLICY_EXPIRING_SOON`: La confirmación del local vence dentro de los próximos 14 días.
  - `PET_POLICY_EXPIRED`: La evidencia superó su fecha `expires_at`.
  - `PET_POLICY_CONFLICT_DETECTED`: Dos fuentes reportan estados opuestos (`allowed` vs `not_allowed`).
  - `PET_POLICY_UNVERIFIED_POPULAR`: Local sin evidencia confirmada que requiere contacto comercial.

### Agente Periódico en el Scheduler (`autonomous-agents/index.js`)
- El planificador de agentes ejecuta periódicamente `petVerificationService.scanAndEmitAutomationEvents({ expiringWithinDays: 14 })` para detectar políticas próximas a vencer y encolarlas en `automation_events`.

### Endpoints para n8n y Administración
| Método y Ruta | Descripción |
| :--- | :--- |
| `POST /api/admin/places/pet-automation/scan` | Dispara manualmente el escaneo de políticas vencidas o por vencer y devuelve los eventos emitidos. |
| `POST /api/admin/places/pet-automation/webhook-confirm` | Recibe confirmaciones entrantes desde un workflow de **n8n** cuando un comercio responde al formulario de revalidación. |
| `GET /api/admin/places/multisource/automation-events` | Lista los eventos de automatización pendientes o procesados para monitoreo en el panel o consumo por polling de n8n. |
| `POST /api/admin/places/multisource/resolve-identity` | Vincula, marca como ambiguo o rechaza el enlace entre un `place_id` interno y un `external_id` de OSM/Geoapify/Foursquare/Google. |
