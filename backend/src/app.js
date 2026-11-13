const express = require('express');
const cors = require('cors');
const env = require('./shared/config/env-config');
const apiRouter = require('./shared/routing/api-router');
const rateLimiter = require('./shared/middlewares/rate-limiter');
const securityHeaders = require('./shared/middlewares/security-headers');
const requestTracer = require('./shared/middlewares/request-tracer');
const errorHandler = require('./shared/middlewares/error-handler');

const app = express();

// 0. Observabilidad y Trazabilidad de Peticiones (x-request-id)
app.use(requestTracer);

// 1. Encabezados de seguridad HTTP (CSP, X-Content-Type-Options, FrameGuard)
app.use(securityHeaders);

// 2. Configuración de CORS
app.use(cors({
  origin: env.isProd ? env.frontendUrl : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-token', 'x-request-id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
}));

// 3. Parsers de cuerpo con límite de tamaño
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 4. Escudo anti-spam / Rate limiting
app.use(rateLimiter(300, 60000));

// 5. Montaje de API Router Central
app.use('/api', apiRouter);

// 6. Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: req.id || null
    },
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Ruta ${req.method} ${req.originalUrl} no encontrada en este servidor`,
    }
  });
});

// 7. Manejador Centralizado de Errores
app.use(errorHandler);

module.exports = app;
