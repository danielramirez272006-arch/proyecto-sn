# Workflows de Automatización n8n — GoToX Pet OS

Este directorio contiene los **3 workflows exportados en formato `.json`** listos para importarse en cualquier instancia de **n8n** (`Workflows → Import from File`).

Variables de entorno requeridas en n8n:
- `GOTOX_API_URL`: URL base del backend Express (por defecto `http://localhost:4000`).
- `GOTOX_ADMIN_JWT`: Token JWT de una cuenta con rol `admin`.

---

## Workflow 1: Escaneo y Revalidación de Políticas Pet-Friendly
- **Archivo:** [`workflows/01-pet-policy-expiring-alert.json`](./workflows/01-pet-policy-expiring-alert.json)
- **Disparador (Trigger):** `Schedule Trigger` cada 24 horas (08:00 hora Costa Rica) + `Webhook` de confirmación entrante (`/webhook/gotox-pet-policy-confirm`).
- **Pasos de los nodos:**
  1. Invoca `POST /api/admin/places/pet-automation/scan?expiring_within_days=14` para detectar políticas confirmadas próximas a vencer.
  2. Evalúa con un nodo `IF` si `emitted_count > 0`.
  3. Encola la notificación al comercio mediante `POST /api/notifications/queue`.
  4. En la rama de retorno, cuando el comercio confirma sus condiciones en el formulario, el `Webhook` envía la evidencia a `POST /api/admin/places/pet-automation/webhook-confirm`.
- **Problema de negocio que resuelve:** Evita que los restaurantes muestren insignias Pet-Friendly desactualizadas o vencidas (> 180 días), automatizando el recordatorio y la renovación documental.

---

## Workflow 2: Boletín Diario GAM, Clima Podal e Indicadores
- **Archivo:** [`workflows/02-gam-daily-briefing-and-weather-sync.json`](./workflows/02-gam-daily-briefing-and-weather-sync.json)
- **Disparador (Trigger):** `Schedule Trigger` cada 6 horas (`America/Costa_Rica`).
- **Pasos de los nodos:**
  1. Consulta `GET /api/weather/comfort-index?lat=9.9355&lng=-84.0652` para obtener índice de confort térmico y probabilidad de lluvia en el GAM.
  2. Invoca al agente de IA `POST /api/agents/daily-briefing/run` enviando la instantánea climática (registrando automáticamente su ejecución en `ai_interaction_logs`).
  3. Ejecuta `POST /api/notifications/outbox/process` para despachar las alertas preventivas pendientes en el patrón Outbox.
- **Problema de negocio que resuelve:** Mantiene informados a los operadores y tutores sobre ventanas seguras de paseo (evitando quemaduras podales y aguaceros) sin intervención manual.

---

## Workflow 3: Gobernanza Ley N.º 8968 (Eliminación de Datos) y Auditoría de Cadena
- **Archivo:** [`workflows/03-ley8968-data-deletion-and-sos-monitor.json`](./workflows/03-ley8968-data-deletion-and-sos-monitor.json)
- **Disparador (Trigger):** `Webhook` (`POST /webhook/gotox-ley8968-deletion-hook`) invocado tras una solicitud de baja de cuenta.
- **Pasos de los nodos:**
  1. Verifica la integridad matemática de la cadena de auditoría llamando a `GET /api/audit/verify-chain`.
  2. Registra una verificación con el agente moderador `POST /api/agents/report-consensus/run`.
  3. Procesa el envío de la confirmación de eliminación de datos al titular mediante `POST /api/notifications/outbox/process`.
- **Problema de negocio que resuelve:** Automatiza el cumplimiento auditable de la **Ley N.º 8968 de Costa Rica**, garantizando que las solicitudes de baja queden confirmadas por correo y que la bitácora inmutable no haya sido alterada.
