# Recursos de Supabase Cloud — Synodos Pet OS

Directorio unificado con el esquema PostgreSQL (`app_private`), las migraciones de programación en la nube y las Edge Functions del proyecto:

```text
backend/supabase/
├── functions/
│   └── pet-policy-review-batch/index.ts       # Edge Function diaria de revisión de políticas pet-friendly
├── migrations/
│   └── 20261127_pet_policy_review_cron.sql    # Extensiones pg_cron + pg_net, RPCs service_role y job 08:00 CR
├── schema/
│   ├── supabase-esquema-mvp.sql               # Esquema base app_private, RLS, CHECKs e inmutabilidad
│   └── supabase-datos-demo.sql                # Semilla opcional para entornos de desarrollo
└── supabase.env.example                       # Ejemplo de variables de conexión
```

### Secretos requeridos del lado del servidor (nunca en Git)
- **Supabase Vault (`vault.secrets`):** `synodos_supabase_url` y `pet_review_cron_secret`.
- **Supabase Edge Functions Secrets:** `PET_REVIEW_BATCH_SIZE=10`, `PET_REVIEW_CRON_SECRET` y opcionalmente `GEMINI_API_KEY`.
