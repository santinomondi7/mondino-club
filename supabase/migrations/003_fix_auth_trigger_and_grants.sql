-- =============================================================================
-- MONDINO CLUB — PARCHE DE ALINEACIÓN DE REGLAS Y PERMISOS EN SUPABASE
-- Ejecutá este bloque en el SQL Editor de tu proyecto Supabase si ya corriste 001
-- =============================================================================

CREATE OR REPLACE FUNCTION public.gen_random_bytes(integer)
RETURNS bytea
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT extensions.gen_random_bytes($1);
$$;

-- Alinear restricciones y valores únicos de verdad en public.app_settings:
-- Regla base: $1.000 = 1 punto
-- Cumpleaños: 20 puntos | Invitar amigo: 15 puntos | Unirse con código: 10 puntos
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_base_points_rate_locked_check;
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_birthday_bonus_points_check;
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_referrer_bonus_points_check;
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_referred_bonus_points_check;

ALTER TABLE public.app_settings ALTER COLUMN base_points_rate_locked SET DEFAULT 1000;
ALTER TABLE public.app_settings ALTER COLUMN birthday_bonus_points SET DEFAULT 20;
ALTER TABLE public.app_settings ALTER COLUMN referrer_bonus_points SET DEFAULT 15;
ALTER TABLE public.app_settings ALTER COLUMN referred_bonus_points SET DEFAULT 10;

UPDATE public.app_settings
SET
  base_points_rate_locked = 1000,
  birthday_bonus_points = 20,
  referrer_bonus_points = 15,
  referred_bonus_points = 10,
  updated_at = now()
WHERE id = 'mondino-global-settings';

ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_base_points_rate_locked_check CHECK (base_points_rate_locked = 1000),
  ADD CONSTRAINT app_settings_birthday_bonus_points_check CHECK (birthday_bonus_points = 20),
  ADD CONSTRAINT app_settings_referrer_bonus_points_check CHECK (referrer_bonus_points = 15),
  ADD CONSTRAINT app_settings_referred_bonus_points_check CHECK (referred_bonus_points = 10);

DROP POLICY IF EXISTS "app_settings_update_admin" ON public.app_settings;
CREATE POLICY "app_settings_update_admin" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (
    public.is_active_admin()
    AND base_points_rate_locked = 1000
    AND birthday_bonus_points = 20
    AND referrer_bonus_points = 15
    AND referred_bonus_points = 10
  );

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
