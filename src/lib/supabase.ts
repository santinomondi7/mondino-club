import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente público de Supabase para despliegue en Vercel / Supabase externo.
 * IMPORTANTE: Utiliza exclusivamente la clave pública (VITE_SUPABASE_ANON_KEY).
 * NUNCA exponer service_role keys en el cliente.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://tu-proyecto.supabase.co' &&
    supabaseAnonKey !== 'tu-anon-public-key'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
