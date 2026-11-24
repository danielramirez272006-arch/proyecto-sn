const app = require('./app');
const env = require('./shared/config/env-config');
const { initDatabase, closeDatabase, runMigrations, runSeeds } = require('./shared/config/database');
const { authService } = require('./modules/auth');
const { emailWorker } = require('./modules/notifications');
const { orchestrator } = require('./autonomous-agents');

async function bootstrap() {
  try {
    console.log('[Server] Inicializando Sistema de Sinergia Urbana Costa Rica...');

    // 1. Inicializar servidor HTTP primero para que el proxy de Vite no reciba ECONNREFUSED durante migraciones en nube
    const server = app.listen(env.port, () => {
      console.log(`[Server] Backend Express escuchando en http://localhost:${env.port}`);
      console.log(`[Server] Documentación y salud en http://localhost:${env.port}/api/health`);
    });

    // 2. Inicializar base de datos
    await initDatabase();

    // 3. Si es desarrollo y la base está limpia, correr migraciones y seeds automáticamente
    if (env.nodeEnv !== 'production') {
      try {
        await runMigrations();
        await runSeeds();
        await authService.ensureDefaultAccounts();
      } catch (dbErr) {
        console.warn('[Server] Aviso al auto-aplicar migraciones/seeds:', dbErr.message);
      }
    }

    // 3.1 Bootstrap opcional de administrador inicial desde variables ADMIN_EMAIL / ADMIN_PASSWORD
    try {
      const bootstrapResult = await authService.ensureBootstrapAdmin();
      if (bootstrapResult.created || bootstrapResult.updated) {
        console.log(`[Server] Cuenta admin lista: ${bootstrapResult.email}`);
      }
    } catch (adminErr) {
      console.warn('[Server] Aviso al verificar admin bootstrap:', adminErr.message);
    }

    // 4. Iniciar Worker de Correo y Orquestador de Agentes
    emailWorker.start();
    orchestrator.init();

    // 5. Cierre limpio (Graceful shutdown)
    const shutdown = async () => {
      console.log('[Server] Deteniendo servicios, workers y pool de base de datos...');
      emailWorker.stop();
      orchestrator.stop();
      server.close(async () => {
        await closeDatabase();
        console.log('[Server] Servidor HTTP y conexiones BD cerrados correctamente.');
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

