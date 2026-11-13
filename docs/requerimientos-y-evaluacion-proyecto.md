Requerimientos y evaluación del proyecto final

**Proyecto revisado:** `Desktop/practicas de progra/practicas semana 10/proyecto final/proyecto-sn`  
**Fecha de revisión:** 13 de noviembre de 2026  
**Método:** revisión estática de archivos, rutas, migraciones y documentación. No se ejecutó la aplicación ni la suite de pruebas; por eso, la presencia de una función en el código no demuestra que funcione de punta a punta.

## Resumen

El proyecto contiene una base amplia: interfaz React, API Express, módulos de lugares, clima, eventos, veterinarias, planes grupales, administración y conectores externos. Sin embargo, el código actual **no cumple todavía todas las expectativas acumuladas en los chats**.

Los tres bloqueos principales son:

1. **La base está configurada para MySQL/SQLite, no Supabase/PostgreSQL**, que era el destino acordado en la conversación.
2. **La autenticación no es apta para usuarios reales:** el inicio de sesión no verifica la contraseña y el registro crea un hash simulado.
3. **No aparece el backend del catálogo educativo de videos de YouTube** (búsqueda, análisis, aprobación y preguntas sobre fragmentos). Hay una ruleta de videos en el frontend, pero no es el flujo solicitado.

También hay una brecha entre el asistente descrito y el implementado: el endpoint de borradores ignora la petición del usuario y escoge lugares del catálogo por orden, sin demostrar que el itinerario respete clima, horarios, zona o presupuesto.

## Requisitos y estado

| ID | Requisito derivado de la conversación | Estado | Evidencia y observaciones |
|---|---|---|---|
| R1 | La plataforma sirve al público general y combina descubrimiento local, clima, comida y servicios veterinarios; pet-friendly funciona como filtro. | **Parcial** | Existen páginas y módulos de clima, comida y veterinaria, además de un catálogo común. La revisión no confirmó un recorrido integrado y funcional ni datos locales verificados suficientes. |
| R2 | La pantalla principal ayuda a decidir “qué hacer hoy” y explica por qué recomienda un lugar o plan; permite ajustar zona y filtros. | **Parcial** | Existen `synergy-engine` y `voice-ai-concierge`. En `concierge-service.js`, `generatePlanDraft` selecciona los primeros lugares del catálogo y no usa `promptText` para construir o validar las paradas. No cumple aún la recomendación contextual descrita. |
| R3 | Catálogo y agenda con lugares/eventos, estado y datos verificables por atributo, incluida fecha/fuente de verificación. | **Parcial** | Hay tablas `places` y `events`, endpoints públicos y administración. El esquema contempla `attributes_metadata`; falta comprobar en ejecución la calidad, procedencia y actualización de los datos reales. |
| R4 | Crear un plan compartible con opciones y paradas; invitados votan; el organizador confirma y conserva la decisión final. | **Parcial** | Hay rutas y tablas para planes, invitados, votos, opciones y paradas; existen pruebas automatizadas descritas para el flujo. No se ejecutaron, así que no se confirma su comportamiento real. |
| R5 | Si un evento cambia, preparar un plan alternativo; el organizador lo acepta o descarta; registrar historial y evitar cambios obsoletos. | **Parcial** | El backend incluye `plan_proposals`, `plan_history`, revisiones y una cola `notification_outbox`. La documentación y las pruebas describen concurrencia e idempotencia; falta ejecutar y validar el flujo completo. |
| R6 | Panel de administración para eventos, catálogo y revisión de correcciones; operaciones protegidas por rol. | **Parcial** | Hay páginas y endpoints de administración; `admin-routes.js` aplica `requireAdmin`. La protección depende de autenticación fiable, que actualmente no está lista para usuarios reales (R10). |
| R7 | El cliente puede conversar con el asistente y recibir un borrador editable que use sus preferencias y datos reales del catálogo. | **No cumple todavía** | Existe endpoint de intención y cliente Gemini, pero `generatePlanDraft` no usa la solicitud para seleccionar opciones; devuelve un borrador prefabricado basado en los primeros lugares. La voz del navegador tampoco demuestra por sí sola una conversación completa. |
| R8 | Videos exclusivamente de YouTube: búsqueda desde Admin, análisis con Gemini, aprobación humana, catálogo y preguntas que devuelvan fragmentos/minutos verificados. | **No cumple** | Solo encontré una ruleta/reproductor de YouTube en el frontend (`RuletaVideos.jsx`, `videosRuleta.js`). No encontré rutas, módulo backend, migración ni variables para buscar/analizar/aprobar videos o responder preguntas sobre fragmentos. |
| R9 | Persistencia en Supabase/PostgreSQL para el MVP acordado. | **No cumple** | El proyecto usa `mysql2` y una alternativa SQLite en `server/src/shared/config/database.js`; `env-config.js` selecciona MySQL/SQLite. No encontré cliente Supabase ni migraciones de Supabase. La guía de ejecución también indica MySQL/SQLite. |
| R10 | Inicio de sesión, roles y permisos confiables; solo el organizador cambia su plan y solo Admin ejecuta operaciones administrativas. | **No cumple para producción** | `auth-service.js`: `login` busca el usuario, pero no compara la contraseña; `register` guarda un hash simulado. No usar con cuentas reales hasta corregir y probar el flujo de credenciales y autorización. |
| R11 | Fallos de APIs externas no deben impedir abrir/votar/editar planes; límites, caché y reintentos deben tener límites claros. | **Parcial** | Hay cliente HTTP, cachés, rate limiter, fallbacks y documentación de resiliencia. La cobertura descrita en pruebas es prometedora, pero no fue ejecutada. |
| R12 | Un solo catálogo inicial, en una zona, con datos reales revisados; probar con personas antes de ampliar módulos. | **No confirmado** | Hay seeds de demostración (una feria y dos cafés), pero no se verificó un catálogo real, su mantenimiento ni resultados de pruebas con usuarios. |
| R13 | Contrato de API y documentación que el compañero del frontend pueda usar. | **Parcial** | Existen `docs/api-contract.md`, `docs/mvp-checklist.md` y `docs/integrations.md`. El README enlaza a rutas locales antiguas (`file:///c:/Users/calva/taller-cli/sn/...`), por lo que esos enlaces no corresponden a esta copia. |
| R14 | Datos personales de mascotas/tutores deben ser privados y no quedar publicados como datos de producción en el bundle. | **Requiere revisión** | El bundle compilado contiene un perfil de ejemplo con datos detallados de contacto y salud. Puede ser demostrativo, pero hay que confirmar que todo sea ficticio y retirar del bundle cualquier dato real. |

## Qué sí está bien encaminado

- Separación por módulos en frontend y backend.
- Contrato de API y guía de recorrido del MVP.
- Tablas para eventos, lugares, planes, votos, propuestas, historial y notificaciones.
- Rutas de catálogo, agenda, planes y administración.
- Código para clientes externos, límites y respuestas de respaldo.
- Pruebas automatizadas existentes para los flujos principales, aunque su resultado no se verificó en esta revisión.

## Correcciones prioritarias

1. **Asegurar autenticación antes de cualquier piloto con usuarios:** validar contraseñas con hash real, manejar secretos fuera del código, y probar login, roles y acceso a planes.
2. **Acordar y unificar la base de datos:** migrar el backend a Supabase/PostgreSQL o actualizar formalmente el requisito. Hoy el README, el código y la decisión de la conversación no coinciden.
3. **Completar el flujo principal:** búsqueda contextual con catálogo, clima, distancia, horario y presupuesto; devolver razones y permitir editar antes de compartir.
4. **Decidir si videos de mascotas entran en esta entrega.** Si sí, faltan el módulo backend, tablas, permisos de Admin, análisis y aprobación de fragmentos. Si no, dejar la ruleta como contenido estático y mover el análisis de YouTube a una fase posterior.
5. **Ejecutar las verificaciones del MVP** en un entorno limpio: migraciones, seeds, API, voto duplicado, permisos, aceptación de plan B, fallos de proveedores y frontend conectado al backend.
6. **Reemplazar datos ficticios llamativos y enlaces/documentación heredados** antes de publicar el proyecto.

## Conclusión

**El proyecto cumple parcialmente la visión y contiene bastante estructura, pero no está listo para considerarse conforme a todas las expectativas.** El flujo de planes y la arquitectura modular están representados; la base acordada, la seguridad de autenticación y el asistente con recomendaciones reales son brechas importantes. El análisis de videos de YouTube solicitado al final de la conversación aún no aparece en el backend.

Esta evaluación es estática. Para declarar los requisitos funcionales como cumplidos hace falta ejecutar la suite existente y completar un recorrido real desde la interfaz hasta la base de datos.
