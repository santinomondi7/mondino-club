-- =============================================================================
-- MONDINO CLUB — FARMACIA Y PERFUMERÍA MONDINO
-- Migración 002: Configuración Base y Catálogo Inicial (No destructiva)
-- =============================================================================

INSERT INTO public.app_settings (
  id,
  club_name,
  club_subtitle,
  logo_url,
  primary_color,
  secondary_color,
  accent_color,
  base_points_rate_locked,
  birthday_bonus_points,
  referrer_bonus_points,
  referred_bonus_points,
  notifications_enabled,
  whatsapp_contact,
  address,
  opening_hours
) VALUES (
  'mondino-global-settings',
  'Mondino Club',
  'Farmacia y Perfumería Mondino',
  '/images/hero_perfumery_banner.jpg',
  '#064E3B',
  '#0F766E',
  '#D97706',
  100,
  200,
  150,
  100,
  true,
  '+54 9 3492 42-0000',
  'Av. Santa Fe 1250, Rafaela, Santa Fe',
  'Lun a Sáb de 08:00 a 21:00 hs'
)
ON CONFLICT (id) DO NOTHING;

-- Promociones Iniciales
INSERT INTO public.promotions (
  id,
  title,
  description,
  image_url,
  category,
  promo_type,
  multiplier,
  extra_points,
  min_purchase_amount,
  start_date,
  end_date,
  usage_limit,
  current_usages,
  is_active,
  terms_conditions
) VALUES
(
  'promo-dermo-x2',
  'Semana Dermocosmética: Puntos x2',
  'Duplicá tus puntos base en todas las líneas de cuidado facial, serums y fotoprotección dermatológica.',
  '/images/news_dermocosmetics_event.jpg',
  'Dermocosmética',
  'MULTIPLICADOR',
  2.00,
  0,
  15000,
  '2025-01-01',
  '2027-12-31',
  500,
  0,
  true,
  'Válido en compras superiores a $15.000 presentando QR de Mondino Club.'
),
(
  'promo-perfumeria-plus150',
  'Especial Fragancias Selectivas (+150 pts)',
  'Sumá 150 puntos extra adicionales al 1% base comprando fragancias importadas seleccionadas.',
  '/images/hero_perfumery_banner.jpg',
  'Perfumería',
  'PUNTOS_EXTRA',
  1.00,
  150,
  40000,
  '2025-01-01',
  '2027-12-31',
  300,
  0,
  true,
  'Acumulable con la regla base permanente ($100 = 1 punto).'
)
ON CONFLICT (id) DO NOTHING;

-- Beneficios Iniciales
INSERT INTO public.benefits (
  id,
  title,
  description,
  image_url,
  points_required,
  category,
  start_date,
  end_date,
  is_active,
  usage_limit,
  stock_available,
  terms_conditions
) VALUES
(
  'ben-kit-skincare',
  'Kit Rutina Hidratación Termal + Neceser Mondino',
  'Incluye agua termal 150ml, emulsión hidratante hipoalergénica y neceser exclusivo de Farmacia Mondino.',
  '/images/benefit_skincare_kit.jpg',
  450,
  'Dermocosmética',
  '2025-01-01',
  '2027-12-31',
  true,
  100,
  25,
  'Presentar código único de canje y DNI en mostrador.'
),
(
  'ben-voucher-perfumeria',
  'Voucher $15.000 en Perfumería Selectiva',
  'Descuento directo sobre fragancias importadas y cofres de regalo en sucursal.',
  '/images/benefit_fragrance_voucher.jpg',
  600,
  'Perfumería',
  '2025-01-01',
  '2027-12-31',
  true,
  100,
  40,
  'Válido para compras superiores a $50.000 en el sector Perfumería.'
),
(
  'ben-cuidado-capilar',
  'Set Reparación Capilar Intensiva Profesional',
  'Shampoo + máscara nutritiva con óleo de argán y keratina dermatológicamente testeada.',
  '/images/benefit_skincare_kit.jpg',
  320,
  'Cuidado Personal',
  '2025-01-01',
  '2027-12-31',
  true,
  100,
  30,
  'Sujeto a disponibilidad de stock en sucursal.'
)
ON CONFLICT (id) DO NOTHING;

-- Novedades Iniciales
INSERT INTO public.news (
  id,
  title,
  summary,
  description,
  image_url,
  category,
  is_published,
  published_at,
  created_by
) VALUES
(
  'news-diagnostico-piel',
  'Jornada de Diagnóstico Dermo-Facial Sin Cargo para Socios',
  'Reservá tu turno con nuestras especialistas en dermocosmética y descubrí tu rutina ideal.',
  'Durante todo el mes en Farmacia y Perfumería Mondino realizamos análisis dermo-facial digital para socios de Mondino Club. Además, todas tus compras en el sector suman puntos automáticamente presentando tu QR personal.',
  '/images/news_dermocosmetics_event.jpg',
  'Eventos',
  true,
  '2025-05-01',
  'Farmacia y Perfumería Mondino'
),
(
  'news-fragancias-temporada',
  'Nuevas Fragancias Internacionales en Perfumería Mondino',
  'Conocé los lanzamientos exclusivos de temporada y multiplicá tus puntos.',
  'Ya ingresaron las nuevas colecciones de eau de parfum importados. Acercate a nuestro espacio de perfumería para probarlas y acumular puntos con cada compra ($100 = 1 punto garantizado).',
  '/images/hero_perfumery_banner.jpg',
  'Lanzamientos',
  true,
  '2025-05-10',
  'Farmacia y Perfumería Mondino'
)
ON CONFLICT (id) DO NOTHING;
