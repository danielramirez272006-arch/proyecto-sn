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

## 6. Manejo de Errores y Códigos de Estado

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

## 7. Verificación de Funcionamiento Rápida

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
