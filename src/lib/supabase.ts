import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente público de Supabase para despliegue en Vercel / Supabase externo.
 * IMPORTANTE: Utiliza exclusivamente la clave pública (VITE_SUPABASE_ANON_KEY).
 * NUNCA exponer service_role keys en el cliente.
 */
const DEFAULT_PUBLIC_SUPABASE_URL = 'https://vpjwmarisctnqjzpyakz.supabase.co';
const DEFAULT_PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwandtYXJpc2N0bnFqenB5YWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MDc0ODgsImV4cCI6MjEwNzA4MzQ4OH0.QJ7wIXI4t0u9aNgp-QQdbfYrFN_KpFYLMnVJFdz7iV4';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const supabaseUrl =
  rawUrl && rawUrl !== 'https://tu-proyecto.supabase.co'
    ? rawUrl
    : DEFAULT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  rawAnonKey && rawAnonKey !== 'tu-anon-public-key' && rawAnonKey !== 'tu-supabase-anon-key'
    ? rawAnonKey
    : DEFAULT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
