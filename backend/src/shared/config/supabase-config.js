const { createClient } = require('@supabase/supabase-js');
const env = require('./env-config');

class SupabaseSafeClient {
  constructor() {
    this.url = env.supabase?.url || process.env.SUPABASE_URL || '';
    this.anonKey = env.supabase?.anonKey || process.env.SUPABASE_ANON_KEY || '';
    this.serviceRoleKey = env.supabase?.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    this.client = null;
    this.adminClient = null;

    this.initClients();
  }

  initClients() {
    if (this.isConfigured()) {
      try {
        this.client = createClient(this.url, this.anonKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });

        if (this.serviceRoleKey) {
          this.adminClient = createClient(this.url, this.serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false }
          });
        }
        console.log(`[Supabase] Cliente conectado a ${this.url}`);
      } catch (err) {
        console.warn('[Supabase] Error inicializando cliente SDK:', err.message);
      }
    }
  }

  isConfigured() {
    return Boolean(this.url && this.url.startsWith('http') && this.anonKey && this.anonKey.trim().length > 0);
  }

  getClient() {
    if (!this.client && this.isConfigured()) {
      this.initClients();
    }
    return this.client;
  }

  getAdminClient() {
    if (!this.adminClient && this.isConfigured() && this.serviceRoleKey) {
      this.initClients();
    }
    return this.adminClient || this.getClient();
  }

  async checkHealth() {
    if (!this.isConfigured()) {
      return {
        configured: false,
        status: 'pending_credentials',
        message: 'Supabase URL o Anon Key pendientes de configurar en .env',
        provider: 'Supabase Cloud (Standby)'
      };
    }

    try {
      const client = this.getClient();
      // Verificación rápida consultando el estado de autenticación / versión
      const { data, error } = await client.auth.getSession();
      return {
        configured: true,
        status: error ? 'auth_warning' : 'connected',
        url: this.url,
        has_service_role_key: Boolean(this.serviceRoleKey),
        provider: 'Supabase Cloud',
        details: error ? error.message : 'Conexión activa y autenticada'
      };
    } catch (err) {
      return {
        configured: true,
        status: 'connection_error',
        error: err.message,
        url: this.url,
        provider: 'Supabase Cloud'
      };
    }
  }

  async uploadStorageFile(bucket, filePath, fileBuffer, contentType = 'application/octet-stream') {
    if (!this.isConfigured()) {
      return {
        uploaded: false,
        fallback: true,
        url: `/local-storage/${bucket}/${filePath}`,
        message: 'Modo local sin Supabase: archivo almacenado virtualmente'
      };
    }

    const client = this.getAdminClient();
    const { data, error } = await client.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true
      });

    if (error) {
      throw new Error(`Error subiendo a Supabase Storage: ${error.message}`);
    }

    const { data: urlData } = client.storage.from(bucket).getPublicUrl(filePath);

    return {
      uploaded: true,
      path: data.path,
      publicUrl: urlData.publicUrl
    };
  }

  getStoragePublicUrl(bucket, filePath) {
    if (!this.isConfigured()) {
      return `/local-storage/${bucket}/${filePath}`;
    }
    const client = this.getClient();
    const { data } = client.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }
}

module.exports = new SupabaseSafeClient();
