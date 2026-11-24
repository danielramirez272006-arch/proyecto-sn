# Workflows Avanzados de n8n con Ecosistema Google

Este directorio contiene los **3 workflows empresariales exportados en formato `.json`** listos para importarse en **n8n** (`Workflows → Import from File`). Cada flujo combina el backend REST de la plataforma con **servicios oficiales de Google** (**Google Gemini**, **Gmail**, **Google Sheets**, **Google Calendar** y **Google Drive**) e incluye lógica avanzada (`SplitInBatches`, `Switch`, `Merge` paralelo, `IF` y nodos `Code` en JavaScript).

---

## Credenciales y Variables de Entorno en n8n

### Credenciales de Google a configurar en n8n
1. **Google Gemini API (`googlePalmApi`)**: Clave de Google AI Studio (`GEMINI_API_KEY`) para los nodos `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`.
2. **Gmail OAuth2 (`gmailOAuth2`)**: Para envío de notificaciones a comercios, alertas térmicas y certificados legales Ley N.º 8968.
3. **Google Sheets OAuth2 (`googleSheetsOAuth2Api`)**: Para bitácoras vivas de auditoría Pet-Friendly, telemetría climática y expedientes PRODHAB.
4. **Google Calendar OAuth2 (`googleCalendarOAuth2Api`)**: Para agendar inspecciones presenciales automáticas cuando un comercio entra en conflicto o vencimiento crítico.
5. **Google Drive OAuth2 (`googleDriveOAuth2Api`)**: Para archivar boletines diarios `.md` y actas legales de supresión de datos.

### Variables de entorno sugeridas
- `API_BASE_URL`: URL del backend Express (`http://localhost:4000`).
- `ADMIN_JWT_TOKEN`: Token JWT con rol `admin`.
- `GOOGLE_SHEET_PET_AUDIT_ID`, `GOOGLE_SHEET_TELEMETRY_ID`, `GOOGLE_SHEET_PRODHAB_ID`: IDs de las hojas de cálculo de Google Sheets.
- `GOOGLE_DRIVE_REPORTS_FOLDER_ID`, `GOOGLE_DRIVE_PRODHAB_FOLDER_ID`: IDs de las carpetas en Google Drive.

---

## Workflow 1: Auditoría y Revalidación Omnicanal de Comercios Pet-Friendly (13 Nodos)
- **Archivo:** [`workflows/01-pet-policy-expiring-alert.json`](./workflows/01-pet-policy-expiring-alert.json)
- **Integraciones Google:** `Google Gemini` + `Gmail` + `Google Sheets` + `Google Calendar`
- **Disparadores (Triggers):**
  1. `Schedule Trigger` diario (08:00 `America/Costa_Rica`).
  2. `Webhook` de confirmación entrante (`POST /webhook/pet-policy-confirm`).
- **Flujo detallado de los nodos:**
  1. Consulta `POST /api/admin/places/pet-automation/scan?expiring_within_days=14`.
  2. Recorre cada establecimiento afectado con **`SplitInBatches`**.
  3. Evalúa la severidad con un nodo **`Switch`**:
     - Si hay conflicto (`PET_POLICY_CONFLICT_DETECTED`) → agenda automáticamente una visita en **`Google Calendar`**.
     - Si vence en `<= 14 días` (`PET_POLICY_EXPIRING_SOON`) → pasa a redacción asistida.
  4. **`Google Gemini`** redacta el mensaje personalizado para el comercio.
  5. **`Gmail`** envía el correo con el enlace de confirmación en un clic.
  6. **`Google Sheets`** hace `appendOrUpdate` en la pestaña `Auditoria_Comercios`.
  7. Cuando el comercio responde al **`Webhook`**, un nodo **`Code`** valida la evidencia, actualiza `POST /api/admin/places/pet-automation/webhook-confirm`, marca `confirmado_180_dias` en **`Google Sheets`** y envía el sello renovado por **`Gmail`**.
- **Problema de negocio que resuelve:** Elimina la caducidad silenciosa de políticas Pet-Friendly y coordina en tiempo real a inspectores y propietarios mediante Google Workspace.

---

## Workflow 2: Telemetría Climática en Paralelo, Boletín Gemini y Archivo en Google Drive + Sheets (11 Nodos)
- **Archivo:** [`workflows/02-gam-daily-briefing-and-weather-sync.json`](./workflows/02-gam-daily-briefing-and-weather-sync.json)
- **Integraciones Google:** `Google Gemini` + `Google Sheets` + `Google Drive` + `Gmail`
- **Disparador (Trigger):** `Schedule Trigger` cada 6 horas (`America/Costa_Rica`).
- **Flujo detallado de los nodos:**
  1. Dispara **3 consultas HTTP en paralelo**:
     - `GET /api/weather/comfort-index` (temperatura y lluvia en el GAM).
     - `GET /api/weather/air-quality` (calidad del aire e índice UV).
     - `GET /api/calendar/holidays/status` (feriados oficiales y restricción vehicular en CR).
  2. Unifica las 3 respuestas con **`Merge`** y calcula en un nodo **`Code`** la temperatura estimada del asfalto (`ambient * 1.22`) y la severidad (`CRITICAL`, `MODERATE`, `OPTIMAL`).
  3. Invoca `POST /api/agents/daily-briefing/run` (dejando trazabilidad en `ai_interaction_logs`) y sintetiza el boletín por zonas con **`Google Gemini`**.
  4. Registra la serie histórica en **`Google Sheets`** (`Historico_Clima_GAM`) y crea el archivo `.md` del reporte en **`Google Drive`**.
  5. Evalúa con un nodo **`IF`** si `severity === 'CRITICAL'` (`asfalto >= 30 °C` o `lluvia >= 75%`); en caso afirmativo, envía alerta por **`Gmail`** y despacha `POST /api/notifications/outbox/process`.
- **Problema de negocio que resuelve:** Previene quemaduras podales y golpes de calor en mascotas mediante monitoreo multi-fuente automatizado y respaldado en Google Drive y Sheets.

---

## Workflow 3: Gobernanza Legal Ley N.º 8968 (PRODHAB) con Google Drive, Sheets, Gemini y Gmail (10 Nodos)
- **Archivo:** [`workflows/03-ley8968-data-deletion-and-sos-monitor.json`](./workflows/03-ley8968-data-deletion-and-sos-monitor.json)
- **Integraciones Google:** `Google Gemini` + `Google Drive` + `Google Sheets` + `Gmail`
- **Disparador (Trigger):** `Webhook` (`POST /webhook/ley8968-deletion-hook`) al procesarse una baja de cuenta (`POST /api/auth/delete-account`).
- **Flujo detallado de los nodos:**
  1. Un nodo **`Code`** enmascara el correo del titular (`u***@dominio.cr`) para que ningún dato personal en texto plano viaje a hojas de cálculo externas.
  2. Verifica la integridad de la cadena de bloques de auditoría en `GET /api/audit/verify-chain`.
  3. Un nodo **`IF`** bifurca según `$json.data.valid`:
     - Si la cadena fue alterada (`false`) → envía alerta crítica por **`Gmail`** al oficial de seguridad.
     - Si la cadena es íntegra (`true`) → registra el dictamen en `POST /api/agents/report-consensus/run`.
  4. **`Google Gemini`** redacta el *Certificado Formal de Supresión y Anonimización de Datos Personales* bajo la Ley N.º 8968.
  5. **`Google Drive`** archiva el acta en la carpeta de cumplimiento PRODHAB, **`Google Sheets`** registra el número de expediente y **`Gmail`** envía la constancia al titular.
- **Problema de negocio que resuelve:** Garantiza evidencia legal inmutable de cumplimiento de autodeterminación informativa (Ley N.º 8968 de Costa Rica) auditada con Hash Chain SHA-256 y archivada en Google Workspace.
