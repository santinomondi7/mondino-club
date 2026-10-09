import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';

export interface VerifiedAuthContext {
  user: SupabaseAuthUser;
  accessToken: string;
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
}

export function getServerSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  const isConfigured = Boolean(
    url &&
      anonKey &&
      url !== 'https://tu-proyecto.supabase.co' &&
      anonKey !== 'tu-anon-public-key'
  );

  return {
    url,
    anonKey,
    serviceRoleKey,
    isConfigured,
  };
}

export function createAnonServerClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getServerSupabaseConfig();
  if (!isConfigured) return null;

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function verifySupabaseBearerToken(
  authHeader?: string
): Promise<VerifiedAuthContext> {
  const { url, anonKey, serviceRoleKey, isConfigured } = getServerSupabaseConfig();

  if (!isConfigured) {
    throw new Error(
      'Supabase no está configurado en las variables de entorno (SUPABASE_URL / VITE_SUPABASE_URL y SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY).'
    );
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error(
      'Tu sesión expiró o no iniciaste sesión. Volvé a ingresar con tu cuenta de Google.'
    );
  }

  const accessToken = authHeader.slice('Bearer '.length).trim();
  if (!accessToken) {
    throw new Error('Token de autenticación ausente.');
  }

  // Create a request-scoped Supabase client bound to the user's JWT so RLS and auth.uid() work natively
  const userClient = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await userClient.auth.getUser(accessToken);
  if (error || !data?.user) {
    throw new Error('Tu sesión expiró o el token no es válido. Volvé a iniciar sesión.');
  }

  // Optional service_role client strictly on the backend if configured; otherwise falls back to RLS userClient
  const adminClient =
    serviceRoleKey && serviceRoleKey !== 'tu-service-role-key-privada'
      ? createClient(url, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        })
      : userClient;

  return {
    user: data.user,
    accessToken,
    userClient,
    adminClient,
  };
}
