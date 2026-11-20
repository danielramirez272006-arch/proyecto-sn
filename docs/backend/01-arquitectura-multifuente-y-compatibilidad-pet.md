# 01 — Arquitectura Multi-Fuente y Motor de Compatibilidad Pet-Friendly

## 1. Objetivo de la Arquitectura

El módulo de lugares de GoToX Pet OS evita depender de una única API comercial costosa o inventar datos falsos cuando un proveedor externo no está disponible. Para lograrlo, implementa un **Coordinador Multi-Fuente** que combina:

1. **Catálogo Interno y Evidencia Verificada en PostgreSQL (`places`, `place_pet_evidence`, `place_photos`)**: Máxima prioridad editorial y legal.
2. **OpenStreetMap / Overpass API (`osm-places-service.js`)**: Descubrimiento geográfico abierto con validación estricta de coordenadas y radio en metros.
3. **Geoapify Places API (`geoapify-places-client.js`)**: Enriquecimiento opcional gratuito dentro de la cuota configurada.
4. **Foursquare Places API (`foursquare-places-client.js`)**: Enriquecimiento básico con bloqueo explícito de endpoints/campos Pro o Premium de pago.
5. **Wikimedia Commons API (`wikimedia-commons-client.js`)**: Obtención gratuita de fotografías bajo licencias abiertas (`CC BY`, `CC BY-SA`, `CC0`, dominio público) únicamente cuando existe coincidencia verificada o enlace explícito (`wikimedia_file` / `wikidata`).
6. **Google Places API (New) (`google-places-client.js` y `google-place-photo-resolver.js`)**: Integración desacoplada y protegida con `X-Goog-FieldMask` mínimo y resolución bajo demanda para no inflar costos.

---

## 2. Coordinador Multi-Fuente (`multisource-places-coordinator.js`)

Ubicación: `backend/src/modules/places/multisource-places-coordinator.js`

### Reglas de Fusión y Resolución de Identidad por Sucursal
- **Prohibición de fusión ciega por nombre**: Dos restaurantes con el mismo nombre en distintas ubicaciones (por ejemplo, una cadena con sucursal en Barrio Escalante y otra en Escazú) **nunca** se fusionan automáticamente si están fuera del umbral espacial (`<= 85 metros`) o si tienen un vínculo distinto en `place_external_links`.
- **Vínculos explícitos (`place_external_links`)**:
  - `linked`: La señal externa se asocia de forma determinista al `place_id` interno.
  - `ambiguous`: Se marca para revisión administrativa y se bloquea cualquier asociación automática de fotos o políticas.
  - `rejected`: Se ignora permanentemente la asociación entre ese `external_id` y el `place_id`.

### Jerarquía de Fotografías Públicas
Cuando el frontend consulta `GET /api/places/multisource/search`, el coordinador resuelve la propiedad `photo` aplicando esta prioridad estricta:
1. **Fotografía propia aprobada (`provider = 'gotox_owner'`, `approval_status = 'approved'`)** almacenada en el bucket público de Supabase Storage (`gotox-place-photos-public`), priorizando `is_cover = 1`.
2. **Fotografía previamente aprobada en `place_photos`** con licencia y autor verificados.
3. **Fotografía abierta de Wikimedia Commons** si el local tiene atributo `wikimedia_file` verificado y licencia libre válida.
4. **`null`**: Si ninguna fuente cumple las condiciones legales y de verificación, se devuelve `photo: null` (el frontend renderiza una portada tipográfica editorial sin imágenes engañosas).

---

## 3. Motor de Compatibilidad Pet-Friendly (`pet-compatibility-service.js`)

Ubicación: `backend/src/modules/places/pet-compatibility-service.js`

Cada establecimiento evaluado devuelve un contrato transparente sobre su política de ingreso de mascotas:

| Campo | Valores Posibles | Descripción |
| :--- | :--- | :--- |
| `access_status` | `allowed`, `not_allowed`, `unknown`, `conflicting` | Estado real de acceso. Un valor ausente en OSM nunca se convierte en `allowed`; permanece como `unknown`. |
| `verification_level` | `business_confirmation`, `admin_review`, `external_signal`, `unverified`, `conflicting_Paused` | Nivel de respaldo documental de la política. |
| `compatibility_result` | `compatible`, `compatible_with_conditions`, `not_compatible`, `unknown` | Evaluación cruzada contra el perfil de la mascota del usuario (`species`, `weight_kg`, `size`). |
| `known_conditions` | `{ species_allowed, size_or_weight_restriction, max_pets, seating_access, leash_required, reservation_required, notes }` | Condiciones operativas verificadas (nunca inventadas si no existen en la evidencia). |

### Evaluación Personalizada por Mascota
Cuando la búsqueda recibe parámetros del animal (`pet_species=dog|cat`, `pet_weight_kg=25`, `pet_size=large`, `preferred_seating=indoor|outdoor`):
- Si el local solo permite terraza (`seating_access = 'outdoor'`) y el usuario exige interior (`preferred_seating = 'indoor'`), devuelve `not_compatible` con la explicación correspondiente.
- Si existe contradicción activa entre dos fuentes verificadas o la evidencia semestral expiró (`expires_at < now`), el estado pasa a requerir revisión y emite un evento hacia la cola de automatización.

---

## 4. Guardián de Tasa y Resiliencia (`provider-rate-guard.js`)

Ubicación: `backend/src/shared/utils/provider-rate-guard.js`

Para proteger las cuotas gratuitas y evitar bloqueos por ráfagas:
- **Límite por ventana (`maxPerMinute`)** y **concurrencia máxima (`maxConcurrent`)** en memoria por proveedor (`osm`, `geoapify`, `foursquare`, `wikimedia`).
- **Timeout estricto por solicitud** con `AbortController`.
- **Reintentos con *exponential backoff*** únicamente ante errores transitorios (`429`, `502`, `503`, `504`), sin bloquear la respuesta general si un proveedor secundario falla.

---

## 5. Endpoints Expuestos

- `GET /api/places/multisource/search?lat=9.9355&lng=-84.0652&radius=2200&limit=25`
  - Soporta filtros adicionales: `access_filter=allowed`, `pet_species`, `pet_weight_kg`, `pet_size`, `preferred_seating`.
- `GET /api/places/nearby-real?lat=9.9355&lng=-84.0652&radius=2200&limit=25`
  - Endpoint de búsqueda real Pet-Friendly retrocompatible con el mapa y el explorador.
- `GET /api/places/google-photo?name=...&maxWidthPx=600` y `POST /api/places/resolve-photos`
  - Resolución bajo demanda de fotos con caché TTL por sucursal.
