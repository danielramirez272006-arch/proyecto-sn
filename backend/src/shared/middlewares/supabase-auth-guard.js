const supabaseClient = require('../config/supabase-config');
const { unauthorized, forbidden } = require('../utils/http-response');

/**
 * Middleware para validar tokens JWT emitidos por Supabase Auth
 */
async function requireSupabaseAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Token Bearer de Supabase Auth requerido');
  }

  const token = authHeader.replace(/^Bearer\s+/, '').trim();

  if (!supabaseClient.isConfigured()) {
    // Modo de desarrollo/fallback local sin credenciales de Supabase
    return next();
  }

  try {
    const client = supabaseClient.getClient();
    const { data, error } = await client.auth.getUser(token);

    if (error || !data.user) {
      return unauthorized(res, 'Token de Supabase inválido o expirado', { details: error?.message });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || data.user.app_metadata?.role || 'authenticated',
      metadata: data.user.user_metadata || {},
      supabase_auth: true
    };

    next();
  } catch (err) {
    return unauthorized(res, 'Fallo verificando token con Supabase Auth', { details: err.message });
  }
}

/**
 * Middleware opcional: si viene un token de Supabase Auth lo decodifica, si no, permite continuar como visitante
 */
async function optionalSupabaseAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  if (supabaseClient.isConfigured()) {
    try {
      const client = supabaseClient.getClient();
      const { data } = await client.auth.getUser(token);
      if (data?.user) {
        req.user = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'authenticated',
          metadata: data.user.user_metadata || {},
          supabase_auth: true
        };
      }
    } catch (e) {
      // Continuar como anónimo
    }
  }

  next();
}

module.exports = {
  requireSupabaseAuth,
  optionalSupabaseAuth
};
