const app = require('./app');
const env = require('./shared/config/env-config');
const { initDatabase, runMigrations, runSeeds } = require('./shared/config/database');
const { emailWorker } = require('./modules/notifications');
const { orchestrator } = require('./autonomous-agents');

async function bootstrap() {
  try {
    console.log('[Server] Inicializando Sistema de Sinergia Urbana Costa Rica...');

    // 1. Inicializar base de datos
    await initDatabase();

    // 2. Si es desarrollo y la base está limpia, correr migraciones y seeds automáticamente
    if (env.nodeEnv !== 'production') {
      try {
        await runMigrations();
        await runSeeds();
      } catch (dbErr) {
        console.warn('[Server] Aviso al auto-aplicar migraciones/seeds:', dbErr.message);
      }
    }

    // 3. Iniciar Worker de Correo y Orquestador de Agentes
    emailWorker.start();
    orchestrator.init();

    // 4. Iniciar servidor HTTP
    const server = app.listen(env.port, () => {
      console.log(`[Server] Backend Express escuchando en http://localhost:${env.port}`);
      console.log(`[Server] Documentación y salud en http://localhost:${env.port}/api/health`);
    });

    // 5. Cierre limpio (Graceful shutdown)
    const shutdown = () => {
      console.log('[Server] Deteniendo servicios y workers...');
      emailWorker.stop();
      server.close(() => {
        console.log('[Server] Servidor HTTP cerrado correctamente.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    return server;
  } catch (err) {
    console.error('[Server] Fallo fatal al arrancar:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}

module.exports = { app, bootstrap };

