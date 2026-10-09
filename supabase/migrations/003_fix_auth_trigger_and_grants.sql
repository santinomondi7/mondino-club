-- =============================================================================
-- MONDINO CLUB — PARCHE RÁPIDO PARA TRIGGER DE ALTA DE USUARIOS EN SUPABASE
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

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
