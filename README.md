# Sistema de Sinergia Urbana Costa Rica — Backend & Conectores Abiertos

Plataforma backend desacoplada con motor de sinergia urbana, copiloto IA, conectores abiertos 100% gratuitos y gestión de salidas grupales con tolerancia a desconexión y control de concurrencia optimista.

---

## 🚀 Inicio Rápido Local

### 1. Requisitos Previos
- **Node.js** v20+ o v24+ (incluye motor relacional SQLite integrado para pruebas y desarrollo sin dependencias de sistema).
- **MySQL 8+** (opcional para producción / staging).

### 2. Puesta en Marcha

```bash
# Entrar al backend
cd server

# Instalar dependencias
npm install

# Ejecutar migraciones versionadas y datos semilla (1 feria, 2 cafés, 1 plan demo)
npm run migrate
npm run seed

# Iniciar en modo desarrollo con recarga automática
npm run dev
```

El servidor estará disponible en `http://localhost:4000/api`.
- Chequeo de salud: `GET http://localhost:4000/api/health`
- Chequeo de base de datos: `GET http://localhost:4000/api/health/db`

---

## 🧪 Pruebas Automatizadas

```bash
# Desde la carpeta server:
npm test

# O desde la raíz del proyecto:
npm run test:backend
```

Suite de 19 pruebas que cubren:
- Migraciones y seeds del catálogo demostrativo.
- Creación, compartición y consulta de planes.
- Onboarding de invitados sin cuenta y votación idempotente anti-duplicados.
- Confirmación de plan por el organizador y congelamiento de snapshot inmutable.
- Cancelación de eventos por admin y generación automática de propuestas por el agente de operaciones.
- Control de concurrencia optimista (`409 Conflict`) ante propuestas desactualizadas.
- Aceptación atómica de propuestas, reconfirmación forzada de invitados y cola outbox con deduplicación por `idempotency_key`.
- Operación 100% resiliente y continua con proveedores externos desconectados.

---

## 📂 Documentación para Frontend y Evaluadores

- **Contrato de API y Mocks:** [docs/api-contract.md](file:///c:/Users/calva/taller-cli/sn/docs/api-contract.md)
- **Recorrido de Prueba y Checklist MVP:** [docs/mvp-checklist.md](file:///c:/Users/calva/taller-cli/sn/docs/mvp-checklist.md)
- **Integraciones Abiertas y Resiliencia:** [docs/integrations.md](file:///c:/Users/calva/taller-cli/sn/docs/integrations.md)

# proyecto-sn
