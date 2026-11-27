# Synodos Pet OS — Documentación Técnica del Backend (`sn-backend`)

Servidor API RESTful en **Node.js (>=20) + Express** para **Synodos Pet OS (Costa Rica)**. Gestiona el catálogo verificado de **681 restaurantes y 1,500 fotografías reales** en **Supabase**, el **Motor RAG Híbrido** del Copiloto **Argos**, la detección y revisión automática de políticas pet-friendly (**Supabase Cron + Edge Function**), el correo transaccional vía **Brevo REST API v3**, el pre-triaje visual con **Google Gemini 3.1** y los **8 Agentes de IA** auditados.

---

## Manuales de Arquitectura (`docs/backend/`)

1. **[01 — Arquitectura Multi-Fuente y Compatibilidad Pet-Friendly](../docs/backend/01-arquitectura-multifuente-y-compatibilidad-pet.md)**
2. **[02 — Pipeline de Fotografías Verificadas y Supabase Storage](../docs/backend/02-pipeline-fotografias-supabase-storage.md)**
3. **[03 — Verificación Administrativa Pet-Friendly y Automatización](../docs/backend/03-verificacion-administrativa-y-automatizacion-n8n.md)**
4. **[04 — Migraciones SQL, Base de Datos Dual y Pruebas](../docs/backend/04-migraciones-esquema-db-y-pruebas.md)**
5. **[05 — Diagrama ER y Diccionario de Datos](../docs/backend/05-diagrama-er-y-diccionario-datos.md)**
6. **[06 — Catálogo de los 8 Agentes de IA](../docs/backend/06-catalogo-8-agentes-ia.md)**
7. **[07 — Matriz de Permisos RBAC](../docs/backend/07-matriz-permisos-rbac.md)**

---

## Comandos Principales (`backend/package.json`)

| Comando | Descripción |
| :--- | :--- |
| `npm --prefix backend run dev` | Inicia el servidor Express con recarga automática (`http://localhost:4000`). |
| `npm --prefix backend start` | Inicia el servidor en modo producción (usado por `render.yaml`). |
| `npm --prefix backend test` | Ejecuta las **156 pruebas automatizadas** (`node --test test/**/*.test.js`). |
| `npm --prefix backend run db:supabase:check` | Verifica conexión en vivo a Supabase PostgreSQL (`app_private`) y Storage. |
| `npm --prefix backend run db:supabase:migrate` | Aplica el esquema base y políticas RLS desde `backend/supabase/schema/`. |
| `npm --prefix backend run db:supabase:seed` | Siembra datos iniciales desde `backend/supabase/schema/supabase-datos-demo.sql`. |
| `npm --prefix backend run photos:import` | CLI de importación de fotografías con limpieza EXIF y validación binaria. |
| `npm --prefix backend run photos:reconcile` | Reconcilia objetos en Supabase Storage contra `place_photos`. |
| `npm --prefix backend run security:supply-chain` | Ejecuta auditoría de integridad de dependencias y supply chain. |

---

## Organización de `backend/`

```text
backend/
├── .env.example                                         # Plantilla segura de variables de entorno para local y Render
├── db/migrations/                                       # Migraciones relacionales incrementales (SQLite / PostgreSQL)
├── src/
│   ├── app.js                                           # Express app (CORS multi-origen, CSP API/SPA, compresión, rate limit)
│   ├── server.js                                        # Arranque HTTP (0.0.0.0) y validación estricta de JWT_SECRET en prod
│   ├── autonomous-agents/                               # Agentes autónomos y reglas estrictas de AutoTaggerAI
│   ├── modules/
│   │   ├── auth/                                        # Registro, login (v2p$ pepper+bcrypt 12), Brevo reset/welcome, Ley 8968
│   │   ├── admin-control/                               # Políticas pet-friendly, detector de indicios y bandeja review-queue
│   │   ├── places/                                      # Catálogo DB-first con caché TTL/ETag, compatibilidad y pipeline de fotos
│   │   ├── rag/                                         # Motor RAG híbrido (rag_documents + locales reales + importador Drive)
│   │   ├── voice-ai-concierge/                          # Copiloto Argos enriquecido con RAG y telemetría GAM
│   │   └── vet-hub/                                     # Clínicas 24/7 y videos educativos con Gemini
│   └── shared/
│       ├── clients/                                     # Clientes con timeouts: email-client (Brevo v3), Google Places, OSM, etc.
│       ├── config/                                      # env-config, database (PG/SQLite), gemini-config, deepseek-config
│       └── security/                                    # Cabeceras HTTP, sanitizador Anti-SSRF/Prompt-Injection y reporte OWASP
├── supabase/
│   ├── functions/pet-policy-review-batch/index.ts       # Edge Function diaria invocada por Supabase Cron
│   ├── migrations/20261127_pet_policy_review_cron.sql   # Configuración de pg_cron, pg_net y RPCs exclusivas service_role
│   └── schema/                                          # Esquema MVP (app_private + RLS) y datos iniciales
└── test/                                                # 156 pruebas automatizadas (0 fallos)
```
