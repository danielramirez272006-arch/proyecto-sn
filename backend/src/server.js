const app = require('./app');
const env = require('./shared/config/env-config');
const { initDatabase, closeDatabase, runMigrations, runSeeds } = require('./shared/config/database');
const { authService } = require('./modules/auth');
const { hydrateRevokedTokensFromDb } = require('./shared/middlewares/auth-role-guard');
const { emailWorker } = require('./modules/notifications');
const { orchestrator } = require('./autonomous-agents');

async function bootstrap() {
  try {
    console.log('[Server] Inicializando Synodos API — Costa Rica...');

    // Validación estricta de secretos en producción (fail-fast en Render)
    if (env.isProd) {
      if (!env.jwtSecret || env.jwtSecret === 'dev_insecure_jwt_secret_change_in_production' || env.jwtSecret.length < 32) {
        throw new Error('JWT_SECRET inseguro o faltante en NODE_ENV=production (mínimo 32 caracteres).');
      }
      if (!env.security?.passwordPepper) {
        console.warn('[Server] ADVERTENCIA: PASSWORD_PEPPER no está definido en producción.');
      }
    }

    // 1. Inicializar servidor HTTP en 0.0.0.0 (requerido por Render/contenedores)
    const server = app.listen(env.port, '0.0.0.0', () => {
      console.log(`[Server] Backend Express escuchando en http://0.0.0.0:${env.port}`);
      console.log(`[Server] Documentación y salud en http://localhost:${env.port}/api/health`);
    });

    // Timeouts HTTP defensivos contra sockets colgados / Slowloris (OWASP A10:2025)
    server.requestTimeout = 30000;
    server.headersTimeout = 15000;
    server.keepAliveTimeout = 65000;

    // 2. Inicializar base de datos e hidratar tokens JWT revocados (OWASP A07:2025)
    const dbInfo = await initDatabase();
    await hydrateRevokedTokensFromDb();

    // 3. Si es desarrollo, correr migraciones y seeds solo si la base está limpia (o SQLite local) para no saturar el pool de Supabase en cada reinicio
    if (env.nodeEnv !== 'production') {
      try {
        const { query } = require('./shared/config/database');
        let skipHeavyCloudMigrations = false;
        if (dbInfo?.dialect === 'postgres' && process.env.FORCE_MIGRATE !== 'true') {
          const existingPlaces = await query('SELECT COUNT(*) as total FROM places').catch(() => []);
          const count = Number(existingPlaces?.[0]?.total || 0);
          if (count >= 10) {
            skipHeavyCloudMigrations = true;
            console.log(`[Server] Base Supabase ya inicializada (${count} lugares activos). Omitiendo re-ejecución de migraciones en arranque.`);
          }
        }
        if (!skipHeavyCloudMigrations) {
          await runMigrations();
          await runSeeds();
          await authService.ensureDefaultAccounts();
        }
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

    // 5. Cierre limpio (Graceful shutdown) y manejo de excepciones no capturadas (OWASP A10:2025)
    let isShuttingDown = false;
    const shutdown = async (signal = 'SIGTERM', exitCode = 0) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`[Server] Señal ${signal} recibida. Deteniendo servicios, workers y pool de base de datos...`);
      emailWorker.stop();
      orchestrator.stop();

      const forceExitTimer = setTimeout(() => {
        console.error('[Server] Cierre forzado tras agotar tiempo de espera de 10s.');
        process.exit(exitCode || 1);
      }, 10000);
      if (typeof forceExitTimer.unref === 'function') forceExitTimer.unref();

      server.close(async () => {
        await closeDatabase().catch(() => {});
        clearTimeout(forceExitTimer);
        console.log('[Server] Servidor HTTP y conexiones BD cerrados correctamente.');
        process.exit(exitCode);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT', 0));
    process.on('SIGTERM', () => shutdown('SIGTERM', 0));
    process.on('unhandledRejection', (reason) => {
      console.error('[Server] Unhandled Promise Rejection interceptada de forma segura:', reason?.message || reason);
    });
    process.on('uncaughtException', (uncaughtErr) => {
      console.error('[Server] Uncaught Exception crítica:', uncaughtErr?.message || uncaughtErr);
      shutdown('uncaughtException', 1);
    });

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

