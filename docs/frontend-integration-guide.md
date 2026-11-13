# Guía de Integración para el Frontend — Sinergia Urbana Costa Rica

Esta guía está diseñada para que el desarrollador frontend pueda conectar de inmediato la interfaz de usuario con el backend de Express, la base de datos **Supabase PostgreSQL** y el motor de IA **DeepSeek**.

---

## 1. Configuración del Entorno Frontend

Crea un archivo `.env` en la carpeta `frontend/` (o toma como base `frontend/.env.example`):

```env
# URL del Backend Express local
VITE_API_BASE_URL=http://localhost:4000/api

# Configuración Pública de Supabase (100% segura para el navegador)
VITE_SUPABASE_URL=https://hnnnreowlbtqqjhpmdvd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhubm5yZW93bGJ0cXFqaHBtZHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzU5MjQsImV4cCI6MjEwODM1MTkyNH0.RLI4wnTsdxGh_6A7lf9qzuOmFmLQl43xIypkhZ3bYsA
```

> **IMPORTANTE DE SEGURIDAD**:  
> Nunca expongas en el frontend la clave `SUPABASE_SERVICE_ROLE_KEY` ni `DATABASE_URL`. El frontend únicamente utiliza la `ANON_KEY` pública y realiza las consultas a través del backend Express (`http://localhost:4000/api`).

---

## 2. Formato Estandarizado de Respuesta del Backend

Todas las respuestas del backend Express tienen la misma estructura envolvente (*envelope*):

### Respuesta Exitosa (`status: 200 / 201`)
```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-13T15:00:00.000Z",
    "request_id": "req_1773489200000_abc123",
    "total": 3
  },
  "error": null
}
```

### Respuesta de Error (`status: 400 / 401 / 403 / 404 / 409 / 500`)
```json
{
  "ok": false,
  "data": null,
  "meta": {
    "timestamp": "2026-11-13T15:00:00.000Z",
    "request_id": "req_1773489200000_abc123"
  },
  "error": {
    "code": "STALE_REVISION_CONFLICT",
    "message": "La propuesta se calculó sobre una versión previa y el plan ya cambió.",
    "details": { "current_revision": 2 }
  }
}
```

---

## 3. Cliente HTTP Listo para Usar (`api-client.js`)

Puedes copiar directamente esta implementación en [`frontend/src/shared/services/api-client.js`](file:///c:/Users/calva/taller-cli/sn/frontend/src/shared/services/api-client.js):

```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('sn_auth_token') || null;
    this.guestToken = localStorage.getItem('sn_guest_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('sn_auth_token', token);
    else localStorage.removeItem('sn_auth_token');
  }

  setGuestToken(token) {
    this.guestToken = token;
    if (token) localStorage.setItem('sn_guest_token', token);
    else localStorage.removeItem('sn_guest_token');
  }

  async request(endpoint, { method = 'GET', body = null, headers = {} } = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    };

    if (this.token) {
      defaultHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.guestToken) {
      defaultHeaders['x-guest-token'] = this.guestToken;
    }

    const config = {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(data?.error?.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.code = data?.error?.code || 'UNKNOWN_ERROR';
        error.details = data?.error?.details || null;
        throw error;
      }

      return data.data;
    } catch (err) {
      console.error(`[API Error] ${method} ${endpoint}:`, err);
      throw err;
    }
  }

  get(endpoint, options) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, body, options) {
    return this.request(endpoint, { method: 'POST', body, ...options });
  }

  put(endpoint, body, options) {
    return this.request(endpoint, { method: 'PUT', body, ...options });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

export const api = new ApiClient();
export default api;
```

---

## 4. Métodos de Autenticación en el Frontend

El backend soporta dos modalidades de usuario:

### A. Usuario Registrado / Supabase Auth
El usuario puede autenticarse vía Supabase Auth o vía el endpoint `/api/auth/login`. En ambos casos, el token JWT obtenido se envía en la cabecera:
```http
Authorization: Bearer <access_token>
```
El middleware [`supabase-auth-guard.js`](file:///c:/Users/calva/taller-cli/sn/backend/src/shared/middlewares/supabase-auth-guard.js) del backend valida automáticamente la sesión con Supabase Cloud.

### B. Modo Invitado (Sin Registro)
Para que cualquier persona pueda votar en un plan grupal sin tener que crear una cuenta:
1. Llamar a: `POST /api/auth/guest-session` con `{ "name": "Elena Rojas" }`.
2. Guardar el `guest_token` devuelto.
3. El cliente HTTP lo enviará automáticamente en la cabecera `x-guest-token`.

---

## 5. Catálogo de Endpoints Principales

### 5.1 Catálogo de Lugares y Eventos (Paginación + Filtros GPS)

#### `GET /api/places`
Recupera los locales y comercios verificados de Costa Rica desde `app_private.places`.
- **Query Params opcionales:**
  - `category`: ej. `cafe`, `feria`, `restaurante`, `parque`
  - `search`: búsqueda textual en nombre y dirección
  - `lat` y `lng`: coordenadas del usuario (ej. `9.9152, -84.2415`)
  - `radius_km`: radio de búsqueda en kilómetros (ej. `5.0`)
  - `page`: número de página (default: 1)
  - `limit`: elementos por página (default: 20)
- **Ejemplo en React:**
  ```javascript
  import { api } from '@/shared/services/api-client';

  async function loadPlaces(category = null) {
    const url = category ? `/places?category=${category}` : '/places';
    const places = await api.get(url);
    return places; // Array de lugares
  }
  ```

#### `GET /api/events`
Recupera los eventos programados y pop-up (ej. *Feria del Agricultor y Artesanos de Mora*).
- **Query Params:** `category`, `status` (`published`)
- Devuelve la lista de eventos con la información del lugar asociada.

---

### 5.2 Planes Grupales y Votación Colaborativa (`/api/social/*`)

#### Crear un Plan Grupal:
```javascript
// POST /api/social/plans
const newPlan = await api.post('/social/plans', {
  title: 'Tarde de Café y Feria en Ciudad Colón',
  description: 'Salida de sábado con amigos',
  organizer_id: 'usr_organizer_1',
  options: [
    { title: 'Opción A: Café El Roble + Feria', place_id: 'plc_cafe_1' },
    { title: 'Opción B: Café Montaña Verde', place_id: 'plc_cafe_2' }
  ]
});
console.log('Código del plan para compartir:', newPlan.share_code); // ej. PLAN-CR-772
```

#### Obtener Detalle del Plan:
```javascript
// GET /api/social/plans/:code
const plan = await api.get('/social/plans/PLAN-CR-772');
// Contiene: options, stops, votes, contingency_proposal (si hay lluvia o afectación)
```

#### Votar por una Opción (Idempotente):
```javascript
// PUT /api/social/plans/:code/votes/:optionId
await api.put('/social/plans/PLAN-CR-772/votes/opt_demo_1', {
  vote_type: 'prefer' // 'prefer' | 'can' | 'cannot'
});
```

#### Actualizaciones en Tiempo Real vía Server-Sent Events (SSE):
Para ver los votos de los amigos en vivo sin necesidad de recargar la página:
```javascript
function subscribeToPlan(shareCode, onUpdate) {
  const eventSource = new EventSource(`http://localhost:4000/api/social/plans/${shareCode}/stream`);

  eventSource.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    onUpdate(payload);
  };

  eventSource.onerror = (err) => {
    console.warn('SSE stream reconectando...', err);
  };

  return () => eventSource.close();
}
```

---

### 5.3 Copiloto DeepSeek AI (`/api/concierge/*`)

El backend expone el modelo **DeepSeek** para asistencia contextual y copiloto inteligente:

#### Chat Multi-Turn con Memoria de Sesión:
```javascript
// POST /api/concierge/chat
const aiResponse = await api.post('/concierge/chat', {
  session_id: 'ses_usuario_123',
  prompt: '¿Qué opciones pet-friendly y con rampa ley 7600 tenemos para ir a tomar café hoy en Ciudad Colón?'
});
console.log(aiResponse.message);
```

#### Generador de Itinerarios Multi-Día:
```javascript
// POST /api/concierge/multi-day-itinerary
const itinerary = await api.post('/concierge/multi-day-itinerary', {
  days: 2,
  budget: 'medio',
  interests: ['café de especialidad', 'ferias locales', 'naturaleza'],
  zone: 'Mora y Santa Ana'
});
console.log(itinerary.plan);
```

#### Clasificación de Intenciones por Voz/Texto (Modismo Tico):
```javascript
// POST /api/concierge/voice-intent
const intent = await api.post('/concierge/voice-intent', {
  voice_transcript: 'Mae, busquemos un chante tuanis pa tomarse un buen café con los compas'
});
// Devuelve: { intent: "search_places", category: "cafe", keywords: ["café", "amigos"] }
```

---

### 5.4 Utilidades Urbanas Costarricenses

#### Triangulación de Punto Medio (`Midpoint`):
Calcula el lugar geométrico óptimo para que varios amigos que viajan desde distintos puntos se encuentren a distancias equitativas:
```javascript
// POST /api/social/midpoint
const midpoint = await api.post('/social/midpoint', {
  coordinates: [
    { name: 'Daniel', lat: 9.9148, lng: -84.2421 },
    { name: 'Elena', lat: 9.9333, lng: -84.0833 }
  ]
});
// Devuelve: { center_lat, center_lng, recommended_zone: "Santa Ana / Escazú" }
```

#### División de Cuentas con IVA 13% y Servicio Oficial 10%:
```javascript
// POST /api/social/split-bill
const bill = await api.post('/social/split-bill', {
  subtotal: 25000,
  tax_included: false,
  tip_percent: 10,
  diners: 4
});
// Devuelve desglose oficial: { subtotal, iva_13, service_10, grand_total, per_person }
```

#### Generación de Enlace/Comando SMS SINPE Móvil:
```javascript
// POST /api/social/sinpe-sms
const smsData = await api.post('/social/sinpe-sms', {
  bank_code: 'bncr', // 'bncr', 'bac', 'bcr'
  phone_target: '88881111',
  amount: 6875,
  description: 'Pase feria y cafe'
});
// Devuelve: { sms_body: "PASE 6875 88881111 Pase feria y cafe", destination_number: "2627" }
```

---

### 5.5 Soporte Multilingüe e Internacionalización (10 Idiomas Oficiales)

El backend incorpora un motor nativo de i18n con soporte para **10 idiomas**:
- `es`: Español (Costa Rica - Predeterminado) 🇨🇷
- `en`: English 🇺🇸
- `fr`: Français 🇫🇷
- `de`: Deutsch 🇩🇪
- `pt`: Português 🇧🇷
- `it`: Italiano 🇮🇹
- `zh`: 中文 (Chino Mandarín) 🇨🇳
- `ja`: 日本語 (Japonés) 🇯🇵
- `ko`: 한국어 (Coreano) 🇰🇷
- `ru`: Русский (Ruso) 🇷🇺

#### Obtener Lista de Idiomas y Banderas:
```javascript
// GET /api/i18n/languages
const langs = await api.get('/i18n/languages');
console.log(langs.languages); // Array con códigos, nombres nativos y banderas
```

#### Descargar Diccionario Completo de Traducciones:
Permite alimentar librerías como `i18next` o el estado de React con cero duplicación:
```javascript
// GET /api/i18n/translations/:lang
const { dictionary } = await api.get('/i18n/translations/fr');
console.log(dictionary.system.healthy); // "Système sain et opérationnel"
console.log(dictionary.concierge.greeting); // Saludo en francés para turistas
```

#### Cambiar el Idioma Activo en el Cliente:
```javascript
api.setLanguage('ja'); // Ahora todas las peticiones viajarán con la cabecera x-language: ja
```

---

## 6. Nuevas Funcionalidades Enterprise Listas para el Frontend

### 6.1. Búsqueda Semántica Inteligente (`GET /api/places/smart-search`)
Permite búsquedas con lenguaje natural en español e inglés impulsadas por DeepSeek AI (ej: *"dónde tomar café de especialidad con buena vista"* o *"lugares pet-friendly con parqueo"*):
```javascript
// GET /api/places/smart-search?q=cafe+con+buen+wifi
const results = await api.get('/places/smart-search?q=cafe+con+buen+wifi');
// results -> array de lugares con score de relevancia y razonamiento de IA
```

### 6.2. Exportación a Mapas GeoJSON RFC 7946 (`GET /api/places/export/geojson`)
Directamente compatible con Leaflet, Mapbox, Google Maps o MapLibre:
```javascript
// GET /api/places/export/geojson?category=cafeteria
const geojson = await api.get('/places/export/geojson?category=cafeteria');
// geojson -> { type: "FeatureCollection", features: [ ... ] }
map.addSource('places', { type: 'geojson', data: geojson });
```

### 6.3. Exportación a Calendarios iCalendar RFC 5545 (`GET /api/events/export/ics`)
Descarga directa para agregar a Google Calendar, Apple Calendar o Outlook:
```javascript
// Abrir directamente en el navegador o botón de descarga:
window.open('http://localhost:4000/api/events/export/ics');
// O para un evento específico:
window.open('http://localhost:4000/api/events/evt_feria_sabado_1/export/ics');
```

### 6.4. Escaneo Inteligente de Facturas y Tickets SINPE con DeepSeek AI (`POST /api/social/scan-invoice`)
Analiza texto o imagen de comprobantes para extraer montos, IVA 13%, desglose y datos SINPE Móvil:
```javascript
const scanResult = await api.post('/social/scan-invoice', {
  raw_text: 'Restaurante El Cafetal\n1x Cafe Chorreado 2500\n1x Gallo Pinto 3500\nIVA: 780\nTotal: 6780',
  // o image_base64: 'data:image/jpeg;base64,...'
});
console.log(scanResult.total); // 6780
console.log(scanResult.split_suggestions); // sugerencias de división
```

### 6.5. Búsqueda y Coincidencia de Mascotas Extraviadas con IA (`POST /api/rescue/match-pet`)
Compara reportes de mascotas perdidas/encontradas usando morfología, raza, color y proximidad geográfica en km:
```javascript
const matches = await api.post('/rescue/match-pet', {
  species: 'perro',
  breed: 'Zaguate / Criollo',
  colors: ['cafe', 'blanco'],
  latitude: 9.9322,
  longitude: -84.0795
});
// matches -> array ordenado por match_percentage (%) con distancia en km
```

### 6.6. Telemetría y Diagnóstico Profundo en Tiempo Real (`GET /api/health/deep`)
Mide la latencia en milisegundos de PostgreSQL, Supabase Cloud y el motor DeepSeek AI en paralelo:
```javascript
const health = await api.get('/health/deep');
console.log(health.checks.database.latency_ms); // ej: 14ms
console.log(health.checks.deepseek_ai.latency_ms); // ej: 45ms
```

### 6.7. Códigos QR Criptográficos Firmados y Canje Único (`/api/security/qr/*`)
Genera y canjea vales de descuento, check-in en eventos o placas inteligentes de mascotas con firma `HMAC-SHA256`:
```javascript
// 1. Generar código QR con expiración y preview SVG
const qr = await api.post('/security/qr/generate', {
  type: 'merchant_voucher',
  ref_id: 'plc_cafe_1',
  ttl_seconds: 7200,
  metadata: { discount_percent: 15, item: 'Café Chorreado' }
});
// qr.token -> token criptográfico firmado
// qr.svg_preview -> string SVG listo para inyectar directo en un <div>

// 2. Canjear QR en caja (idempotente: rechaza con 400 si ya fue canjeado)
const redeem = await api.post('/security/qr/redeem', {
  token: qr.token,
  redeemed_by: 'cajero_1'
});
console.log(redeem.redeemed); // true
```

### 6.8. Notificaciones Web Push y Mensajería Multicanal (`/api/notifications/*`)
Soporte para notificaciones nativas en el navegador vía estándar RFC 8292 VAPID:
```javascript
// 1. Obtener clave pública VAPID
const { public_key } = await api.get('/notifications/vapid-public-key');

// 2. Registrar la suscripción del navegador
const pushSub = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: public_key
});
await api.post('/notifications/subscribe', {
  endpoint: pushSub.endpoint,
  keys: {
    p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(pushSub.getKey('p256dh')))),
    auth: btoa(String.fromCharCode.apply(null, new Uint8Array(pushSub.getKey('auth'))))
  }
});
```

### 6.9. Calculador de Movilidad Sostenible y Huella de Carbono (`/api/mobility/*`)
Calcula en tiempo real el ahorro de emisiones de $\text{CO}_2$ y colones según factores oficiales MINAE/IMN de Costa Rica:
```javascript
// POST /api/mobility/carbon-footprint
const eco = await api.post('/mobility/carbon-footprint', {
  origin_lat: 9.9322,
  origin_lng: -84.0795,
  dest_lat: 9.9148,
  dest_lng: -84.2421,
  transport_mode: 'carpool', // 'carpool', 'bus', 'train', 'bike', 'walk'
  passengers_count: 3,
  user_id: 'usr_actual'
});
console.log(eco.co2_saved_kg); // ej: 1.85 kg de CO2 evitados
console.log(eco.colones_saved); // ej: ₡1,200 CRC ahorrados en gasolina
console.log(eco.eco_summary); // Resumen legible listo para mostrar en la interfaz

// Obtener medallas ecológicas del usuario
const { badges } = await api.get('/mobility/badges/usr_actual');
// badges -> [{ code: 'tico_verde', name: 'Tico Verde 🌱' }, ...]
```

### 6.10. Auditoría Inmutable Criptográfica (Hash Chain Ledger) (`/api/audit/*`)
Verifica matemáticamente que la bitácora de auditoría no ha sufrido adulteraciones:
```javascript
// GET /api/audit/verify-chain
const audit = await api.get('/audit/verify-chain');
console.log(audit.valid); // true
console.log(audit.total_blocks); // N bloques encadenados por SHA-256
```

### 6.11. Webhooks Salientes para Comercios Aliados (`/api/merchants/webhooks/*`)
Permite a negocios locales registrar URLs de callback para enterarse al momento cuando un grupo vota o confirma visita a su local:
```javascript
// Registrar webhook para una cafetería
const webhook = await api.post('/merchants/webhooks/subscriptions', {
  merchant_id: 'plc_cafe_1',
  target_url: 'https://mi-cafeteria.cr/api/webhook',
  events: ['plan.confirmed', 'voucher.redeemed']
});
console.log(webhook.secret); // Secreto para validar firma HMAC-SHA256 en cabecera X-Sinergia-Signature
```

### 6.12. Motor Financiero BCCR, Multi-divisa y Redondeo en Efectivo (`/api/finance/*`)
Consulta tasas del Banco Central en vivo, convierte monedas y aplica la regla de redondeo oficial de efectivo del BCCR:
```javascript
// 1. Tipos de cambio BCCR oficiales
const { usd_to_crc_compra, usd_to_crc_venta } = await api.get('/finance/exchange-rates');

// 2. Conversión entre divisas en vivo (CRC, USD, EUR, GBP)
const conv = await api.post('/finance/convert', { amount: 15000, from: 'CRC', to: 'USD' });
console.log(conv.converted_amount); // ej: 29.17 USD

// 3. Redondeo en efectivo BCCR (monedas de ₡1 y ₡2 retiradas)
const cash = await api.post('/finance/cash-rounding', { amount_crc: 2453 });
console.log(cash.cash_rounded_crc); // 2455 CRC (redondeado hacia arriba a 5)

// 4. División de cuenta tica con 13% IVA y 10% ley de servicio
const bill = await api.post('/finance/split-bill-cr', {
  subtotal_crc: 12000,
  people_count: 3
});
console.log(bill.per_person.amount_crc_card); // Monto exacto por persona en tarjeta
console.log(bill.per_person.amount_crc_cash); // Monto redondeado por persona en efectivo
console.log(bill.total_usd); // Total equivalente en USD para turistas
```

### 6.13. Índice de Confort Urbano y "Alerta de Aguacero Tico" (`/api/weather/comfort-index`)
Mide las condiciones para salir al aire libre y detecta aguaceros de la tarde típicos del Valle Central:
```javascript
// GET /api/weather/comfort-index?lat=9.9333&lng=-84.0833
const comfort = await api.get('/weather/comfort-index?lat=9.9333&lng=-84.0833');
console.log(comfort.outdoor_comfort_score); // Puntaje 0 a 100
console.log(comfort.aguacero_alert.detected); // true si hay aguacero inminente
console.log(comfort.recommendation); // Recomendación de local techado o al aire libre
```

### 6.14. Calidad del Aire Satelital en el GAM (`/api/weather/air-quality`)
Mide polvo, partículas PM2.5 y ozono en tiempo real para deportistas, corredores y mascotas:
```javascript
// GET /api/weather/air-quality?lat=9.9333&lng=-84.0833
const aqi = await api.get('/weather/air-quality?lat=9.9333&lng=-84.0833');
console.log(aqi.category); // "Buena" o "Moderada"
console.log(aqi.safe_for_exercise); // true
```

### 6.15. Geocodificación Territorial Inversa de Costa Rica (`/api/places/reverse-geocode`)
Convierte coordenadas GPS en provincia, cantón, distrito y código postal costarricense:
```javascript
// GET /api/places/reverse-geocode?lat=9.9148&lng=-84.2421
const geo = await api.get('/places/reverse-geocode?lat=9.9148&lng=-84.2421');
console.log(geo.territorial_division.canton); // "Mora"
console.log(geo.formatted_tico_address); // "Vía Principal, Colón, Mora, San José, Costa Rica"
```

### 6.16. Enlaces Directos para Waze, Google Maps y Apple Maps (`/api/places/navigation-links`)
Genera enlaces nativos y códigos QR para que el usuario o una grúa abra la ruta con un toque:
```javascript
// GET /api/places/navigation-links?lat=9.9148&lng=-84.2421&label=Feria+Mora
const nav = await api.get('/places/navigation-links?lat=9.9148&lng=-84.2421&label=Feria+Mora');
// nav.links.waze_app -> abre la app nativa de Waze
// nav.links.google_maps -> abre Google Maps con la ruta trazada
```

### 6.17. Verificación de Cédula y Comercios ante Hacienda (`/api/businesses/verify-id/:id`)
Valida cédulas físicas (9 dígitos) o jurídicas (10 dígitos) y devuelve la razón social oficial registrada en Costa Rica:
```javascript
// GET /api/businesses/verify-id/3101123456
const tax = await api.get('/businesses/verify-id/3101123456');
console.log(tax.legal_name); // Razón social oficial del comercio
console.log(tax.classification.label); // "Cédula Jurídica (Empresa o Comercio)"
```

### 6.18. Feriados Oficiales y Suspensión de Restricción Vehicular (`/api/calendar/holidays/*`)
Verifica feriados nacionales de Costa Rica y si la restricción de San José está suspendida:
```javascript
// GET /api/calendar/holidays/status
const calendarStatus = await api.get('/calendar/holidays/status');
console.log(calendarStatus.vehicular_restriction_suspended); // true en feriados o fines de semana
console.log(calendarStatus.restriction_status_note); // Razón legal de la suspensión
console.log(calendarStatus.next_holiday); // Próximo feriado patrio
```

### 6.19. Monitor Sísmico y Tectónico en Tiempo Real (`/api/rescue/seismic-monitor`)
Monitorea sismos recientes en el territorio costarricense y analiza el impacto en el GAM:
```javascript
// GET /api/rescue/seismic-monitor
const seismic = await api.get('/rescue/seismic-monitor');
console.log(seismic.emergency_alert_active); // true si hubo sismo >= 4.5
console.log(seismic.latest_events); // Array de últimos eventos con magnitud y distancia al GAM
```

### 6.20. Optimizador de Rutas Multi-Parada para Salidas Grupales (`/api/social/plans/optimize-route`)
Calcula el orden óptimo de paradas para ahorrar tiempo, kilometraje y gasolina en presas:
```javascript
// POST /api/social/plans/optimize-route
const route = await api.post('/social/plans/optimize-route', {
  stops: [
    { id: 'p1', name: 'Desayuno en Mora', lat: 9.9148, lng: -84.2421 },
    { id: 'p2', name: 'Mirador Salitral', lat: 9.9450, lng: -84.2150 },
    { id: 'p3', name: 'Café La Colina', lat: 9.9200, lng: -84.2350 }
  ]
});
console.log(route.distance_saved_km); // Kilómetros ahorrados
console.log(route.estimated_minutes_saved); // Minutos ahorrados en presas
console.log(route.optimized_stops); // Paradas reordenadas eficientemente
```

### 6.21. Enlaces Rápidos y QR para Pagos SINPE Móvil (`/api/finance/sinpe-deep-link`)
Genera comandos nativos para abrir la app de SMS con el formato de cada banco de Costa Rica:
```javascript
// POST /api/finance/sinpe-deep-link
const sinpe = await api.post('/finance/sinpe-deep-link', {
  amount_crc: 5000,
  recipient_phone: '88887766',
  description: 'Almuerzo'
});
// sinpe.banks.bac.one_click_sms_uri -> sms:2026?body=PASE%205000%2088887766%20Almuerzo
// sinpe.qr_code_url -> URL del QR listo para pagar
```

### 6.22. Tarjetas de Metadatos Sociales Open Graph (`/api/social/share-card/:type/:id`)
Metadatos dinámicos listos para previsualización al compartir en WhatsApp, Facebook o Twitter:
```javascript
// GET /api/social/share-card/plan/pln_demo
const share = await api.get('/social/share-card/plan/pln_demo');
console.log(share.open_graph['og:title']); // Título formateado con código de invitación
console.log(share.html_meta_tags); // <meta property="og:title" ... />
```

---

### 6.23. Módulo «Videos para Cuidar a tu Mascota» y «Pregúntale al Video» (`/api/pet-videos`)

Este módulo permite a los usuarios consultar videos educativos de YouTube validados por veterinarios y administradores, con fragmentos interactivos y preguntas contextuales resueltas con marcas de tiempo para saltar directo al punto exacto del reproductor.

#### 6.23.1. Listar Videos Aprobados (Catálogo Público)
```javascript
// Filtros disponibles: species (perros, gatos, aves, etc.), topic (higiene, alimentacion, primeros_auxilios, etc.), search
const response = await api.get('/pet-videos?species=perros&topic=higiene&page=1&limit=10');
console.log(response.data); // Array de videos aprobados con sus fragmentos verificados
console.log(response.meta.total); // Total de videos disponibles
```

#### 6.23.2. Ficha de Video y Fragmentos
```javascript
const { data: video } = await api.get(`/pet-videos/${videoId}`);
console.log(video.youtube_id); // ID canónico para incrustar iframe (ej: https://www.youtube.com/embed/...)
console.log(video.fragments);  // Lista de hasta 3 fragmentos con start_seconds y end_seconds
```

#### 6.23.3. «Pregúntale al Video» (Búsqueda Contextual en Fragmentos)
La consulta pública **no** invoca modelos generativos en vivo ni consume cuotas; consulta la base de fragmentos verificados por administradores.
```javascript
const res = await api.post(`/pet-videos/${videoId}/questions`, {
  question: '¿A qué temperatura debe estar el agua para bañarlo?'
});

// Estructura de res.data:
// {
//   found: true,
//   match_source: 'current_video', // o 'other_video' si se halló en otro video aprobado
//   matched_video: { id, title, channel_title, youtube_id },
//   fragment: {
//     question: '¿A qué temperatura debe estar el agua para el baño?',
//     answer: 'Usa agua tibia entre 36 y 37 °C para evitar choques térmicos.',
//     start_seconds: 15,
//     end_seconds: 40
//   },
//   start_seconds: 15,
//   video_deep_link: 'https://www.youtube.com/watch?v=MOCK_VET_001&t=15s',
//   clinical_alert: null
// }

// Salto en el reproductor de YouTube (ej. con YouTube Iframe API):
if (res.data.found && res.data.start_seconds !== null) {
  player.seekTo(res.data.start_seconds, true);
}

// Detección de Síntomas o Emergencia Veterinaria:
// Si la pregunta involucra vómito, diarrea con sangre, envenenamiento o convulsiones,
// res.data.clinical_alert incluirá advertencia y accesos directos al directorio veterinario:
if (res.data.clinical_alert) {
  console.warn(res.data.clinical_alert.warning);
  // Redirigir a directorio: res.data.clinical_alert.directory_url (/api/places?category=veterinaria)
  // o emergencia SOS: res.data.clinical_alert.emergency_sos_url (/api/vet/sos-24h)
}

// Si no hay fragmento coincidente:
if (!res.data.found) {
  // res.data.message === "Todavía no tenemos un fragmento que responda esa pregunta."
}
```

#### 6.23.4. Reportar Enlace Roto
```javascript
await api.post(`/pet-videos/${videoId}/report-broken`, {
  reason: 'El video ya no está disponible en YouTube o es privado.'
});
```

#### 6.23.5. Flujo de Administración (`/api/admin/pet-videos`)
*Requiere cabecera de autenticación de admin (`x-admin-role: superadmin` o JWT válido).*
```javascript
// 1. Buscar en YouTube Data API (con soporte de mock automático si no hay API key)
const search = await api.get('/admin/pet-videos/search-youtube?q=cuidado dental en perros');

// 2. Registrar video pegando URL HTTPS de YouTube (convierte a ID canónico de 11 caracteres)
const reg = await api.post('/admin/pet-videos/register', {
  youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  species: 'perros',
  topic: 'higiene'
}); // Retorna ficha en estado 'draft'

// 3. Analizar video con Gemini Multimodal (extrae especie, tema, resumen y hasta 3 fragmentos)
// Reutiliza análisis previos si ya fue analizado para ahorrar cuota
const analysis = await api.post(`/admin/pet-videos/${reg.data.id}/analyze`);

// 4. Corregir y ajustar fragmentos o tiempos antes de aprobar
await api.put(`/admin/pet-videos/${reg.data.id}`, {
  title: 'Título corregido por veterinario',
  fragments: [
    { question: '¿Cómo cepillar?', answer: 'Usar pasta canina...', start_seconds: 10, end_seconds: 45 }
  ]
});

// 5. Aprobar video para el catálogo público
await api.post(`/admin/pet-videos/${reg.data.id}/approve`);

// 6. Retirar video si se vuelve obsoleto
await api.post(`/admin/pet-videos/${reg.data.id}/retire`, {
  reason: 'Contenido desactualizado'
});
```

#### 6.23.6. Estado de Pruebas y Verificación
- **Pruebas Automatizadas Pasadas (14/14 específicas, 82/82 globales)**:
  - Validación estricta HTTPS y rechazo de enlaces que no sean de YouTube (`http://`, Vimeo, dominios externos).
  - Deduplicación por ID canónico de 11 caracteres.
  - Validación de marcas de tiempo contra la duración real del video.
  - Ocultamiento de borradores en catálogo público (retornan 404).
  - Búsqueda en video actual y fallback en otros videos aprobados.
  - Mensaje estándar ante preguntas sin fragmento compatible.
  - Retiro de catálogo y reporte de enlaces rotos.
  - Detección de síntomas clínicos con advertencia veterinaria y enlaces a SOS.
- **Pendiente para Entorno con APIs Reales**:
  - Configurar `YOUTUBE_API_KEY` en `backend/.env` para búsquedas en vivo contra la cuota oficial de YouTube Data API v3 (el sistema conmuta transparentemente a catálogo simulado si falta la clave o se agota la cuota).
  - Configurar `GEMINI_API_KEY` para procesamiento multimodal directo de videos de YouTube (el sistema cuenta con analizador heurístico de respaldo para desarrollo local).

---

## 7. Manejo de Errores y Códigos de Estado

| Código | Significado | Qué debe hacer el Frontend |
|---|---|---|
| **200 OK** | Petición exitosa | Renderizar `data` |
| **201 Created** | Recurso creado exitosamente | Redirigir o agregar al estado local |
| **400 Bad Request** | Parámetros inválidos o faltantes | Mostrar mensaje de validación del backend |
| **401 Unauthorized** | Token ausente o expirado | Limpiar token y redirigir al Login o invitar a usar Guest Mode |
| **403 Forbidden** | Sin permisos suficientes | Mostrar alerta de acceso denegado |
| **404 Not Found** | Recurso no encontrado | Mostrar vista de recurso no disponible |
| **409 Conflict** | Conflicto de versión / Concurrencia optimista | El plan fue modificado por otro organizador. Recargar datos del plan con `GET /api/social/plans/:code` |
| **500 Internal Error** | Error del servidor | Mostrar mensaje de error con el `request_id` para trazabilidad |

---

## 8. Verificación de Funcionamiento Rápida

Para comprobar que todo está listo antes de programar componentes en el frontend:
1. Abre tu navegador en `http://localhost:4000/api/health/supabase`.
2. Deberías ver:
   ```json
   {
     "ok": true,
     "data": {
       "configured": true,
       "status": "connected",
       "provider": "Supabase Cloud"
     }
   }
   ```
3. Abre `http://localhost:4000/api/places` y confirma que recibes los 3 lugares de Costa Rica cargados desde Supabase PostgreSQL.

