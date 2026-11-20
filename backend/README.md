# GoToX Pet OS — Documentación Técnica del Backend (`sn-backend`)

Este directorio contiene el servidor API RESTful, el coordinador multi-fuente de lugares Pet-Friendly, el pipeline criptográfico y de almacenamiento de fotografías en **Supabase Storage**, el motor de verificación administrativa y los conectores de IA (**Google Gemini** para clientes y **DeepSeek** para administración).

---

## Índice de Manuales de Avances del Backend

1. **[01 — Arquitectura Multi-Fuente y Motor de Compatibilidad Pet-Friendly](../docs/backend/01-arquitectura-multifuente-y-compatibilidad-pet.md)**
   - Coordinador multi-fuente (`multisource-places-coordinator.js`), integración con OpenStreetMap/Overpass, Geoapify, Foursquare, Wikimedia Commons y Google Places API (New).
   - Guardián de tasa y concurrencia por proceso (`provider-rate-guard.js`).
   - Motor de evaluación de compatibilidad por especie, tamaño, área (`seating_access`) y nivel de verificación (`pet-compatibility-service.js`).
2. **[02 — Pipeline de Fotografías Verificadas y Supabase Storage](../docs/backend/02-pipeline-fotografias-supabase-storage.md)**
   - Flujo de doble bucket en Supabase Storage (`gotox-place-photos-private` → revisión humana → `gotox-place-photos-public`).
   - Validador binario de imágenes (`photo-security-validator.js`): inspección de *magic bytes* (JPEG/PNG/WebP), dimensiones mínimas (`400x300`), eliminación de metadatos EXIF/GPS (`APP1`), protección contra *Path Traversal* y bloqueo SSRF.
   - Importador por lotes con compensación transaccional Storage ↔ PostgreSQL (`photo-batch-importer.js`), CLI (`photo-import-cli.js`), generador de borradores CSV asistido por IA (`photo-ai-draft-cli.js`) y subida directa en Base64 desde el panel administrativo.
3. **[03 — Verificación Administrativa Pet-Friendly y Automatización n8n](../docs/backend/03-verificacion-administrativa-y-automatizacion-n8n.md)**
   - Flujo de evidencia verificable (`pet-verification-service.js`): confirmación del comercio (`business_confirmation`), inspección administrativa (`admin_review`), vigencia semestral, resolución de contradicciones y retiro de insignias.
   - Emisión idempotente de eventos para **n8n** (`automation_events`) y tarea periódica del scheduler autónomo.
4. **[04 — Migraciones SQL (`008`–`010`), Base de Datos Dual y Suite de 117 Pruebas](../docs/backend/04-migraciones-esquema-db-y-pruebas.md)**
   - Esquema en **Supabase PostgreSQL** (`app_private`, 29 tablas) y motor **SQLite** idempotente para pruebas locales.
   - Detalle de las migraciones `008`, `009` y `010`, y guía de ejecución de las suites de pruebas automatizadas (`117/117` tests).

---

## Comandos Principales (`backend/package.json`)

| Comando | Descripción |
| :--- | :--- |
| `npm --prefix backend run dev` | Inicia el servidor Express en modo desarrollo con recarga automática (`http://localhost:4000`). |
| `npm --prefix backend test` | Ejecuta las **117 pruebas automatizadas** del backend (`node --test test/**/*.test.js`). |
| `npm --prefix backend run db:supabase:check` | Verifica conexión en vivo a Supabase PostgreSQL (`app_private`) y Supabase Storage. |
| `npm --prefix backend run db:supabase:migrate` | Ejecuta las migraciones SQL (`001` a `010`) sobre Supabase PostgreSQL. |
| `npm --prefix backend run photos:import` | CLI de importación de fotografías por lotes (`--dry-run` por defecto; `--commit` para subir al bucket privado). |
| `npm --prefix backend run photos:reconcile` | Reconcilia objetos en Supabase Storage contra los registros de `place_photos` en PostgreSQL. |
| `npm --prefix backend run photos:report` | Muestra el estado y reporte detallado de lotes de importación (`photo_import_batches`). |
| `npm --prefix backend run photos:draft-csv` | Genera un manifiesto CSV borrador (`requires_human_review=true`) a partir de una carpeta local de imágenes. |

---

## Estructura de Módulos Nuevos y Actualizados

```text
backend/
├── src/
│   ├── app.js                                           # Express app (CORS, Helmet/CSP, JSON 12MB, Rate Limit)
│   ├── modules/
│   │   ├── admin-control/
│   │   │   ├── admin-controller.js                      # Controladores de políticas pet-friendly y n8n
│   │   │   ├── admin-routes.js                          # Rutas protegidas por requireAdmin
│   │   │   └── pet-verification-service.js              # Gestión de evidencia pet-friendly y vigencia
│   │   └── places/
│   │       ├── google-place-photo-resolver.js           # Resolución de fotos por sucursal (Google Places)
│   │       ├── multisource-admin-service.js             # Moderación de fotos, subida Base64 y enlaces externos
│   │       ├── multisource-places-coordinator.js        # Coordinador multi-fuente (Catálogo + OSM + Geoapify + Foursquare + Wikimedia)
│   │       ├── osm-places-service.js                    # Conector Overpass OSM con validación de radio y estados nulos
│   │       ├── pet-compatibility-service.js             # Motor de compatibilidad por mascota y procedencia
│   │       ├── pet-friendly-places-service.js           # Servicio unificado de búsqueda real pet-friendly
│   │       ├── photo-ai-draft-cli.js                    # CLI generador de CSV borrador asistido por IA
│   │       ├── photo-batch-importer.js                  # Importador por lotes con compensación Storage ↔ BD
│   │       ├── photo-import-cli.js                      # CLI de importación, reconciliación y reportes
│   │       ├── photo-security-validator.js              # Validador magic bytes, limpieza EXIF y defensa SSRF
│   │       └── supabase-photo-storage.js                # Cliente de doble bucket en Supabase Storage
│   ├── shared/
│   │   ├── clients/
│   │   │   ├── foursquare-places-client.js              # Cliente Foursquare (solo campos gratuitos permitidos)
│   │   │   ├── geoapify-places-client.js                # Cliente Geoapify Places API
│   │   │   ├── google-places-client.js                  # Cliente Google Places API (New) con FieldMask estricto
│   │   │   └── wikimedia-commons-client.js              # Cliente gratuito Wikimedia Commons con licencia y autor
│   │   ├── config/
│   │   │   ├── database.js                              # Adaptador dual PostgreSQL / SQLite con migraciones idempotentes
│   │   │   └── migrations/
│   │   │       ├── 008-pet-verification-evidence.sql    # Evidencia pet-friendly y eventos de automatización
│   │   │       ├── 009-multisource-places-architecture.sql # Enlaces externos por sucursal y tabla place_photos
│   │   │       └── 010-place-photos-storage-pipeline.sql   # Columnas de Storage, hashes SHA-256 y lotes de importación
│   │   └── utils/
│   │       └── provider-rate-guard.js                   # Limitador de tasa, concurrencia, timeout y backoff
└── test/
    ├── enterprise-features.test.js                      # Suite enterprise (43 pruebas)
    ├── multisource-places.test.js                       # Suite arquitectura multi-fuente (7 pruebas)
    ├── pet-care-videos.test.js                          # Suite videos de bienestar y chat Bruno (15 pruebas)
    ├── pet-friendly-real-search.test.js                 # Suite búsqueda real pet-friendly y n8n (7 pruebas)
    ├── photo-storage-pipeline.test.js                   # Suite Storage, EXIF, SSRF y moderación (5 pruebas)
    └── system-complete.test.js                          # Suite integral de módulos del sistema (40 pruebas)
```
