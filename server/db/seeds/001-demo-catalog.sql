-- Seed 001: Catálogo de Demostración (1 Feria, 2 Cafés, 1 Plan con Opciones, Paradas y Votos)

-- 1. Usuarios demo
INSERT INTO users (id, name, email, password_hash, role, gps_trust_score)
VALUES 
('usr_organizer_1', 'Valeria Solís', 'valeria@ejemplo.cr', '$2b$10$ephemeral_hash_organizer_demo_cr_2026', 'organizer', 95),
('usr_admin_1', 'Admin Sistema SN', 'admin@ejemplo.cr', '$2b$10$ephemeral_hash_admin_demo_cr_2026', 'admin', 100),
('usr_client_1', 'Carlos Alvarado', 'carlos@ejemplo.cr', '$2b$10$ephemeral_hash_client_demo_cr_2026', 'client', 80)
ON CONFLICT (id) DO NOTHING;

-- 2. Lugares (Feria + 2 Cafés con atributos verificados)
INSERT INTO places (id, name, category, lat, lng, address, district, canton, phone, schedule_info, price_level, verified_by_admin, attributes_metadata)
VALUES
(
  'plc_feria_1',
  'Feria del Agricultor y Artesanos de Ciudad Colón',
  'feria',
  9.9152340,
  -84.2415120,
  'Costado Norte del Parque Central de Mora',
  'Colón',
  'Mora',
  '+506 2249-1122',
  'Sábados de 6:00 AM a 2:00 PM',
  '$',
  1,
  '{"pet_friendly":{"verified":true,"source":"admin_audit","verified_at":"2026-11-10T12:00:00Z"},"ley_7600_ramp":{"verified":true,"source":"municipalidad_mora","verified_at":"2026-11-01T08:00:00Z"},"sinpe_movil":{"verified":true,"source":"cooperativa_feria","verified_at":"2026-11-12T00:00:00Z"}}'
),
(
  'plc_cafe_1',
  'Café Montaña Verde Specialty',
  'cafe',
  9.9168900,
  -84.2431000,
  '150m Oeste del Mercado Municipal',
  'Colón',
  'Mora',
  '+506 2249-8899',
  'Martes a Domingo 7:00 AM a 7:00 PM',
  '$$',
  1,
  '{"v60_chemex":{"verified":true,"source":"barista_staff","verified_at":"2026-11-11T14:30:00Z"},"pet_friendly":{"verified":true,"source":"admin_audit","verified_at":"2026-11-05T10:00:00Z"},"quiet_wifi":{"verified":true,"source":"client_reviews","verified_at":"2026-11-08T16:00:00Z"}}'
),
(
  'plc_cafe_2',
  'Café Aromas del Valle',
  'cafe',
  9.9135000,
  -84.2389000,
  'Entrada a Brasil de Mora, contiguo a la plaza',
  'Brasil',
  'Mora',
  '+506 2249-3344',
  'Todos los días 8:00 AM a 8:00 PM',
  '$$',
  1,
  '{"terrace_shade":{"verified":true,"source":"admin_audit","verified_at":"2026-11-09T11:00:00Z"},"sinpe_movil":{"verified":true,"source":"admin_audit","verified_at":"2026-11-09T11:00:00Z"},"parking_free":{"verified":true,"source":"admin_audit","verified_at":"2026-11-09T11:00:00Z"}}'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Evento programado: La edición semanal de la Feria
INSERT INTO events (id, title, description, place_id, category, status, start_time, end_time, timezone, created_by)
VALUES
(
  'evt_feria_sabado_1',
  'Edición Sabatina: Frutas Frescas y Artesanías de Mora',
  'Feria comunitaria al aire libre con frutas del valle, repostería tradicional y música instrumental acústica.',
  'plc_feria_1',
  'fair',
  'published',
  '2026-11-14T13:00:00Z', -- 7:00 AM UTC-6
  '2026-11-14T18:00:00Z', -- 12:00 PM UTC-6
  'America/Costa_Rica',
  'usr_admin_1'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Plan de prueba compartible
INSERT INTO plans (id, code, title, organizer_id, status, revision, selected_option_id, timezone, budget_crc)
VALUES
(
  'pln_demo_1',
  'PLAN-CR-772',
  'Sábado de Feria Orgánica y Café de Especialidad',
  'usr_organizer_1',
  'active',
  1,
  'opt_demo_1',
  'America/Costa_Rica',
  12000
)
ON CONFLICT (id) DO NOTHING;

-- 5. Opciones del plan
INSERT INTO plan_options (id, plan_id, title, option_order, status, estimated_cost_crc)
VALUES
('opt_demo_1', 'pln_demo_1', 'Opción A: Feria + Café Montaña Verde', 1, 'active', 9500),
('opt_demo_2', 'pln_demo_1', 'Opción B: Feria + Café Aromas del Valle', 2, 'active', 8500)
ON CONFLICT (id) DO NOTHING;

-- 6. Paradas ordenadas
INSERT INTO plan_stops (id, option_id, place_id, event_id, stop_order, start_time, end_time, confirmed_snapshot)
VALUES
(
  'stp_opt1_1',
  'opt_demo_1',
  'plc_feria_1',
  'evt_feria_sabado_1',
  1,
  '2026-11-14T14:00:00Z', -- 8:00 AM Costa Rica
  '2026-11-14T15:30:00Z', -- 9:30 AM Costa Rica
  '{"name":"Feria del Agricultor y Artesanos de Ciudad Colón","address":"Costado Norte del Parque Central de Mora"}'
),
(
  'stp_opt1_2',
  'opt_demo_1',
  'plc_cafe_1',
  NULL,
  2,
  '2026-11-14T15:45:00Z', -- 9:45 AM Costa Rica
  '2026-11-14T17:00:00Z', -- 11:00 AM Costa Rica
  '{"name":"Café Montaña Verde Specialty","address":"150m Oeste del Mercado Municipal"}'
),
(
  'stp_opt2_1',
  'opt_demo_2',
  'plc_feria_1',
  'evt_feria_sabado_1',
  1,
  '2026-11-14T14:00:00Z',
  '2026-11-14T15:30:00Z',
  '{"name":"Feria del Agricultor y Artesanos de Ciudad Colón","address":"Costado Norte del Parque Central de Mora"}'
),
(
  'stp_opt2_2',
  'opt_demo_2',
  'plc_cafe_2',
  NULL,
  2,
  '2026-11-14T15:45:00Z',
  '2026-11-14T17:00:00Z',
  '{"name":"Café Aromas del Valle","address":"Entrada a Brasil de Mora"}'
)
ON CONFLICT (id) DO NOTHING;

-- 7. Invitados
INSERT INTO plan_guests (id, plan_id, guest_token, name, email, phone, attendance_status)
VALUES
('gst_demo_1', 'pln_demo_1', 'tok_guest_ana_cr_991', 'Ana Brenes', 'ana.brenes@ejemplo.cr', '+506 8811-2233', 'confirmed'),
('gst_demo_2', 'pln_demo_1', 'tok_guest_diego_cr_882', 'Diego Quesada', 'diego.q@ejemplo.cr', '+506 8722-4455', 'confirmed')
ON CONFLICT (id) DO NOTHING;

-- 8. Votos (Ana vota "prefer" por Opción A; Diego vota "can" por Opción A y "cannot" por Opción B)
INSERT INTO plan_votes (id, plan_id, guest_id, option_id, vote_type)
VALUES
('vot_1', 'pln_demo_1', 'gst_demo_1', 'opt_demo_1', 'prefer'),
('vot_2', 'pln_demo_1', 'gst_demo_2', 'opt_demo_1', 'can'),
('vot_3', 'pln_demo_1', 'gst_demo_2', 'opt_demo_2', 'cannot')
ON CONFLICT (plan_id, guest_id, option_id) DO UPDATE SET vote_type = EXCLUDED.vote_type, updated_at = CURRENT_TIMESTAMP;

-- 9. Historial inicial
INSERT INTO plan_history (id, plan_id, revision, change_type, snapshot, actor_id)
VALUES
(
  'his_demo_1',
  'pln_demo_1',
  1,
  'created',
  '{"code":"PLAN-CR-772","title":"Sábado de Feria Orgánica y Café de Especialidad","selected_option_id":"opt_demo_1","revision":1}',
  'usr_organizer_1'
)
ON CONFLICT (id) DO NOTHING;

