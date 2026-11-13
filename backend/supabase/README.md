# Recursos y Scripts de Supabase para Sinergia Urbana

Este directorio contiene los archivos necesarios para inicializar y configurar el proyecto en **Supabase Cloud**:

- **`supabase-esquema-mvp.sql`**: Migración DDL inicial para el esquema `app_private` con soporte de Row Level Security (RLS) e índices de rendimiento.
- **`supabase-datos-demo.sql`**: Catálogo semilla de desarrollo (Feria del Agricultor de Ciudad Colón, Café El Roble, Café Montaña Verde y Plan Grupal de prueba).
- **`supabase.env.example`**: Plantilla de variables de entorno para conectar Express a Supabase PostgreSQL y Supabase Auth.

### Instrucciones de Aplicación:
1. Abrir el proyecto en [Supabase Dashboard](https://supabase.com/dashboard/project/hnnnreowlbtqqjhpmdvd).
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase-esquema-mvp.sql`.
3. (Opcional en desarrollo) Ejecutar `supabase-datos-demo.sql`.
4. Copiar las credenciales del pooler a `backend/.env`.
