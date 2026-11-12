const express = require('express');
const cors = require('cors');
const env = require('./shared/config/env-config');
const apiRouter = require('./shared/routing/api-router');
const rateLimiter = require('./shared/middlewares/rate-limiter');
const errorHandler = require('./shared/middlewares/error-handler');

const app = express();

// 1. Configuración de CORS
app.use(cors({
  origin: env.isProd ? env.frontendUrl : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-token', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
}));

// 2. Parsers de cuerpo con límite de tamaño
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 3. Escudo anti-spam / Rate limiting
app.use(rateLimiter(150, 60000));

// 4. Montaje de API Router Central
app.use('/api', apiRouter);

// 5. Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    data: null,
    meta: { timestamp: new Date().toISOString() },
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Ruta ${req.method} ${req.originalUrl} no encontrada en este servidor`,
    }
  });
});

// 6. Manejador Centralizado de Errores
app.use(errorHandler);

module.exports = app;

