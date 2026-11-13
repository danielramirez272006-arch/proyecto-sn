# Sinergia Urbana Costa Rica — Frontend

Aplicación cliente web desarrollada con **React** y **Vite**, diseñada con accesibilidad nativa (Ley 7600), diseño responsive móvil-primero y soporte sin conexión para el ecosistema urbano costarricense.

---

## 🚀 Puesta en Marcha

### 1. Variables de Entorno
Crea tu archivo `.env` copiando la plantilla:
```bash
cp .env.example .env
```

Las variables por defecto ya apuntan al backend local (`http://localhost:4000/api`) y al proyecto **Supabase** en la nube (`https://hnnnreowlbtqqjhpmdvd.supabase.co`).

### 2. Instalar Dependencias y Arrancar
```bash
# Instalar paquetes
npm install

# Iniciar servidor de desarrollo en http://localhost:5173
npm run dev
```

---

## 📂 Estructura del Código

```text
frontend/src/
├── features/               # Módulos por dominio de negocio
│   ├── auth/               # Inicio de sesión, registro y perfil
│   ├── businesses/         # Gestión de comercios y reclamos
│   ├── client-dashboard/   # Panel de usuario, ahorro y badges
│   ├── events/             # Explorador de eventos y ferias
│   ├── food-radar/         # Radar de comida callejera y sodas
│   ├── live-map/           # Mapa interactivo y capas viales
│   ├── places/             # Catálogo de lugares (cafés, parques, ferias)
│   ├── social-dining/      # Planes grupales, votación y split-bill
│   ├── urban-rescue/       # Reportes de baches, semáforos y SOS
│   ├── vet-hub/            # Directorio veterinario y urgencias
│   ├── voice-ai/           # Copiloto de voz con DeepSeek AI
│   └── weather-activities/ # Planes según clima y lluvia en Costa Rica
├── pages/                  # Vistas y rutas de la aplicación
│   ├── admin/              # Panel de control administrativo
│   ├── client/             # Vistas de cliente registrado
│   └── public/             # Vistas públicas accesibles sin cuenta
└── shared/                 # Código transversal reutilizable
    ├── components/         # Layouts, modales, barras, dock accesible
    ├── context/            # Contextos de React (Auth, A11y, Voz, Synergy)
    ├── hooks/              # Custom hooks (geolocalización, audio, sensores)
    ├── routing/            # Enrutador principal (AppRouter, PrivateRoute)
    └── services/           # Cliente HTTP (api-client.js) y sincronización
```

---

## 🔗 Consumo del Backend y Supabase

El cliente HTTP estandarizado se encuentra en:
```javascript
import { api } from '@/shared/services/api-client';

// Ejemplo: obtener lugares de Costa Rica cargados en Supabase
const places = await api.get('/places');

// Ejemplo: consultar al Copiloto DeepSeek
const reply = await api.post('/concierge/chat', {
  session_id: 'user_session',
  prompt: '¿Dónde hay feria del agricultor este sábado?'
});
```

Para una referencia completa de todos los endpoints, modelos de datos, manejo de errores y sockets de tiempo real, consulta la:
👉 **[Guía de Integración para el Frontend (docs/frontend-integration-guide.md)](../docs/frontend-integration-guide.md)**.
