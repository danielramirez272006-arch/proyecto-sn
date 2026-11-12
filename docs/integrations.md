# Proveedores, Integraciones Abiertas y Resiliencia Operativa

El backend está diseñado con una arquitectura **100% gratuita y sin tarjeta de crédito**, utilizando datos abiertos de Costa Rica y APIs globales sin cuota de pago, con un escudo de aislamiento total ante caídas.

---

## 1. Tabla de Proveedores y Conectores Externos

| Conector / Proveedor | Propósito | Costo | Variables Requeridas | Política de Reintento y Timeout | Comportamiento sin Conexión / Caída |
|---|---|---|---|---|---|
| **MySQL 8 / SQLite Integrado** | Base de datos relacional del MVP | $0 | `DB_DIALECT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Timeout 2000ms. Si MySQL no está disponible, conmuta automáticamente a SQLite integrado de Node v24. | Transparente. Permite ejecutar pruebas y desarrollo local sin servidor MySQL activo. |
| **Open-Meteo API** | Clima en vivo, lluvia, viento, UV, barro en parques | $0 (Open API) | `OPEN_METEO_BASE_URL` | Timeout 3000ms. 1 reintento con backoff. Caché en RAM de 5 min. | Retorna microclima promedio del Valle Central (24°C, lluvia moderada, barro bajo). |
| **RainViewer API** | Tiles de radar Doppler en tiempo real | $0 (Open API) | `RAINVIEWER_BASE_URL` | Timeout 2500ms. Caché en RAM de 2 min. | Retorna capa estática de radar simulada sin interrumpir el mapa. |
| **OSRM Routing** | Rutas por calle, tiempo vial y curvatura (mareo canino) | $0 (Open Source) | `OSRM_BASE_URL` | Timeout 3000ms. 1 reintento con backoff. | Calcula distancia Haversine y estima tiempo a velocidad urbana de 35 km/h. |
| **Nominatim / Photon (OSM)** | Geocodificación directa e inversa (calles y barrios) | $0 (Open Data) | `NOMINATIM_BASE_URL` | Timeout 3000ms. Caché de 3h por cuadrante. | Retorna dirección aproximada con cantón y distrito de Costa Rica. |
| **Overpass OSM API** | Buscador de rampas 7600, baños públicos, cajeros, EV | $0 (Open Data) | N/A | Timeout 4000ms. | Consulta base local de lugares verificados por Admin. |
| **Ministerio de Hacienda** | Tipo de cambio oficial BCCR, CAByS, 13% IVA + 10% servicio | $0 (Gobierno CR) | `HACIENDA_API_URL` | Timeout 2500ms. Caché diario de 6 horas. | Utiliza tipo de cambio de referencia (508.50 compra / 516.20 venta) y calcula impuestos por regla local. |
| **RECOPE / ARESEP** | Precios oficiales de combustibles y tarifas de bus/tren | $0 (Datos Abiertos) | `RECOPE_API_URL` | Timeout 2500ms. | Utiliza tarifas vigentes reglamentarias (Super: ₡715, Regular: ₡685, Diesel: ₡595, Tren: ₡550). |
| **Bio & Food Safety (iNaturalist / OpenFood)** | Triaje toxicológico en mascotas y plantas peligrosas | $0 (Abierto) | N/A | Heurística local de memoria inmediata (0ms de latencia). | Catálogo interno con las 10 toxinas veterinarias críticas de Costa Rica. |
| **USGS Earthquakes & Marine** | Sismos en tiempo real y oleaje costero | $0 (Open API) | `USGS_EARTHQUAKE_URL` | Timeout 3000ms. | Muestra sismos de baja magnitud simulados en radio del Pacífico Central. |
| **Nager.Date & Radio Browser** | Feriados oficiales de Costa Rica y emisoras de radio ambiental | $0 (Open API) | `NAGER_DATE_URL`, `RADIO_BROWSER_URL` | Timeout 2500ms. | Lista los 8 feriados oficiales por ley de Costa Rica y emisoras clásicas precargadas. |
| **Google Gemini Free Tier** | Asistente de voz, intención y borradores | $0 (Free Tier 1500 req/día) | `GEMINI_API_KEY` | Timeout 4000ms. Contador estricto diario de cuota en RAM. | Motor heurístico determinista local para categorías de comida, veterinaria y planes. |
| **Adaptador de Correo (Outbox)** | Envío asíncrono de avisos de cambios y propuestas | $0 | N/A | Cola persistente en base relacional con 5 reintentos y backoff exponencial (1m, 2m, 4m, 8m, 16m). | Los correos quedan en estado `pending` en la base de datos sin bloquear transacciones de usuario. |

---

## 2. Aislamiento y Resiliencia

1. **Circuit Breaker Activo:** Si cualquier host externo falla 3 veces consecutivas, el cliente HTTP (`ResilientHttpClient`) pausa las llamadas a ese host durante 30 segundos, devolviendo inmediatamente el fallback para evitar retrasos al usuario.
2. **Idempotencia Garantizada:** Todas las notificaciones y votos emplean restricciones únicas en base de datos (`idempotency_key`, `UNIQUE(plan_id, guest_id, option_id)`), impidiendo duplicados ante caídas de red o reconexiones.
3. **Control de Concurrencia Optimista:** Cada modificación de plan valida el número de `revision`. Si dos usuarios o la IA intentan actualizar el plan al mismo tiempo, el segundo recibe un `409 Conflict` con la revisión vigente.

