# 07 — Matriz de Permisos Basada en Roles (RBAC)

Este documento describe el modelo real de **Control de Acceso Basado en Roles (RBAC)** implementado en **Synodos / GoToX Pet OS**, tanto en el servidor Express como en las guardas de navegación de React y en el esquema SQL relacional (`roles` y `user_roles`).

---

## 1. Definición de Roles del Sistema

Fuentes:
- Base de datos (3FN): [`backend/db/migrations/012-roles-governance-and-password-reset.sql`](../../backend/db/migrations/012-roles-governance-and-password-reset.sql)
- Guardas JWT/RBAC: [`backend/src/shared/middlewares/auth-role-guard.js`](../../backend/src/shared/middlewares/auth-role-guard.js)

| ID en BD (`roles.id`) | Rol (`role`) | Descripción | Origen / Asignación |
| :--- | :--- | :--- | :--- |
| `role_guest` | `guest` | Visitante temporal con acceso limitado (votos / consultas públicas) | Sesión anónima o `POST /api/auth/guest-session` (`x-guest-token`) |
| `role_client` | `client` | Tutor o usuario registrado estándar | Rol por defecto en registro público (`POST /api/auth/register`) |
| `role_business_owner` | `business_owner` | Propietario de establecimiento pet-friendly | Permitido en registro público (`role === 'business_owner'`) |
| `role_merchant` | `merchant` | Comercio aliado verificado | Asignado/actualizado por administrador (`PATCH /api/admin/users/:id/role`) |
| `role_organizer` | `organizer` | Organizador de eventos y salidas grupales | Semilla o asignación administrativa |
| `role_admin` | `admin` | Administrador general exclusivo del sistema | Bootstrap / semillas internas (`admin@gotox.cr`, `admin@ejemplo.cr`) o `PATCH /api/admin/users/:id/role`. **Nunca** asignable desde registro público |

---

## 2. Matriz de Permisos Granulares (`PERMISSIONS` y `ROLE_PERMISSIONS`)

Definida en [`auth-role-guard.js`](../../backend/src/shared/middlewares/auth-role-guard.js#L5-L23) y verificada por el middleware `requirePermission(permiso)`:

| Permiso (`PERMISSIONS`) | Descripción funcional | `guest` | `client` | `business_owner` | `merchant` | `organizer` | `admin` |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `plans:vote` | Votar en opciones de planes grupales | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `plans:create` | Crear planes e itinerarios | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `plans:confirm` | Confirmar plan con snapshot inmutable | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `events:publish` | Publicar eventos oficiales en la red | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `events:cancel` | Cancelar o modificar eventos activos | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `places:verify` | Auditar y certificar comercios / políticas pet | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `admin:telemetry` | Consultar telemetría profunda y métricas del sistema | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `admin:agents` | Ejecutar jobs administrativos y revisar bitácoras IA | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Matriz de Rutas y Módulos (Frontend + Backend API)

### 3.1 Pantallas del Frontend React

Fuentes: [`AnimatedRoutes.jsx`](../../frontend/src/components/AnimatedRoutes.jsx), [`RutaPrivada.jsx`](../../frontend/src/components/RutaPrivada.jsx), [`RutaAdmin.jsx`](../../frontend/src/components/RutaAdmin.jsx)

| Módulo / Ruta Frontend | Guarda / Middleware | `guest` / Anónimo | `client` / `business_owner` / `merchant` / `organizer` | `admin` |
| :--- | :--- | :---: | :---: | :---: |
| `/`, `/mapa`, `/terrazas`, `/copiloto`, `/nosotros`, `/terminos`, `/acceso` | Pública | ✅ | ✅ | ✅ |
| `/usuario` (`?tab=cuenta\|explorar\|planes\|favoritos\|mascota`) | `<RutaPrivada>` | ❌ (redirige a `/acceso`) | ✅ | ✅ |
| `/explorar`, `/mis-planes`, `/favoritos`, `/mi-mascota`, `/perfil` | `<RutaPrivada>` (redirige a `/usuario?tab=...`) | ❌ (redirige a `/acceso`) | ✅ | ✅ |
| `/panel` (Telemetría, Locales, Moderación Fotos, Usuarios, SOS, Auditoría, Flota, Ajustes) | `<RutaAdmin>` + verificación servidor `GET /api/auth/me` | ❌ (solicita login admin) | ❌ (acceso denegado) | ✅ |

### 3.2 Endpoints del Backend Express

Fuentes: [`api-router.js`](../../backend/src/shared/routing/api-router.js), [`admin-routes.js`](../../backend/src/modules/admin-control/admin-routes.js), [`auth-routes.js`](../../backend/src/modules/auth/auth-routes.js), [`client-routes.js`](../../backend/src/modules/client-dashboard/client-routes.js), [`pet-care-videos-admin-routes.js`](../../backend/src/modules/vet-hub/pet-care-videos/pet-care-videos-admin-routes.js)

| Recurso / Endpoint API | Middleware aplicado | `guest` / Anónimo | `client` / `business_owner` / `merchant` / `organizer` | `admin` |
| :--- | :--- | :---: | :---: | :---: |
| Catálogo público, mapa, clima, i18n, accesibilidad, videos aprobados, SOS | Sin bloqueo de rol | ✅ | ✅ | ✅ |
| `POST /api/auth/login`, `/register`, `/forgot-password`, `/reset-password`, `/guest-session`, `GET /me` | Rate limiter (`authLimiter`, `loginEmailLimiter`) | ✅ | ✅ | ✅ |
| `GET /api/client/overview`, rutas `/api/social/plans*` | `authenticateOptional` | ✅ (limitado) | ✅ | ✅ |
| `GET / POST /api/client/vault` (Bóveda personal y perfil de mascota) | `requireAuth` | ❌ (`401`) | ✅ | ✅ |
| `POST /api/auth/delete-account` y `DELETE /api/client/account` (Ley N.º 8968 CR) | `requireAuth` + confirmación de contraseña | ❌ (`401`) | ✅ | ✅ |
| `GET/POST/PUT/PATCH/DELETE /api/admin/*` (usuarios, roles, lugares, políticas pet, eventos, auditoría, telemetría) | `requireAdmin` (`requireRole(['admin'])`) | ❌ (`401`) | ❌ (`403`) | ✅ |
| `/api/admin/pet-videos/*` (buscar YouTube, registrar, analizar, editar, aprobar, retirar) | `requireAdmin` | ❌ (`401`) | ❌ (`403`) | ✅ |
| `/api/admin/places/photos/*` y `/api/admin/places/multisource/*` (moderación y reconciliación en Storage) | `requireAdmin` | ❌ (`401`) | ❌ (`403`) | ✅ |
| `/api/audit/*`, `/api/notifications/*`, `/api/merchants/webhooks/*`, `/api/cache/stats`, `/api/health/deep`, `/api/health/system` | `requireAdmin` (`metrics`: `requireAdminInProd`) | ❌ (`401`) | ❌ (`403`) | ✅ |

---

## 4. Matriz de Permisos para los 8 Agentes de IA

Endpoint de ejecución: `POST /api/agents/:agentName/run` (protegido por `requireAuth`, `aiLimiter` y validación de `authorized_roles` en [`ai-agents-hub-service.js`](../../backend/src/services/ai-agents-hub-service.js)).
- Listado público: `GET /api/agents` (todos).
- Bitácora de auditoría IA (`ai_interaction_logs`): `GET /api/agents/logs` (solo **`admin`** mediante `requireAdmin`).

| Agente (`agent_name`) | Propósito | `guest` | `client` | `business_owner` | `merchant` | `organizer` | `admin` |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `bruno-concierge` | Concierge Pet-OS y rutas GAM | ❌ (`401`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `propose-alternative` | Plan B bajo techo / menor ruido | ❌ (`401`) | ✅ | ❌ (`403`) | ❌ (`403`) | ✅ | ✅ |
| `lost-pet-matcher` | Coincidencia de mascotas SOS | ❌ (`401`) | ✅ | ❌ (`403`) | ❌ (`403`) | ✅ | ✅ |
| `invoice-extractor` | Extractor de facturas / SINPE | ❌ (`401`) | ✅ | ❌ (`403`) | ✅ | ✅ | ✅ |
| `video-analyzer` | Análisis veterinario de videos YouTube | ❌ (`401`) | ❌ (`403`) | ❌ (`403`) | ❌ (`403`) | ❌ (`403`) | ✅ |
| `auto-tagger` | Clasificador semántico de comercios | ❌ (`401`) | ❌ (`403`) | ❌ (`403`) | ❌ (`403`) | ❌ (`403`) | ✅ |
| `daily-briefing` | Editor de boletín diario clima/calzada | ❌ (`401`) | ❌ (`403`) | ❌ (`403`) | ❌ (`403`) | ❌ (`403`) | ✅ |
| `report-consensus` | Moderación por consenso ciudadano | ❌ (`401`) | ❌ (`403`) | ❌ (`403`) | ❌ (`403`) | ❌ (`403`) | ✅ |

---

## 5. Reglas de Seguridad Transversales

1. **Separación de tokens:** `authenticateOptional` y `requireAuth` rechazan cualquier `refresh_token` (`decoded.is_refresh`) como credencial de acceso.
2. **Prevención de escalación de privilegios:** `authService.register()` fuerza `safeRole = role === 'business_owner' ? 'business_owner' : 'client'`; un registro público nunca puede obtener el rol `admin`.
3. **Doble defensa:** El frontend restringe vistas mediante `<RutaPrivada>` y `<RutaAdmin>`, mientras que el backend valida obligatoriamente JWT + rol/permiso en el servidor antes de ejecutar lógica o consultar datos privados.
