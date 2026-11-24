# Requerimientos del Proyecto Final Full Stack (Meta: 100%)

Este documento resume todos los requisitos técnicos, funcionales, de seguridad y de entrega que debe cumplir tu aplicación web según el enunciado oficial de **FWD Costa Rica**.

---

## 1. Stack Tecnológico Obligatorio
- [ ] **Frontend:** React (consumo del backend propio, manejo de sesión y vistas según rol).
- [ ] **Backend:** Node.js con Express (organizado por capas).
- [ ] **Base de datos:** Motor SQL relacional (MySQL, PostgreSQL, MariaDB o SQL Server). *No se permite NoSQL como base principal.*
- [ ] **Seguridad:** `bcrypt` para contraseñas y `JWT` para autenticación.
- [ ] **Pruebas:** Jest (u otra herramienta equivalente de pruebas unitarias).
- [ ] **Automatización:** n8n (3 workflows exportados).
- [ ] **Control de versiones:** Git y GitHub con flujo de ramas obligatorio.
> *Nota: Si deseas cambiar React o Node.js por otra tecnología, debes pedir aprobación previa al profesor.*

---

## 2. Base de Datos y Modelado
- [ ] **Normalización:** Modelo normalizado al menos hasta **Tercera Forma Normal (3FN)**, sin datos duplicados innecesariamente.
- [ ] **Entidades de seguridad:** Tablas de `usuarios`, `roles` y la relación entre ambos.
- [ ] **Entidades de actividad/bitácora:** Tablas que registren el historial de ejecuciones de los agentes de IA y de las integraciones externas.
- [ ] **Entidades de gobernanza:** Tablas para registrar aceptación de términos y políticas, consentimientos y solicitudes de eliminación de datos.
- [ ] **Scripts en repositorio:** Incluir scripts SQL de creación de tablas y datos de prueba (`seed`).
- [ ] **Documentación de BD:** Diagrama Entidad-Relación (entidades, atributos, PK, FK, cardinalidades 1:1, 1:N, N:M) y Diccionario de Datos (tabla, campo, tipo de dato, propósito).

---

## 3. Arquitectura del Backend (Express por Capas)
El servidor debe estar estrictamente organizado en carpetas con responsabilidades separadas:
- [ ] **Punto de entrada (`server.js` / `app.js`):** Crea el servidor, registra middlewares globales, monta rutas y maneja errores.
- [ ] `config/`: Conexión a la base de datos y configuración a partir de variables de entorno.
- [ ] `models/`: Representación de entidades y acceso a tablas.
- [ ] `controllers/`: Reciben la petición, invocan la lógica y devuelven la respuesta HTTP.
- [ ] `routes/`: Definen los endpoints y encadenan los middlewares y controladores.
- [ ] `middlewares/`:
  - Validación de datos de entrada en **toda ruta que reciba datos** (campos obligatorios, formatos como correo/cédula/fechas, longitudes y tipos, respondiendo con código HTTP adecuado y mensaje claro).
  - Verificación de JWT.
  - Verificación de roles (autorización).
  - Manejo centralizado de errores.
- [ ] `services/`: Lógica de negocio, consumo de APIs externas y los 8+ agentes de IA.
- [ ] `tests/`: Pruebas unitarias del sistema.
- [ ] `.env` y `.env.example`: Todas las credenciales (BD, secreto/expiración JWT, API keys de IA, API keys externas, correo, puerto/entorno) deben vivir en `.env` (ignorado en `.gitignore`). En GitHub se sube únicamente `.env.example` sin valores reales.

---

## 4. Seguridad, Autenticación y Roles
- [ ] **Encriptación (`bcrypt`):** Ninguna contraseña en texto plano; siempre guardar hash y validar comparando contra el hash.
- [ ] **JWT:** Firmado con clave secreta en `.env`, con tiempo de expiración definido y payload mínimo (ID de usuario y rol; nunca datos sensibles).
- [ ] **Control de Roles (ej. Administrador, Colaborador, Cliente, Auditor):**
  - **Acceso (Frontend):** Mostrar solo las pantallas y opciones permitidas para cada rol.
  - **Autorización (Backend):** Validar el rol obligatoriamente en las rutas del servidor mediante middleware (ocultar botones en React no basta).

---

## 5. Agentes de Inteligencia Artificial (Mínimo 8)
- [ ] Crear **al menos 8 agentes de IA funcionales** dentro de la carpeta `services/` del backend.
- [ ] Cada agente debe ser accesible desde el frontend según el rol correspondiente.
- [ ] Cada agente debe tener propósito de negocio claro, entradas y salidas definidas.
- [ ] **Bitácora obligatoria:** Cada ejecución debe quedar registrada en la base de datos.
- [ ] **Documentación por agente:** Objetivo, rol autorizado, datos de entrada, resultado esperado, modelo/proveedor de IA usado y medidas de protección de datos personales.
- *Ejemplos sugeridos:* Lector de facturas por correo (PDF/XML/imagen), Conversacional con RAG (documentos propios), Generador de contenido multimedia, Contable, Recursos Humanos, Atención al cliente, Analista de datos/reportes, Asistente de cumplimiento (privacidad).

---

## 6. Consumo de APIs Externas
- [ ] Integrar **al menos una API externa real** en una funcionalidad útil del negocio (ejemplos recomendados en Costa Rica: **BCCR** para tipo de cambio con token, **Ministerio de Hacienda** para consulta de contribuyentes por cédula o tipo de cambio, clima, mapas, correo, etc.).
- [ ] Todas las llamadas deben hacerse desde el backend (`services/`).
- [ ] Implementar manejo de errores y tiempos de espera (*timeouts*).
- [ ] **Nunca** exponer credenciales ni tokens de APIs externas en el frontend.

---

## 7. Automatizaciones con n8n
- [ ] Crear **3 workflows en n8n** que repliquen procesos reales de tu sistema (ej. lectura y registro de facturas, consulta diaria de tipo de cambio BCCR, onboarding de usuarios, o flujo de eliminación de datos).
- [ ] Exportar los 3 workflows e incluirlos en el repositorio de GitHub.
- [ ] Documentar para cada uno: disparador (*trigger*), pasos y problema de negocio que resuelve.

---

## 8. Frontend en React
- [ ] **Login:** Con validaciones y mensajes de error claros.
- [ ] **Registro:** Público o interno (por administrador si es intranet), incluyendo **aceptación explícita** de Términos y Condiciones y Política de Privacidad.
- [ ] **Recuperación de contraseña:** Flujo contemplado en el sistema y mockups.
- [ ] **Rutas protegidas:** Accesibles solo para usuarios autenticados y diferenciadas por rol.
- [ ] **Sesión:** Cierre de sesión y manejo adecuado cuando el JWT expira.
- [ ] **UX / UI:** Diseño responsivo (escritorio y móvil), coherente con tu libro de marca, navegación clara y retroalimentación visual (estados de carga, errores y confirmaciones).
- [ ] **Perfil de usuario:** Gestión de cuenta y flujo visible para solicitar eliminación de datos.

---

## 9. Gobernanza de Datos (Ley N.º 8968 de Costa Rica)
El sitio debe tener apartados visibles y funcionales basados en consentimiento informado, finalidad y derechos de acceso, rectificación y supresión:
- [ ] **Política de Privacidad:** Explicar qué datos se recopilan y cómo, finalidad y base de tratamiento, si se comparten con terceros (incluyendo proveedores de IA y APIs externas), medidas de protección (encriptación, roles, bitácoras) y tiempo de conservación.
- [ ] **Términos y Condiciones:** Reglas de uso, responsabilidades del usuario y la organización, uso aceptable de los agentes de IA y limitación de responsabilidad sobre respuestas generadas por IA.
- [ ] **Baja del sistema y eliminación de datos:**
  - Opción dentro del perfil para solicitar eliminación de cuenta y datos personales.
  - Confirmación de identidad antes de procesar.
  - Eliminación o anonimización de datos (explicando qué se conserva por obligación legal/contable).
  - Notificación al usuario al finalizar y registro de la solicitud en la base de datos.

---

## 10. Pruebas Unitarias (Jest)
- [ ] Cubrir como mínimo:
  - Middlewares de validación y de autenticación.
  - Verificación de roles.
  - Controladores principales.
  - Services (agentes de IA e integraciones externas, usando *mocks* para simular respuestas externas).
- [ ] Deben ejecutarse con **un solo comando** documentado en el `README.md` (ej. `npm test`).

---

## 11. GitHub y Flujo de Trabajo
- [ ] Uso obligatorio de ramas: `main` (estable), `develop` (integración), `feature/...` (funcionalidades) y `fix/...` (correcciones).
- [ ] Historial constante de trabajo (no subir todo en un único commit al final).
- [ ] Commits con mensajes descriptivos e integración mediante **Pull Requests**.
- [ ] Archivo `README.md` completo: descripción del proyecto, instrucciones de instalación/ejecución, comando de pruebas y lista de variables de entorno necesarias.

---

## 12. Fechas Clave de Evaluación
- **Primer avance:** Jueves 3 de diciembre de 2026.
- **Segundo avance:** Miércoles 9 de diciembre de 2026.
- **Entrega final:** Presentación y demostración funcional ante el profesor con todos los entregables listos.