-- =============================================================================
-- MONDINO CLUB — FARMACIA Y PERFUMERÍA MONDINO
-- Migración 001: Esquema Relacional, Permisos, Triggers, Políticas RLS y RPCs
-- Regla Base Permanente e Inmutable: $100 ARS gastados = 1 punto (1%)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Wrapper compatible con search_path = public cuando pgcrypto reside en schema extensions (Supabase)
CREATE OR REPLACE FUNCTION public.gen_random_bytes(integer)
RETURNS bytea
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT extensions.gen_random_bytes($1);
$$;


-- -----------------------------------------------------------------------------
-- 1. TABLA DE CONFIGURACIÓN GLOBAL (Regla base 100 bloqueada por CHECK)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  id text PRIMARY KEY DEFAULT 'mondino-global-settings' CHECK (id = 'mondino-global-settings'),
  club_name text NOT NULL DEFAULT 'Mondino Club',
  club_subtitle text NOT NULL DEFAULT 'Farmacia y Perfumería Mondino',
  logo_url text NOT NULL DEFAULT '/images/hero_perfumery_banner.jpg',
  primary_color text NOT NULL DEFAULT '#064E3B',
  secondary_color text NOT NULL DEFAULT '#0F766E',
  accent_color text NOT NULL DEFAULT '#D97706',
  base_points_rate_locked integer NOT NULL DEFAULT 100 CHECK (base_points_rate_locked = 100),
  birthday_bonus_points integer NOT NULL DEFAULT 200 CHECK (birthday_bonus_points >= 0 AND birthday_bonus_points <= 10000),
  referrer_bonus_points integer NOT NULL DEFAULT 150 CHECK (referrer_bonus_points >= 0 AND referrer_bonus_points <= 10000),
  referred_bonus_points integer NOT NULL DEFAULT 100 CHECK (referred_bonus_points >= 0 AND referred_bonus_points <= 10000),
  notifications_enabled boolean NOT NULL DEFAULT true,
  whatsapp_contact text NOT NULL DEFAULT '+54 9 3492 42-0000',
  address text NOT NULL DEFAULT 'Av. Santa Fe 1250, Rafaela, Santa Fe',
  opening_hours text NOT NULL DEFAULT 'Lun a Sáb de 08:00 a 21:00 hs',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. TABLA DE PERFILES DE USUARIO (Vinculada a auth.users de Supabase Auth)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL DEFAULT 'Cliente',
  last_name text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  birth_date text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'CLIENTE' CHECK (role IN ('CLIENTE', 'EMPLEADO', 'ADMINISTRADOR')),
  status text NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'SUSPENDIDO')),
  qr_token text UNIQUE NOT NULL,
  referral_code text UNIQUE NOT NULL,
  referred_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  birthday_bonus_claimed_year integer,
  notification_preferences jsonb NOT NULL DEFAULT '{"promotions":true,"benefits":true,"expiring":true,"birthday":true,"news":true}'::jsonb,
  points_balance integer NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_qr_token ON public.profiles(qr_token);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- -----------------------------------------------------------------------------
-- 3. TABLA DE EMPLEADOS AUTORIZADOS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_code text UNIQUE NOT NULL,
  position text NOT NULL DEFAULT 'Atención en Mostrador',
  branch text NOT NULL DEFAULT 'Casa Central Mondino',
  can_register_purchases boolean NOT NULL DEFAULT true,
  can_manage_redemptions boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  authorized_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. TABLA DE PROMOCIONES CONFIGURABLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotions (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL DEFAULT '/images/hero_perfumery_banner.jpg',
  category text NOT NULL DEFAULT 'Todos',
  promo_type text NOT NULL DEFAULT 'MULTIPLICADOR' CHECK (promo_type IN ('MULTIPLICADOR', 'PUNTOS_EXTRA', 'DESCUENTO_COMERCIAL')),
  multiplier numeric(10, 2) NOT NULL DEFAULT 1 CHECK (multiplier >= 1 AND multiplier <= 20),
  extra_points integer NOT NULL DEFAULT 0 CHECK (extra_points >= 0 AND extra_points <= 50000),
  min_purchase_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (min_purchase_amount >= 0),
  start_date text NOT NULL,
  end_date text NOT NULL,
  usage_limit integer NOT NULL DEFAULT 0 CHECK (usage_limit >= 0),
  current_usages integer NOT NULL DEFAULT 0 CHECK (current_usages >= 0),
  is_active boolean NOT NULL DEFAULT true,
  terms_conditions text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5. TABLA DE COMPRAS VERIFICADAS EN MOSTRADOR
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchases (
  id text PRIMARY KEY,
  idempotency_key text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0 AND amount <= 50000000),
  category text NOT NULL,
  base_points integer NOT NULL CHECK (base_points >= 0),
  promo_points integer NOT NULL DEFAULT 0 CHECK (promo_points >= 0),
  total_points integer NOT NULL CHECK (total_points >= 0 AND total_points = base_points + promo_points),
  promotion_id text REFERENCES public.promotions(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'COMPLETADA' CHECK (status IN ('COMPLETADA', 'ANULADA')),
  voided_reason text,
  voided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  voided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_customer_id ON public.purchases(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_employee_id ON public.purchases(employee_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 6. LIBRO MAYOR INMUTABLE DE TRANSACCIONES DE PUNTOS (LEDGER)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.points_transactions (
  id text PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  purchase_id text REFERENCES public.purchases(id) ON DELETE SET NULL,
  promotion_id text REFERENCES public.promotions(id) ON DELETE SET NULL,
  amount integer NOT NULL CHECK (amount <> 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  type text NOT NULL CHECK (
    type IN (
      'COMPRA_BASE',
      'PROMOCION_COMPRA',
      'CANJE_BENEFICIO',
      'AJUSTE_MANUAL',
      'BONUS_CUMPLEANOS',
      'BONUS_REFERIDO',
      'ANULACION_COMPRA'
    )
  ),
  description text NOT NULL,
  idempotency_key text UNIQUE NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_tx_customer_id ON public.points_transactions(customer_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 7. CATÁLOGO DE BENEFICIOS Y RECOMPENSAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.benefits (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL DEFAULT '/images/benefit_skincare_kit.jpg',
  points_required integer NOT NULL CHECK (points_required > 0 AND points_required <= 1000000),
  category text NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  usage_limit integer NOT NULL DEFAULT 0 CHECK (usage_limit >= 0),
  stock_available integer NOT NULL DEFAULT 0 CHECK (stock_available >= 0),
  terms_conditions text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 8. CANJES DE BENEFICIOS (Con código único e idempotencia)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.benefit_redemptions (
  id text PRIMARY KEY,
  benefit_id text NOT NULL REFERENCES public.benefits(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  points_spent integer NOT NULL CHECK (points_spent > 0),
  redemption_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'DISPONIBLE' CHECK (status IN ('DISPONIBLE', 'RESERVADO', 'UTILIZADO', 'VENCIDO', 'CANCELADO')),
  used_at timestamptz,
  used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at text NOT NULL,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_customer_id ON public.benefit_redemptions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_code ON public.benefit_redemptions(redemption_code);

-- -----------------------------------------------------------------------------
-- 9. NOVEDADES Y NOTICIAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.news (
  id text PRIMARY KEY,
  title text NOT NULL,
  summary text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL DEFAULT '/images/news_dermocosmetics_event.jpg',
  category text NOT NULL DEFAULT 'Novedades',
  is_published boolean NOT NULL DEFAULT true,
  published_at text NOT NULL,
  created_by text DEFAULT 'Farmacia y Perfumería Mondino',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 10. CAMPAÑAS SEGMENTADAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id text PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  image_url text NOT NULL DEFAULT '/images/hero_perfumery_banner.jpg',
  segment text NOT NULL,
  scheduled_at text NOT NULL,
  status text NOT NULL DEFAULT 'ENVIADA' CHECK (status IN ('BORRADOR', 'PROGRAMADA', 'ENVIADA')),
  estimated_reach integer NOT NULL DEFAULT 0 CHECK (estimated_reach >= 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 11. HISTORIAL DE REFERIDOS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id text PRIMARY KEY,
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code_used text NOT NULL,
  referrer_points_awarded integer NOT NULL CHECK (referrer_points_awarded >= 0),
  referred_points_awarded integer NOT NULL CHECK (referred_points_awarded >= 0),
  status text NOT NULL DEFAULT 'ACREDITADO',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (referrer_id <> referred_id)
);

-- -----------------------------------------------------------------------------
-- 12. NOTIFICACIONES A CLIENTES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'SISTEMA',
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  action_url text NOT NULL DEFAULT '/inicio',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON public.notifications(customer_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 13. REGISTRO INMUTABLE DE AUDITORÍA (audit_logs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text PRIMARY KEY,
  actor_id text NOT NULL,
  actor_email text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- =============================================================================
-- FUNCIONES AUXILIARES DE SEGURIDAD Y GENERACIÓN DE TOKENS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_unique_qr_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_exists boolean;
BEGIN
  LOOP
    v_token := 'MND-QR-' || upper(encode(gen_random_bytes(5), 'hex'));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE qr_token = v_token) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_referral_code(p_first_name text DEFAULT 'SOCIO')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_code text;
  v_exists boolean;
BEGIN
  v_prefix := upper(regexp_replace(coalesce(p_first_name, 'SOCIO'), '[^a-zA-Z]', '', 'g'));
  IF length(v_prefix) < 3 THEN
    v_prefix := 'MND';
  ELSE
    v_prefix := substring(v_prefix FROM 1 FOR 4);
  END IF;

  LOOP
    v_code := v_prefix || '-' || upper(encode(gen_random_bytes(2), 'hex'));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'ADMINISTRADOR'
      AND status = 'ACTIVO'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('EMPLEADO', 'ADMINISTRADOR')
      AND status = 'ACTIVO'
  );
$$;

-- =============================================================================
-- TRIGGER DE PROTECCIÓN DE COLUMNAS SENSIBLES EN PROFILES
-- Impide que un cliente o empleado modifique su rol, estado, saldo o QR
-- fuera de una función atómica autorizada.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('mondino.internal_trusted_op', true) = 'true' THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Operación denegada: no tenés permisos para cambiar el rol de la cuenta.';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Operación denegada: no tenés permisos para cambiar el estado de la cuenta.';
  END IF;
  IF NEW.points_balance IS DISTINCT FROM OLD.points_balance THEN
    RAISE EXCEPTION 'Operación denegada: el saldo de puntos solo puede modificarse mediante transacciones verificadas.';
  END IF;
  IF NEW.qr_token IS DISTINCT FROM OLD.qr_token THEN
    RAISE EXCEPTION 'Operación denegada: el token QR personal es inmutable.';
  END IF;
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'Operación denegada: el código de referido propio es inmutable.';
  END IF;
  IF NEW.referred_by_id IS DISTINCT FROM OLD.referred_by_id THEN
    RAISE EXCEPTION 'Operación denegada: la vinculación de referido solo se procesa mediante apply_referral_code_atomic.';
  END IF;
  IF NEW.birthday_bonus_claimed_year IS DISTINCT FROM OLD.birthday_bonus_claimed_year THEN
    RAISE EXCEPTION 'Operación denegada: el registro de cumpleaños solo se procesa mediante claim_birthday_bonus_atomic.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- =============================================================================
-- TRIGGER AUTOMÁTICO DE ALTA DE CLIENTE EN SUPABASE AUTH
-- Todo usuario nuevo que inicia sesión con Google se registra siempre como CLIENTE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_avatar text;
BEGIN
  v_full_name := trim(coalesce(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(coalesce(NEW.email, 'Cliente'), '@', 1)
  ));
  v_first_name := split_part(v_full_name, ' ', 1);
  v_last_name := trim(substring(v_full_name FROM length(v_first_name) + 1));
  v_avatar := coalesce(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '');

  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    role,
    status,
    qr_token,
    referral_code,
    points_balance
  ) VALUES (
    NEW.id,
    coalesce(NEW.email, ''),
    coalesce(nullif(v_first_name, ''), 'Cliente'),
    coalesce(v_last_name, ''),
    v_avatar,
    'CLIENTE',
    'ACTIVO',
    public.generate_unique_qr_token(),
    public.generate_unique_referral_code(v_first_name),
    0
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- =============================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS) Y PERMISOS DE COLUMNA
-- =============================================================================

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefit_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Restringir privilegios directos de tabla para anon y authenticated
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (first_name, last_name, phone, birth_date, notification_preferences, updated_at) ON public.profiles TO authenticated;

REVOKE ALL ON public.purchases FROM anon, authenticated;
GRANT SELECT ON public.purchases TO authenticated;

REVOKE ALL ON public.points_transactions FROM anon, authenticated;
GRANT SELECT ON public.points_transactions TO authenticated;

REVOKE ALL ON public.benefit_redemptions FROM anon, authenticated;
GRANT SELECT ON public.benefit_redemptions TO authenticated;

REVOKE ALL ON public.referrals FROM anon, authenticated;
GRANT SELECT ON public.referrals TO authenticated;

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT, UPDATE (is_read) ON public.notifications TO authenticated;

REVOKE ALL ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;

GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotions TO authenticated;

GRANT SELECT ON public.benefits TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.benefits TO authenticated;

GRANT SELECT ON public.news TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.news TO authenticated;

GRANT SELECT ON public.campaigns TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;

GRANT SELECT ON public.employees TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.employees TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- Políticas para app_settings
DROP POLICY IF EXISTS "app_settings_select_all" ON public.app_settings;
CREATE POLICY "app_settings_select_all" ON public.app_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "app_settings_update_admin" ON public.app_settings;
CREATE POLICY "app_settings_update_admin" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin() AND base_points_rate_locked = 100);

-- Políticas para profiles
DROP POLICY IF EXISTS "profiles_select_own_or_staff" ON public.profiles;
CREATE POLICY "profiles_select_own_or_staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_active_staff_or_admin());

DROP POLICY IF EXISTS "profiles_update_own_safe" ON public.profiles;
CREATE POLICY "profiles_update_own_safe" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND status = 'ACTIVO')
  WITH CHECK (id = auth.uid() AND status = 'ACTIVO');

-- Políticas para employees
DROP POLICY IF EXISTS "employees_select_staff" ON public.employees;
CREATE POLICY "employees_select_staff" ON public.employees
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_active_staff_or_admin());

DROP POLICY IF EXISTS "employees_write_admin" ON public.employees;
CREATE POLICY "employees_write_admin" ON public.employees
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Políticas para promotions
DROP POLICY IF EXISTS "promotions_select_all" ON public.promotions;
CREATE POLICY "promotions_select_all" ON public.promotions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "promotions_write_admin" ON public.promotions;
CREATE POLICY "promotions_write_admin" ON public.promotions
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Políticas para benefits
DROP POLICY IF EXISTS "benefits_select_all" ON public.benefits;
CREATE POLICY "benefits_select_all" ON public.benefits
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "benefits_write_admin" ON public.benefits;
CREATE POLICY "benefits_write_admin" ON public.benefits
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Políticas para news
DROP POLICY IF EXISTS "news_select_all" ON public.news;
CREATE POLICY "news_select_all" ON public.news
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "news_write_admin" ON public.news;
CREATE POLICY "news_write_admin" ON public.news
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Políticas para purchases
DROP POLICY IF EXISTS "purchases_select_own_or_staff" ON public.purchases;
CREATE POLICY "purchases_select_own_or_staff" ON public.purchases
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.is_active_staff_or_admin());

-- Políticas para points_transactions
DROP POLICY IF EXISTS "points_tx_select_own_or_staff" ON public.points_transactions;
CREATE POLICY "points_tx_select_own_or_staff" ON public.points_transactions
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.is_active_staff_or_admin());

-- Políticas para benefit_redemptions
DROP POLICY IF EXISTS "redemptions_select_own_or_staff" ON public.benefit_redemptions;
CREATE POLICY "redemptions_select_own_or_staff" ON public.benefit_redemptions
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.is_active_staff_or_admin());

-- Políticas para referrals
DROP POLICY IF EXISTS "referrals_select_own_or_admin" ON public.referrals;
CREATE POLICY "referrals_select_own_or_admin" ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_active_admin());

-- Políticas para notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Políticas para campaigns
DROP POLICY IF EXISTS "campaigns_admin_all" ON public.campaigns;
CREATE POLICY "campaigns_admin_all" ON public.campaigns
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Políticas para audit_logs
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_active_admin());

-- =============================================================================
-- FUNCIONES TRANSACCIONALES ATÓMICAS (RPCs)
-- =============================================================================

-- 1. Asegurar perfil del usuario autenticado (con rol CLIENTE por defecto)
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user record;
  v_profile public.profiles;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_avatar text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No hay una sesión autenticada activa.';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF FOUND THEN
    RETURN v_profile;
  END IF;

  SELECT id, email, raw_user_meta_data INTO v_user FROM auth.users WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario de autenticación no encontrado.';
  END IF;

  v_full_name := trim(coalesce(
    v_user.raw_user_meta_data->>'full_name',
    v_user.raw_user_meta_data->>'name',
    split_part(coalesce(v_user.email, 'Cliente'), '@', 1)
  ));
  v_first_name := split_part(v_full_name, ' ', 1);
  v_last_name := trim(substring(v_full_name FROM length(v_first_name) + 1));
  v_avatar := coalesce(v_user.raw_user_meta_data->>'avatar_url', v_user.raw_user_meta_data->>'picture', '');

  PERFORM set_config('mondino.internal_trusted_op', 'true', true);

  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    role,
    status,
    qr_token,
    referral_code,
    points_balance
  ) VALUES (
    v_uid,
    coalesce(v_user.email, ''),
    coalesce(nullif(v_first_name, ''), 'Cliente'),
    coalesce(v_last_name, ''),
    v_avatar,
    'CLIENTE',
    'ACTIVO',
    public.generate_unique_qr_token(),
    public.generate_unique_referral_code(v_first_name),
    0
  )
  RETURNING * INTO v_profile;

  INSERT INTO public.notifications (
    id,
    customer_id,
    type,
    title,
    message,
    is_read,
    action_url
  ) VALUES (
    'notif-' || encode(gen_random_bytes(6), 'hex'),
    v_uid,
    'BIENVENIDA',
    '¡Bienvenido/a a Mondino Club!',
    'Tu tarjeta digital y tu código QR personal ya están activos. Sumás 1 punto por cada $100 en tus compras.',
    false,
    '/mi-qr'
  );

  RETURN v_profile;
END;
$$;

-- 2. Actualizar únicamente campos permitidos del propio perfil
CREATE OR REPLACE FUNCTION public.update_my_profile_safe(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_birth_date text,
  p_notification_preferences jsonb
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida.';
  END IF;

  IF trim(coalesce(p_first_name, '')) = '' THEN
    RAISE EXCEPTION 'El nombre es obligatorio.';
  END IF;

  UPDATE public.profiles
  SET
    first_name = trim(p_first_name),
    last_name = trim(coalesce(p_last_name, '')),
    phone = trim(coalesce(p_phone, '')),
    birth_date = trim(coalesce(p_birth_date, '')),
    notification_preferences = coalesce(p_notification_preferences, notification_preferences),
    updated_at = now()
  WHERE id = v_uid AND status = 'ACTIVO'
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo actualizar el perfil o la cuenta se encuentra suspendida.';
  END IF;

  RETURN v_profile;
END;
$$;

-- 3. Validar QR o email del cliente para personal autorizado en mostrador
CREATE OR REPLACE FUNCTION public.validate_qr_for_staff(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean text := trim(coalesce(p_query, ''));
  v_client public.profiles;
  v_user_part text;
  v_domain_part text;
  v_masked_email text;
BEGIN
  IF NOT public.is_active_staff_or_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: solo empleados autorizados o administradores pueden validar códigos QR.';
  END IF;

  IF v_clean = '' THEN
    RAISE EXCEPTION 'Ingresá un código QR o correo electrónico válido.';
  END IF;

  SELECT * INTO v_client
  FROM public.profiles
  WHERE upper(qr_token) = upper(v_clean)
     OR lower(email) = lower(v_clean)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró ningún socio registrado con ese código QR o email.';
  END IF;

  IF v_client.status <> 'ACTIVO' THEN
    RAISE EXCEPTION 'La cuenta del socio (%) se encuentra suspendida.', v_client.email;
  END IF;

  v_user_part := split_part(v_client.email, '@', 1);
  v_domain_part := split_part(v_client.email, '@', 2);
  IF length(v_user_part) <= 3 THEN
    v_masked_email := substring(v_user_part FROM 1 FOR 1) || '***@' || v_domain_part;
  ELSE
    v_masked_email := substring(v_user_part FROM 1 FOR 3) || '***' || substring(v_user_part FROM length(v_user_part) FOR 1) || '@' || v_domain_part;
  END IF;

  RETURN jsonb_build_object(
    'id', v_client.id,
    'firstName', v_client.first_name,
    'lastName', v_client.last_name,
    'fullName', trim(v_client.first_name || ' ' || v_client.last_name),
    'email', v_client.email,
    'maskedEmail', v_masked_email,
    'qrToken', v_client.qr_token,
    'pointsBalance', v_client.points_balance,
    'status', v_client.status,
    'birthDate', v_client.birth_date
  );
END;
$$;

-- 4. Cálculo y Previsualización de Puntos en Backend (Regla Inmutable: $100 = 1 punto)
CREATE OR REPLACE FUNCTION public.preview_purchase_points(
  p_amount numeric,
  p_category text,
  p_promotion_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_points integer;
  v_promo_points integer := 0;
  v_best_promo public.promotions;
  v_candidate public.promotions;
  v_candidate_bonus integer;
  v_today text := to_char( current_date, 'YYYY-MM-DD' );
  v_applied_json jsonb := NULL;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 50000000 THEN
    RAISE EXCEPTION 'El importe de la compra debe ser mayor a $0.';
  END IF;

  -- REGLA BASE PERMANENTE E INMUTABLE: $100 gastados = 1 punto
  v_base_points := floor(p_amount / 100.0)::integer;

  IF p_promotion_id IS NOT NULL AND trim(p_promotion_id) <> '' THEN
    SELECT * INTO v_best_promo
    FROM public.promotions
    WHERE id = trim(p_promotion_id)
      AND is_active = true
      AND start_date <= v_today
      AND end_date >= v_today
      AND p_amount >= min_purchase_amount
      AND (category = 'Todos' OR lower(category) = lower(coalesce(p_category, 'Todos')))
      AND (usage_limit = 0 OR current_usages < usage_limit);

    IF FOUND THEN
      IF v_best_promo.promo_type = 'MULTIPLICADOR' THEN
        v_promo_points := greatest(0, round(v_base_points * (v_best_promo.multiplier - 1))::integer);
      ELSIF v_best_promo.promo_type = 'PUNTOS_EXTRA' THEN
        v_promo_points := greatest(0, v_best_promo.extra_points);
      END IF;
    END IF;
  ELSE
    FOR v_candidate IN
      SELECT *
      FROM public.promotions
      WHERE is_active = true
        AND start_date <= v_today
        AND end_date >= v_today
        AND p_amount >= min_purchase_amount
        AND (category = 'Todos' OR lower(category) = lower(coalesce(p_category, 'Todos')))
        AND (usage_limit = 0 OR current_usages < usage_limit)
    LOOP
      v_candidate_bonus := 0;
      IF v_candidate.promo_type = 'MULTIPLICADOR' THEN
        v_candidate_bonus := greatest(0, round(v_base_points * (v_candidate.multiplier - 1))::integer);
      ELSIF v_candidate.promo_type = 'PUNTOS_EXTRA' THEN
        v_candidate_bonus := greatest(0, v_candidate.extra_points);
      END IF;

      IF v_candidate_bonus > v_promo_points THEN
        v_promo_points := v_candidate_bonus;
        v_best_promo := v_candidate;
      END IF;
    END LOOP;
  END IF;

  IF v_best_promo.id IS NOT NULL AND v_promo_points > 0 THEN
    v_applied_json := jsonb_build_object(
      'id', v_best_promo.id,
      'title', v_best_promo.title,
      'promoType', v_best_promo.promo_type,
      'multiplier', v_best_promo.multiplier,
      'extraPoints', v_best_promo.extra_points
    );
  END IF;

  RETURN jsonb_build_object(
    'amount', p_amount,
    'basePoints', v_base_points,
    'promoPoints', v_promo_points,
    'totalPoints', v_base_points + v_promo_points,
    'appliedPromotion', v_applied_json
  );
END;
$$;

-- 5. Registro Atómico de Compra con Clave de Idempotencia
CREATE OR REPLACE FUNCTION public.register_purchase_atomic(
  p_idempotency_key text,
  p_customer_id uuid,
  p_amount numeric,
  p_category text,
  p_promotion_id text DEFAULT NULL,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator public.profiles;
  v_customer public.profiles;
  v_existing public.purchases;
  v_preview jsonb;
  v_base_points integer;
  v_promo_points integer;
  v_total_points integer;
  v_applied_promo_id text := NULL;
  v_applied_promo_title text := NULL;
  v_purchase_id text;
  v_new_balance integer;
  v_balance_after_base integer;
BEGIN
  IF NOT public.is_active_staff_or_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: solo empleados autorizados o administradores pueden registrar compras.';
  END IF;

  SELECT * INTO v_operator FROM public.profiles WHERE id = auth.uid();

  IF trim(coalesce(p_idempotency_key, '')) = '' THEN
    RAISE EXCEPTION 'Se requiere clave de idempotencia (idempotencyKey) para registrar la compra.';
  END IF;

  -- Si la operación ya fue procesada con la misma idempotency_key, devolver resultado idempotente
  SELECT * INTO v_existing FROM public.purchases WHERE idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    SELECT * INTO v_customer FROM public.profiles WHERE id = v_existing.customer_id;
    RETURN jsonb_build_object(
      'purchaseId', v_existing.id,
      'customerName', trim(v_customer.first_name || ' ' || v_customer.last_name),
      'basePoints', v_existing.base_points,
      'promoPoints', v_existing.promo_points,
      'totalPoints', v_existing.total_points,
      'newBalance', v_customer.points_balance
    );
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 50000000 THEN
    RAISE EXCEPTION 'El importe de la compra debe ser un valor positivo válido.';
  END IF;

  -- Bloquear fila del cliente para actualización atómica
  SELECT * INTO v_customer
  FROM public.profiles
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado.';
  END IF;

  IF v_customer.status <> 'ACTIVO' THEN
    RAISE EXCEPTION 'La cuenta del cliente se encuentra suspendida.';
  END IF;

  v_preview := public.preview_purchase_points(p_amount, p_category, p_promotion_id);
  v_base_points := (v_preview->>'basePoints')::integer;
  v_promo_points := (v_preview->>'promoPoints')::integer;
  v_total_points := (v_preview->>'totalPoints')::integer;

  IF v_preview->'appliedPromotion' IS NOT NULL AND jsonb_typeof(v_preview->'appliedPromotion') = 'object' THEN
    v_applied_promo_id := v_preview->'appliedPromotion'->>'id';
    v_applied_promo_title := v_preview->'appliedPromotion'->>'title';
  END IF;

  v_purchase_id := 'pur-' || encode(gen_random_bytes(6), 'hex');
  v_balance_after_base := v_customer.points_balance + v_base_points;
  v_new_balance := v_customer.points_balance + v_total_points;

  PERFORM set_config('mondino.internal_trusted_op', 'true', true);

  INSERT INTO public.purchases (
    id,
    idempotency_key,
    customer_id,
    employee_id,
    amount,
    category,
    base_points,
    promo_points,
    total_points,
    promotion_id,
    notes,
    status
  ) VALUES (
    v_purchase_id,
    trim(p_idempotency_key),
    v_customer.id,
    v_operator.id,
    p_amount,
    coalesce(nullif(trim(p_category), ''), 'Perfumería'),
    v_base_points,
    v_promo_points,
    v_total_points,
    v_applied_promo_id,
    trim(coalesce(p_notes, '')),
    'COMPLETADA'
  );

  IF v_base_points > 0 THEN
    INSERT INTO public.points_transactions (
      id,
      customer_id,
      purchase_id,
      promotion_id,
      amount,
      balance_after,
      type,
      description,
      idempotency_key,
      created_by
    ) VALUES (
      'tx-base-' || encode(gen_random_bytes(6), 'hex'),
      v_customer.id,
      v_purchase_id,
      NULL,
      v_base_points,
      v_balance_after_base,
      'COMPRA_BASE',
      'Puntos base 1% ($100 = 1 pto) — Compra en ' || coalesce(p_category, 'Farmacia'),
      trim(p_idempotency_key) || '-base',
      v_operator.email
    );
  END IF;

  IF v_promo_points > 0 THEN
    INSERT INTO public.points_transactions (
      id,
      customer_id,
      purchase_id,
      promotion_id,
      amount,
      balance_after,
      type,
      description,
      idempotency_key,
      created_by
    ) VALUES (
      'tx-promo-' || encode(gen_random_bytes(6), 'hex'),
      v_customer.id,
      v_purchase_id,
      v_applied_promo_id,
      v_promo_points,
      v_new_balance,
      'PROMOCION_COMPRA',
      'Bonificación promoción: ' || coalesce(v_applied_promo_title, 'Promoción Mondino'),
      trim(p_idempotency_key) || '-promo',
      v_operator.email
    );

    IF v_applied_promo_id IS NOT NULL THEN
      UPDATE public.promotions
      SET current_usages = current_usages + 1
      WHERE id = v_applied_promo_id;
    END IF;
  END IF;

  UPDATE public.profiles
  SET points_balance = v_new_balance, updated_at = now()
  WHERE id = v_customer.id;

  INSERT INTO public.notifications (
    id,
    customer_id,
    type,
    title,
    message,
    is_read,
    action_url
  ) VALUES (
    'notif-' || encode(gen_random_bytes(6), 'hex'),
    v_customer.id,
    'COMPRA',
    '¡Sumaste +' || v_total_points || ' puntos en Mondino Club!',
    'Acreditamos tu compra de $' || trim(to_char(p_amount, '999G999G990')) || ' en ' || coalesce(p_category, 'Farmacia') || '. Nuevo saldo: ' || v_new_balance || ' puntos.',
    false,
    '/historial'
  );

  INSERT INTO public.audit_logs (
    id,
    actor_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) VALUES (
    'aud-' || encode(gen_random_bytes(6), 'hex'),
    v_operator.id::text,
    v_operator.email,
    v_operator.role,
    'REGISTRO_COMPRA_QR',
    'purchases',
    v_purchase_id,
    'Compra registrada en mostrador ($' || p_amount || ' ARS -> +' || v_total_points || ' pts)',
    jsonb_build_object(
      'customerId', v_customer.id,
      'amount', p_amount,
      'basePoints', v_base_points,
      'promoPoints', v_promo_points,
      'totalPoints', v_total_points
    )
  );

  RETURN jsonb_build_object(
    'purchaseId', v_purchase_id,
    'customerName', trim(v_customer.first_name || ' ' || v_customer.last_name),
    'basePoints', v_base_points,
    'promoPoints', v_promo_points,
    'totalPoints', v_total_points,
    'newBalance', v_new_balance
  );
END;
$$;

-- 6. Anulación Atómica de Compra con Reversión de Puntos
CREATE OR REPLACE FUNCTION public.void_purchase_atomic(
  p_purchase_id text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor public.profiles;
  v_purchase public.purchases;
  v_customer public.profiles;
  v_new_balance integer;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: solo un administrador puede anular compras registradas.';
  END IF;

  IF trim(coalesce(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Debés indicar el motivo obligatorio de la anulación.';
  END IF;

  SELECT * INTO v_actor FROM public.profiles WHERE id = auth.uid();

  SELECT * INTO v_purchase
  FROM public.purchases
  WHERE id = trim(p_purchase_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La compra indicada no existe.';
  END IF;

  IF v_purchase.status = 'ANULADA' THEN
    RAISE EXCEPTION 'Esta compra ya fue anulada previamente.';
  END IF;

  SELECT * INTO v_customer
  FROM public.profiles
  WHERE id = v_purchase.customer_id
  FOR UPDATE;

  v_new_balance := greatest(0, v_customer.points_balance - v_purchase.total_points);

  PERFORM set_config('mondino.internal_trusted_op', 'true', true);

  UPDATE public.purchases
  SET
    status = 'ANULADA',
    voided_reason = trim(p_reason),
    voided_by = v_actor.id,
    voided_at = now()
  WHERE id = v_purchase.id;

  UPDATE public.profiles
  SET points_balance = v_new_balance, updated_at = now()
  WHERE id = v_customer.id;

  IF v_purchase.total_points > 0 THEN
    INSERT INTO public.points_transactions (
      id,
      customer_id,
      purchase_id,
      amount,
      balance_after,
      type,
      description,
      idempotency_key,
      created_by
    ) VALUES (
      'tx-void-' || encode(gen_random_bytes(6), 'hex'),
      v_customer.id,
      v_purchase.id,
      -v_purchase.total_points,
      v_new_balance,
      'ANULACION_COMPRA',
      'Anulación de compra #' || right(v_purchase.id, 6) || ': ' || trim(p_reason),
      'void-' || v_purchase.id,
      v_actor.email
    );
  END IF;

  INSERT INTO public.audit_logs (
    id,
    actor_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) VALUES (
    'aud-' || encode(gen_random_bytes(6), 'hex'),
    v_actor.id::text,
    v_actor.email,
    v_actor.role,
    'ANULACION_COMPRA',
    'purchases',
    v_purchase.id,
    trim(p_reason),
    jsonb_build_object(
      'pointsReverted', v_purchase.total_points,
      'newBalance', v_new_balance
    )
  );

  RETURN jsonb_build_object(
    'purchaseId', v_purchase.id,
    'newBalance', v_new_balance
  );
END;
$$;

-- 7. Canje Atómico de Beneficio con Código Único e Idempotencia
CREATE OR REPLACE FUNCTION public.redeem_benefit_atomic(
  p_benefit_id text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_customer public.profiles;
  v_benefit public.benefits;
  v_existing public.benefit_redemptions;
  v_redemption_id text;
  v_code text;
  v_code_exists boolean;
  v_new_balance integer;
  v_expires_at text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debés iniciar sesión para canjear beneficios.';
  END IF;

  IF trim(coalesce(p_idempotency_key, '')) <> '' THEN
    SELECT * INTO v_existing
    FROM public.benefit_redemptions
    WHERE idempotency_key = trim(p_idempotency_key) AND customer_id = v_uid;
    IF FOUND THEN
      SELECT points_balance INTO v_new_balance FROM public.profiles WHERE id = v_uid;
      RETURN jsonb_build_object(
        'redemptionId', v_existing.id,
        'redemptionCode', v_existing.redemption_code,
        'pointsSpent', v_existing.points_spent,
        'newBalance', v_new_balance,
        'expiresAt', v_existing.expires_at
      );
    END IF;
  END IF;

  SELECT * INTO v_customer
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND OR v_customer.status <> 'ACTIVO' THEN
    RAISE EXCEPTION 'Tu cuenta no se encuentra activa para realizar canjes.';
  END IF;

  SELECT * INTO v_benefit
  FROM public.benefits
  WHERE id = trim(p_benefit_id)
  FOR UPDATE;

  IF NOT FOUND OR NOT v_benefit.is_active THEN
    RAISE EXCEPTION 'El beneficio seleccionado ya no se encuentra activo.';
  END IF;

  IF v_benefit.stock_available <= 0 THEN
    RAISE EXCEPTION 'Este beneficio no tiene stock disponible en este momento.';
  END IF;

  IF v_customer.points_balance < v_benefit.points_required THEN
    RAISE EXCEPTION 'Saldo insuficiente. Necesitás % puntos y tenés % puntos disponibles.',
      v_benefit.points_required, v_customer.points_balance;
  END IF;

  LOOP
    v_code := 'MND-' || upper(encode(gen_random_bytes(3), 'hex'));
    SELECT EXISTS(SELECT 1 FROM public.benefit_redemptions WHERE redemption_code = v_code) INTO v_code_exists;
    EXIT WHEN NOT v_code_exists;
  END LOOP;

  v_redemption_id := 'red-' || encode(gen_random_bytes(6), 'hex');
  v_new_balance := v_customer.points_balance - v_benefit.points_required;
  v_expires_at := to_char(current_date + interval '30 days', 'YYYY-MM-DD');

  PERFORM set_config('mondino.internal_trusted_op', 'true', true);

  UPDATE public.benefits
  SET stock_available = stock_available - 1
  WHERE id = v_benefit.id;

  UPDATE public.profiles
  SET points_balance = v_new_balance, updated_at = now()
  WHERE id = v_customer.id;

  INSERT INTO public.benefit_redemptions (
    id,
    benefit_id,
    customer_id,
    points_spent,
    redemption_code,
    status,
    expires_at,
    idempotency_key
  ) VALUES (
    v_redemption_id,
    v_benefit.id,
    v_customer.id,
    v_benefit.points_required,
    v_code,
    'DISPONIBLE',
    v_expires_at,
    nullif(trim(coalesce(p_idempotency_key, '')), '')
  );

  INSERT INTO public.points_transactions (
    id,
    customer_id,
    amount,
    balance_after,
    type,
    description,
    idempotency_key,
    created_by
  ) VALUES (
    'tx-red-' || encode(gen_random_bytes(6), 'hex'),
    v_customer.id,
    -v_benefit.points_required,
    v_new_balance,
    'CANJE_BENEFICIO',
    'Canje de beneficio: ' || v_benefit.title || ' (Código ' || v_code || ')',
    'tx-' || v_redemption_id,
    v_customer.email
  );

  INSERT INTO public.notifications (
    id,
    customer_id,
    type,
    title,
    message,
    is_read,
    action_url
  ) VALUES (
    'notif-' || encode(gen_random_bytes(6), 'hex'),
    v_customer.id,
    'CANJE',
    'Canje confirmado: ' || v_code,
    'Presentá el código ' || v_code || ' en Farmacia y Perfumería Mondino para retirar "' || v_benefit.title || '".',
    false,
    '/beneficios'
  );

  INSERT INTO public.audit_logs (
    id,
    actor_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) VALUES (
    'aud-' || encode(gen_random_bytes(6), 'hex'),
    v_customer.id::text,
    v_customer.email,
    v_customer.role,
    'CANJE_BENEFICIO',
    'benefit_redemptions',
    v_redemption_id,
    'Canje de "' || v_benefit.title || '" por ' || v_benefit.points_required || ' puntos',
    jsonb_build_object('redemptionCode', v_code, 'pointsSpent', v_benefit.points_required)
  );

  RETURN jsonb_build_object(
    'redemptionId', v_redemption_id,
    'redemptionCode', v_code,
    'pointsSpent', v_benefit.points_required,
    'newBalance', v_new_balance,
    'expiresAt', v_expires_at
  );
END;
$$;

-- 8. Validación Atómica de Código de Canje en Mostrador (Evita doble uso)
CREATE OR REPLACE FUNCTION public.validate_redemption_for_staff(p_code text)
RETURNS public.benefit_redemptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator public.profiles;
  v_redemption public.benefit_redemptions;
BEGIN
  IF NOT public.is_active_staff_or_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: solo personal autorizado puede validar canjes.';
  END IF;

  SELECT * INTO v_operator FROM public.profiles WHERE id = auth.uid();

  SELECT * INTO v_redemption
  FROM public.benefit_redemptions
  WHERE upper(redemption_code) = upper(trim(coalesce(p_code, '')))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El código de canje ingresado no existe.';
  END IF;

  IF v_redemption.status = 'UTILIZADO' THEN
    RAISE EXCEPTION 'Este código de canje (%) ya fue utilizado previamente.', v_redemption.redemption_code;
  END IF;

  IF v_redemption.status <> 'DISPONIBLE' AND v_redemption.status <> 'RESERVADO' THEN
    RAISE EXCEPTION 'El código de canje se encuentra en estado % y no puede utilizarse.', v_redemption.status;
  END IF;

  UPDATE public.benefit_redemptions
  SET
    status = 'UTILIZADO',
    used_at = now(),
    used_by = v_operator.id
  WHERE id = v_redemption.id
  RETURNING * INTO v_redemption;

  INSERT INTO public.audit_logs (
    id,
    actor_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) VALUES (
    'aud-' || encode(gen_random_bytes(6), 'hex'),
    v_operator.id::text,
    v_operator.email,
    v_operator.role,
    'VALIDACION_CANJE_MOSTRADOR',
    'benefit_redemptions',
    v_redemption.id,
    'Código ' || v_redemption.redemption_code || ' validado y entregado en mostrador',
    jsonb_build_object('redemptionCode', v_redemption.redemption_code)
  );

  RETURN v_redemption;
END;
$$;

-- 9. Ajuste Manual de Puntos por Administrador (con motivo obligatorio y auditoría)
CREATE OR REPLACE FUNCTION public.admin_adjust_points_atomic(
  p_customer_id uuid,
  p_points_delta integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin public.profiles;
  v_customer public.profiles;
  v_new_balance integer;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: solo los administradores pueden realizar ajustes manuales de puntos.';
  END IF;

  IF p_points_delta IS NULL OR p_points_delta = 0 OR abs(p_points_delta) > 100000 THEN
    RAISE EXCEPTION 'La cantidad de puntos a ajustar debe ser distinta de 0.';
  END IF;

  IF length(trim(coalesce(p_reason, ''))) < 4 THEN
    RAISE EXCEPTION 'Debés especificar un motivo válido para el registro de auditoría.';
  END IF;

  SELECT * INTO v_admin FROM public.profiles WHERE id = auth.uid();

  SELECT * INTO v_customer
  FROM public.profiles
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado.';
  END IF;

  IF v_customer.points_balance + p_points_delta < 0 THEN
    RAISE EXCEPTION 'El ajuste dejaría el saldo del cliente en negativo (Saldo actual: % pts).', v_customer.points_balance;
  END IF;

  v_new_balance := v_customer.points_balance + p_points_delta;

  PERFORM set_config('mondino.internal_trusted_op', 'true', true);

  UPDATE public.profiles
  SET points_balance = v_new_balance, updated_at = now()
  WHERE id = v_customer.id;

  INSERT INTO public.points_transactions (
    id,
    customer_id,
    amount,
    balance_after,
    type,
    description,
    idempotency_key,
    created_by
  ) VALUES (
    'tx-adj-' || encode(gen_random_bytes(6), 'hex'),
    v_customer.id,
    p_points_delta,
    v_new_balance,
    'AJUSTE_MANUAL',
    'Ajuste administrativo: ' || trim(p_reason),
    'adj-' || encode(gen_random_bytes(8), 'hex'),
    v_admin.email
  );

  INSERT INTO public.audit_logs (
    id,
    actor_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) VALUES (
    'aud-' || encode(gen_random_bytes(6), 'hex'),
    v_admin.id::text,
    v_admin.email,
    v_admin.role,
    'AJUSTE_MANUAL_PUNTOS',
    'profiles',
    v_customer.id::text,
    trim(p_reason),
    jsonb_build_object('pointsDelta', p_points_delta, 'newBalance', v_new_balance)
  );

  RETURN jsonb_build_object('newBalance', v_new_balance);
END;
$$;

-- 10. Bonus Anual de Cumpleaños Atómico
CREATE OR REPLACE FUNCTION public.claim_birthday_bonus_atomic()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_customer public.profiles;
  v_settings public.app_settings;
  v_current_year integer := extract(year FROM current_date)::integer;
  v_bonus integer;
  v_new_balance integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no iniciada.';
  END IF;

  SELECT * INTO v_customer FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND OR v_customer.status <> 'ACTIVO' THEN
    RAISE EXCEPTION 'Cuenta no disponible.';
  END IF;

  IF trim(coalesce(v_customer.birth_date, '')) = '' THEN
    RAISE EXCEPTION 'Primero guardá tu fecha de nacimiento en tu perfil.';
  END IF;

  IF coalesce(v_customer.birthday_bonus_claimed_year, 0) >= v_current_year THEN
    RAISE EXCEPTION 'Ya acreditaste tu bonus de cumpleaños correspondiente al año %.', v_current_year;
  END IF;

  SELECT * INTO v_settings FROM public.app_settings WHERE id = 'mondino-global-settings';
  v_bonus := coalesce(v_settings.birthday_bonus_points, 200);
  v_new_balance := v_customer.points_balance + v_bonus;

  PERFORM set_config('mondino.internal_trusted_op', 'true', true);

  UPDATE public.profiles
  SET
    points_balance = v_new_balance,
    birthday_bonus_claimed_year = v_current_year,
    updated_at = now()
  WHERE id = v_customer.id;

  INSERT INTO public.points_transactions (
    id,
    customer_id,
    amount,
    balance_after,
    type,
    description,
    idempotency_key,
    created_by
  ) VALUES (
    'tx-bday-' || encode(gen_random_bytes(6), 'hex'),
    v_customer.id,
    v_bonus,
    v_new_balance,
    'BONUS_CUMPLEANOS',
    'Bonificación anual de cumpleaños ' || v_current_year || ' — Farmacia y Perfumería Mondino',
    'bday-' || v_customer.id::text || '-' || v_current_year::text,
    'sistema@mondinoclub.com'
  );

  RETURN jsonb_build_object(
    'bonusPoints', v_bonus,
    'newBalance', v_new_balance
  );
END;
$$;

-- 11. Aplicar Código de Referido Atómico
CREATE OR REPLACE FUNCTION public.apply_referral_code_atomic(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_referred public.profiles;
  v_referrer public.profiles;
  v_settings public.app_settings;
  v_referrer_bonus integer;
  v_referred_bonus integer;
  v_referred_new_balance integer;
  v_referrer_new_balance integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no iniciada.';
  END IF;

  SELECT * INTO v_referred FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND OR v_referred.status <> 'ACTIVO' THEN
    RAISE EXCEPTION 'Cuenta no activa.';
  END IF;

  IF v_referred.referred_by_id IS NOT NULL THEN
    RAISE EXCEPTION 'Ya aplicaste un código de invitación anteriormente.';
  END IF;

  SELECT * INTO v_referrer
  FROM public.profiles
  WHERE upper(referral_code) = upper(trim(coalesce(p_code, '')))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El código de referido ingresado no pertenece a ningún socio.';
  END IF;

  IF v_referrer.id = v_referred.id THEN
    RAISE EXCEPTION 'No podés utilizar tu propio código de referido.';
  END IF;

  SELECT * INTO v_settings FROM public.app_settings WHERE id = 'mondino-global-settings';
  v_referrer_bonus := coalesce(v_settings.referrer_bonus_points, 150);
  v_referred_bonus := coalesce(v_settings.referred_bonus_points, 100);

  v_referred_new_balance := v_referred.points_balance + v_referred_bonus;
  v_referrer_new_balance := v_referrer.points_balance + v_referrer_bonus;

  PERFORM set_config('mondino.internal_trusted_op', 'true', true);

  UPDATE public.profiles
  SET
    referred_by_id = v_referrer.id,
    points_balance = v_referred_new_balance,
    updated_at = now()
  WHERE id = v_referred.id;

  UPDATE public.profiles
  SET
    points_balance = v_referrer_new_balance,
    updated_at = now()
  WHERE id = v_referrer.id;

  INSERT INTO public.referrals (
    id,
    referrer_id,
    referred_id,
    referral_code_used,
    referrer_points_awarded,
    referred_points_awarded,
    status
  ) VALUES (
    'ref-' || encode(gen_random_bytes(6), 'hex'),
    v_referrer.id,
    v_referred.id,
    v_referrer.referral_code,
    v_referrer_bonus,
    v_referred_bonus,
    'ACREDITADO'
  );

  INSERT INTO public.points_transactions (
    id,
    customer_id,
    amount,
    balance_after,
    type,
    description,
    idempotency_key,
    created_by
  ) VALUES (
    'tx-ref1-' || encode(gen_random_bytes(6), 'hex'),
    v_referred.id,
    v_referred_bonus,
    v_referred_new_balance,
    'BONUS_REFERIDO',
    'Bono bienvenida por invitación de ' || v_referrer.first_name || ' ' || v_referrer.last_name,
    'ref-referred-' || v_referred.id::text,
    'sistema@mondinoclub.com'
  ), (
    'tx-ref2-' || encode(gen_random_bytes(6), 'hex'),
    v_referrer.id,
    v_referrer_bonus,
    v_referrer_new_balance,
    'BONUS_REFERIDO',
    'Bono por invitar a ' || v_referred.first_name || ' ' || v_referred.last_name || ' a Mondino Club',
    'ref-referrer-' || v_referred.id::text,
    'sistema@mondinoclub.com'
  );

  RETURN jsonb_build_object(
    'referrerName', trim(v_referrer.first_name || ' ' || v_referrer.last_name),
    'referredBonus', v_referred_bonus,
    'referrerBonus', v_referrer_bonus,
    'newBalance', v_referred_new_balance
  );
END;
$$;

-- 12. Gestión Administrativa de Rol / Estado / Empleado Autorizado
CREATE OR REPLACE FUNCTION public.admin_update_user_role_status(
  p_target_profile_id uuid,
  p_role text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_employee_position text DEFAULT NULL,
  p_employee_branch text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin public.profiles;
  v_target public.profiles;
  v_next_role text;
  v_next_status text;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: solo un administrador puede modificar roles o estados de cuentas.';
  END IF;

  SELECT * INTO v_admin FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_profile_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario objetivo no encontrado.';
  END IF;

  v_next_role := coalesce(p_role, v_target.role);
  v_next_status := coalesce(p_status, v_target.status);

  IF v_next_role NOT IN ('CLIENTE', 'EMPLEADO', 'ADMINISTRADOR') THEN
    RAISE EXCEPTION 'Rol inválido.';
  END IF;

  IF v_next_status NOT IN ('ACTIVO', 'SUSPENDIDO') THEN
    RAISE EXCEPTION 'Estado inválido.';
  END IF;

  PERFORM set_config('mondino.internal_trusted_op', 'true', true);

  UPDATE public.profiles
  SET
    role = v_next_role,
    status = v_next_status,
    updated_at = now()
  WHERE id = v_target.id
  RETURNING * INTO v_target;

  IF v_next_role = 'EMPLEADO' THEN
    INSERT INTO public.employees (
      profile_id,
      employee_code,
      position,
      branch,
      is_active,
      authorized_by,
      updated_at
    ) VALUES (
      v_target.id,
      'EMP-' || upper(encode(gen_random_bytes(3), 'hex')),
      coalesce(nullif(trim(p_employee_position), ''), 'Atención en Mostrador'),
      coalesce(nullif(trim(p_employee_branch), ''), 'Casa Central Mondino'),
      true,
      v_admin.id,
      now()
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      position = EXCLUDED.position,
      branch = EXCLUDED.branch,
      is_active = true,
      authorized_by = v_admin.id,
      updated_at = now();
  ELSIF v_next_role = 'CLIENTE' THEN
    UPDATE public.employees
    SET is_active = false, updated_at = now()
    WHERE profile_id = v_target.id;
  END IF;

  INSERT INTO public.audit_logs (
    id,
    actor_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) VALUES (
    'aud-' || encode(gen_random_bytes(6), 'hex'),
    v_admin.id::text,
    v_admin.email,
    v_admin.role,
    'CAMBIO_ROL_O_ESTADO',
    'profiles',
    v_target.id::text,
    'Actualización de cuenta ' || v_target.email || ' -> Rol: ' || v_next_role || ', Estado: ' || v_next_status,
    jsonb_build_object('role', v_next_role, 'status', v_next_status)
  );

  RETURN v_target;
END;
$$;

-- 13. Creación Atómica de Campaña Segmentada y Despacho de Notificaciones
CREATE OR REPLACE FUNCTION public.admin_create_campaign_atomic(
  p_title text,
  p_message text,
  p_segment text,
  p_scheduled_at text,
  p_status text
)
RETURNS public.campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin public.profiles;
  v_campaign public.campaigns;
  v_campaign_id text := 'camp-' || encode(gen_random_bytes(6), 'hex');
  v_reach integer := 0;
  v_target record;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: solo un administrador puede crear campañas.';
  END IF;

  SELECT * INTO v_admin FROM public.profiles WHERE id = auth.uid();

  FOR v_target IN
    SELECT id
    FROM public.profiles
    WHERE status = 'ACTIVO'
      AND (
        p_segment = 'TODOS'
        OR (p_segment = 'PUNTOS_ALTOS' AND points_balance >= 500)
        OR (p_segment = 'CUMPLEANOS_MES' AND birth_date <> '')
        OR (p_segment NOT IN ('TODOS', 'PUNTOS_ALTOS', 'CUMPLEANOS_MES'))
      )
  LOOP
    v_reach := v_reach + 1;
    IF coalesce(p_status, 'ENVIADA') = 'ENVIADA' THEN
      INSERT INTO public.notifications (
        id,
        customer_id,
        type,
        title,
        message,
        is_read,
        action_url
      ) VALUES (
        'notif-' || encode(gen_random_bytes(6), 'hex'),
        v_target.id,
        'CAMPANA',
        trim(p_title),
        trim(p_message),
        false,
        '/novedades'
      );
    END IF;
  END LOOP;

  INSERT INTO public.campaigns (
    id,
    title,
    message,
    image_url,
    segment,
    scheduled_at,
    status,
    estimated_reach,
    created_by
  ) VALUES (
    v_campaign_id,
    trim(p_title),
    trim(p_message),
    '/images/hero_perfumery_banner.jpg',
    coalesce(p_segment, 'TODOS'),
    coalesce(p_scheduled_at, to_char(current_date, 'YYYY-MM-DD')),
    coalesce(p_status, 'ENVIADA'),
    v_reach,
    v_admin.id
  )
  RETURNING * INTO v_campaign;

  INSERT INTO public.audit_logs (
    id,
    actor_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) VALUES (
    'aud-' || encode(gen_random_bytes(6), 'hex'),
    v_admin.id::text,
    v_admin.email,
    v_admin.role,
    'CREACION_CAMPANA',
    'campaigns',
    v_campaign_id,
    'Campaña "' || trim(p_title) || '" para segmento ' || coalesce(p_segment, 'TODOS'),
    jsonb_build_object('estimatedReach', v_reach)
  );

  RETURN v_campaign;
END;
$$;

-- 14. Procedimiento Seguro de Bootstrap para el Primer Administrador
-- Ejecutable únicamente desde el SQL Editor de Supabase (rol postgres)
CREATE OR REPLACE FUNCTION public.bootstrap_promote_admin(p_email text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'Este procedimiento solo puede ejecutarse desde la consola SQL administrativa de Supabase.';
  END IF;

  PERFORM set_config('mondino.internal_trusted_op', 'true', true);

  UPDATE public.profiles
  SET
    role = 'ADMINISTRADOR',
    status = 'ACTIVO',
    updated_at = now()
  WHERE lower(email) = lower(trim(p_email))
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró ningún perfil con el email %. Iniciá sesión con Google primero para crear tu perfil.', p_email;
  END IF;

  INSERT INTO public.audit_logs (
    id,
    actor_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) VALUES (
    'aud-' || encode(gen_random_bytes(6), 'hex'),
    'system-bootstrap',
    v_profile.email,
    'ADMINISTRADOR',
    'BOOTSTRAP_ADMIN',
    'profiles',
    v_profile.id::text,
    'Promoción inicial segura a ADMINISTRADOR desde consola SQL',
    jsonb_build_object('email', v_profile.email)
  );

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_promote_admin(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile_safe(text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_qr_for_staff(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_purchase_points(numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_purchase_atomic(text, uuid, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_purchase_atomic(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_benefit_atomic(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_redemption_for_staff(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_points_atomic(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_birthday_bonus_atomic() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral_code_atomic(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role_status(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_campaign_atomic(text, text, text, text, text) TO authenticated;
