-- ==============================================================================
-- Sinergia Urbana Costa Rica — Datos Demo para Desarrollo en Supabase
-- ==============================================================================

SET search_path TO app_private, public;

-- Usuarios de prueba
INSERT INTO app_private.users (id, name, email, password_hash, role, phone)
VALUES
('usr_organizer_1', 'Daniel Ramírez', 'daniel@ejemplo.cr', 'sha256_mock_hash_for_dev_env', 'organizer', '+506 8888-1111'),
('usr_client_1', 'Luis Morales', 'luis@ejemplo.cr', 'sha256_mock_hash_for_dev_env', 'client', '+506 8888-2222'),
('usr_admin_1', 'Administrador Sistema', 'admin@sinergia.cr', 'sha256_mock_hash_for_dev_env', 'admin', '+506 8888-9999')
ON CONFLICT (id) DO NOTHING;

-- Catálogo de Lugares Semilla en Costa Rica (Feria + Cafés de Especialidad)
INSERT INTO app_private.places (
    id, name, category, lat, lng, address, district, canton, phone, schedule_info, price_level, verified_by_admin, attributes_metadata
)
VALUES
(
    'plc_feria_1',
    'Feria del Agricultor de Ciudad Colón',
    'feria',
    9.915200,
    -84.241500,
    'Costado norte de la plaza de deportes, Ciudad Colón',
    'Colón',
    'Mora',
    '+506 2249-1000',
    'Sábados de 5:00 AM a 1:00 PM',
    '$',
    TRUE,
    '{"pet_friendly": {"verified": true, "source": "muni_mora", "updated_at": "2026-11-01"}, "ley_7600_ramp": {"verified": true, "source": "inspeccion_urbana", "updated_at": "2026-11-01"}, "sinpe_movil": {"verified": true, "source": "asopro_mora", "updated_at": "2026-11-01"}}'::jsonb
),
(
    'plc_cafe_1',
    'Café de Especialidad El Roble',
    'cafe',
    9.914800,
    -84.242100,
    '100 metros oeste de la Iglesia Católica, Ciudad Colón',
    'Colón',
    'Mora',
    '+506 2249-5555',
    'Lunes a Domingo 7:00 AM a 7:00 PM',
    '$$',
    TRUE,
    '{"pet_friendly": {"verified": true, "source": "comercio", "updated_at": "2026-11-05"}, "ley_7600_ramp": {"verified": true, "source": "inspeccion_urbana", "updated_at": "2026-11-05"}, "sinpe_movil": {"verified": true, "source": "banco_central", "updated_at": "2026-11-05"}, "specialty_coffee": {"verified": true, "varietals": ["Geisha", "Caturra"], "source": "icafe"}}'::jsonb
),
(
    'plc_cafe_2',
    'Café Montaña Verde Alternativa Techada',
    'cafe',
    9.916100,
    -84.240800,
    'Frente a la Cruz Roja, Ciudad Colón',
    'Colón',
    'Mora',
    '+506 2249-7777',
    'Martes a Domingo 8:00 AM a 8:00 PM',
    '$$',
    TRUE,
    '{"indoor_seating": {"verified": true, "source": "inspeccion_urbana"}, "sinpe_movil": {"verified": true, "source": "comercio"}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Evento Programado (Feria Sábado)
INSERT INTO app_private.events (
    id, place_id, title, description, start_time, end_time, status, category, is_indoor, weather_sensitive
)
VALUES
(
    'evt_feria_sabado_1',
    'plc_feria_1',
    'Edición Especial de la Feria del Agricultor y Artesanos de Mora',
    'Venta directa de productores locales, verduras orgánicas, quesos artesanales y música en vivo.',
    '2026-11-14 06:00:00-06',
    '2026-11-14 13:00:00-06',
    'published',
    'feria',
    FALSE,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Plan Grupal Demo
INSERT INTO app_private.plans (
    id, code, title, organizer_id, organizer_email, status, revision, budget_crc, selected_option_id
)
VALUES
(
    'plan_demo_1',
    'PLAN-CR-772',
    'Salida Sabatina: Feria del Agricultor y Café de Especialidad',
    'usr_organizer_1',
    'daniel@ejemplo.cr',
    'active',
    1,
    18000,
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- Opciones del Plan Demo
INSERT INTO app_private.plan_options (id, plan_id, title, estimated_cost_crc)
VALUES
('opt_demo_1', 'plan_demo_1', 'Opción A: Recorrido Completo Feria + Desayuno y Café El Roble', 8500),
('opt_demo_2', 'plan_demo_1', 'Opción B: Solo Café y Tertulia Techada en Montaña Verde', 5000)
ON CONFLICT (id) DO NOTHING;

-- Paradas
INSERT INTO app_private.plan_stops (id, option_id, place_id, event_id, stop_order, start_time, end_time, place_name_snapshot, place_address_snapshot)
VALUES
('stp_demo_1', 'opt_demo_1', 'plc_feria_1', 'evt_feria_sabado_1', 1, '2026-11-14 08:00:00-06', '2026-11-14 09:30:00-06', 'Feria del Agricultor de Ciudad Colón', 'Costado norte de la plaza'),
('stp_demo_2', 'opt_demo_1', 'plc_cafe_1', NULL, 2, '2026-11-14 09:45:00-06', '2026-11-14 11:00:00-06', 'Café de Especialidad El Roble', '100m oeste de la Iglesia')
ON CONFLICT (id) DO NOTHING;

