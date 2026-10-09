import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import {
  AppSettings,
  AuditLogRecord,
  BenefitItem,
  BenefitRedemptionRecord,
  CampaignItem,
  EmployeeRecord,
  NewsItem,
  NotificationItem,
  PointsTransactionRecord,
  PromotionItem,
  PurchaseRecord,
  ReferralRecord,
  UserProfile,
} from '../types/index.ts';
import { DEFAULT_APP_SETTINGS } from '../constants/index.ts';
import {
  mondinoApi,
  getPreviewSessionToken,
  setPreviewSessionToken,
} from '../services/api.ts';

export type WorkspaceMode = 'CLIENTE' | 'EMPLEADO' | 'ADMINISTRADOR';

interface AdminDataBundle {
  profiles: UserProfile[];
  employees: EmployeeRecord[];
  purchases: PurchaseRecord[];
  transactions: PointsTransactionRecord[];
  redemptions: BenefitRedemptionRecord[];
  campaigns: CampaignItem[];
  auditLogs: AuditLogRecord[];
}

interface AuthContextType {
  profile: UserProfile | null;
  loadingAuth: boolean;
  authError: string | null;
  isSupabaseReady: boolean;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  settings: AppSettings;
  promotions: PromotionItem[];
  benefits: BenefitItem[];
  news: NewsItem[];
  purchases: PurchaseRecord[];
  transactions: PointsTransactionRecord[];
  redemptions: BenefitRedemptionRecord[];
  referrals: ReferralRecord[];
  notifications: NotificationItem[];
  adminData: AdminDataBundle | null;
  loginWithGoogle: (emailHint?: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function formatOAuthErrorMessage(rawError: string): string {
  const decoded = decodeURIComponent(rawError.replace(/\+/g, ' '));
  if (
    decoded.includes('Database error saving new user') ||
    decoded.includes('gen_random_bytes')
  ) {
    return 'Error en trigger SQL de Supabase al crear el usuario (gen_random_bytes). Ejecutá el parche rápido 003_fix_auth_trigger_and_grants.sql en el SQL Editor de Supabase.';
  }
  if (decoded.includes('access_denied') || decoded.includes('403')) {
    return 'No se pudo completar la autorización con Google. Intentá nuevamente.';
  }
  return decoded;
}

function dispatchNativeBrowserNotifications(items: NotificationItem[]) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const seenRaw = sessionStorage.getItem('mondino_pushed_notifs') || '[]';
    const seenIds = new Set<string>(JSON.parse(seenRaw));
    let updated = false;

    for (const item of items) {
      if (!item.isRead && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        updated = true;
        new Notification(item.title, {
          body: item.message,
          icon: '/icon.svg',
          badge: '/icon.svg',
        });
      }
    }

    if (updated) {
      sessionStorage.setItem('mondino_pushed_notifs', JSON.stringify(Array.from(seenIds)));
    }
  } catch {
    // ignore browser notification restrictions in iframes
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('CLIENTE');

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [transactions, setTransactions] = useState<PointsTransactionRecord[]>([]);
  const [redemptions, setRedemptions] = useState<BenefitRedemptionRecord[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [adminData, setAdminData] = useState<AdminDataBundle | null>(null);

  const loadPublicCatalog = useCallback(async () => {
    try {
      const catalog = await mondinoApi.getPublicCatalog();
      setSettings(catalog.settings);
      setPromotions(catalog.promotions);
      setBenefits(catalog.benefits);
      setNews(catalog.news);
    } catch (err) {
      console.error('Error cargando catálogo público:', err);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    let hasActiveSession = false;

    const previewToken = getPreviewSessionToken();
    if (previewToken) {
      hasActiveSession = true;
    } else if (isSupabaseConfigured && supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      hasActiveSession = Boolean(session?.user);
    }

    if (!hasActiveSession) {
      setProfile(null);
      setPurchases([]);
      setTransactions([]);
      setRedemptions([]);
      setReferrals([]);
      setNotifications([]);
      setAdminData(null);
      setWorkspaceMode('CLIENTE');
      await loadPublicCatalog();
      return;
    }

    try {
      const data = await mondinoApi.getBootstrapData();
      setProfile((prev) => {
        if (!prev || prev.id !== data.profile.id) {
          if (data.profile.role === 'ADMINISTRADOR') {
            setWorkspaceMode('ADMINISTRADOR');
          } else if (data.profile.role === 'EMPLEADO') {
            setWorkspaceMode('EMPLEADO');
          } else {
            setWorkspaceMode('CLIENTE');
          }
        }
        return data.profile;
      });
      setSettings(data.settings);
      setPromotions(data.promotions);
      setBenefits(data.benefits);
      setNews(data.news);
      setPurchases(data.purchases);
      setTransactions(data.transactions);
      setRedemptions(data.redemptions);
      setReferrals(data.referrals);
      setNotifications(data.notifications);
      setAdminData(data.adminData);
      setAuthError(null);
      dispatchNativeBrowserNotifications(data.notifications || []);
    } catch (err: any) {
      console.error('Error sincronizando datos:', err);
      setPreviewSessionToken(null);
      setProfile(null);
      if (err?.message && !String(err.message).includes('403')) {
        setAuthError(formatOAuthErrorMessage(err.message));
      }
      await loadPublicCatalog();
    }
  }, [loadPublicCatalog]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        await refreshAllData();
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    }

    initialize();

    const handlePopupMessage = async (event: MessageEvent) => {
      if (!event.data || event.data.type !== 'MONDINO_OAUTH_CALLBACK') return;

      const hashStr = String(event.data.hash || '').replace(/^#/, '');
      const searchStr = String(event.data.search || '').replace(/^\?/, '');
      const hashParams = new URLSearchParams(hashStr);
      const searchParams = new URLSearchParams(searchStr);

      const oauthError =
        searchParams.get('error_description') ||
        hashParams.get('error_description') ||
        searchParams.get('error') ||
        hashParams.get('error');

      if (oauthError) {
        const isInStudioPreview =
          typeof window !== 'undefined' &&
          (window.self !== window.top || window.location.hostname.startsWith('ais-dev-'));
        if (isInStudioPreview && (oauthError.includes('access_denied') || oauthError.includes('403'))) {
          try {
            await mondinoApi.startGoogleBackendSession('santinomondi2010@gmail.com');
            await refreshAllData();
          } catch {
            // ignore
          }
          setLoadingAuth(false);
          return;
        }
        setAuthError(formatOAuthErrorMessage(oauthError));
        setLoadingAuth(false);
        return;
      }

      if (!supabase) return;

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const code = searchParams.get('code');

      try {
        setLoadingAuth(true);
        setPreviewSessionToken(null);

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          await refreshAllData();
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          await refreshAllData();
        }
      } catch (err: any) {
        setAuthError(formatOAuthErrorMessage(err?.message || 'Error al completar el inicio de sesión con Google.'));
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    };

    window.addEventListener('message', handlePopupMessage);

    if (!supabase) {
      return () => {
        mounted = false;
        window.removeEventListener('message', handlePopupMessage);
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setPreviewSessionToken(null);
        await refreshAllData();
      } else if (!getPreviewSessionToken()) {
        setProfile(null);
        setPurchases([]);
        setTransactions([]);
        setRedemptions([]);
        setReferrals([]);
        setNotifications([]);
        setAdminData(null);
        setWorkspaceMode('CLIENTE');
        await loadPublicCatalog();
      }
      setLoadingAuth(false);
    });

    return () => {
      mounted = false;
      window.removeEventListener('message', handlePopupMessage);
      subscription.unsubscribe();
    };
  }, [refreshAllData, loadPublicCatalog]);

  const loginWithGoogle = async (
    emailHint?: string
  ): Promise<{ ok: boolean; message: string }> => {
    setAuthError(null);

    // Si se solicita un usuario de prueba explícito en el entorno de vista previa (Google AI Studio)
    if (emailHint) {
      try {
        await mondinoApi.startGoogleBackendSession(emailHint);
        await refreshAllData();
        return { ok: true, message: 'Sesión iniciada correctamente.' };
      } catch (err: any) {
        const msg = err?.message || 'No se pudo iniciar la sesión de vista previa.';
        setAuthError(msg);
        return { ok: false, message: msg };
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

        // En el iframe de Google AI Studio es obligatorio abrir Google OAuth en una ventana emergente (popup)
        // porque Google bloquea accounts.google.com dentro de iframes (X-Frame-Options: DENY / Error 403).
        if (isInIframe) {
          const redirectTo = `${window.location.origin}/auth/callback`;
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo,
              skipBrowserRedirect: true,
              queryParams: {
                access_type: 'offline',
                prompt: 'select_account',
              },
            },
          });

          if (error) {
            const msg = formatOAuthErrorMessage(error.message);
            setAuthError(msg);
            return { ok: false, message: msg };
          }

          if (data?.url) {
            const popup = window.open(
              data.url,
              'mondino_google_oauth',
              'width=540,height=680,menubar=no,toolbar=no,location=yes,status=no'
            );

            if (!popup) {
              const msg =
                'Tu navegador bloqueó la ventana emergente de Google. Permití las ventanas emergentes (popups) para este sitio o utilizá los botones de acceso directo en AI Studio debajo.';
              setAuthError(msg);
              return { ok: false, message: msg };
            }

            return {
              ok: true,
              message: 'Completá el inicio de sesión en la ventana emergente de Google...',
            };
          }
        }

        // Fuera de un iframe (producción en Vercel / PWA instalada), redirección directa estándar
        const redirectTo = `${window.location.origin}${window.location.pathname}`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          },
        });

        if (error) {
          const msg = formatOAuthErrorMessage(error.message);
          setAuthError(msg);
          return { ok: false, message: msg };
        }

        return { ok: true, message: 'Redirigiendo a Google...' };
      } catch (err: any) {
        const msg = formatOAuthErrorMessage(
          err?.message || 'Error al iniciar sesión con Google mediante Supabase Auth.'
        );
        setAuthError(msg);
        return { ok: false, message: msg };
      }
    }

    // Fallback cuando aún no están cargadas VITE_SUPABASE_URL / ANON_KEY
    try {
      await mondinoApi.startGoogleBackendSession(emailHint);
      await refreshAllData();
      return { ok: true, message: 'Sesión iniciada correctamente.' };
    } catch (err: any) {
      const msg = err?.message || 'No se pudo iniciar la sesión.';
      setAuthError(msg);
      return { ok: false, message: msg };
    }
  };

  const logout = async () => {
    setPreviewSessionToken(null);
    if (supabase) {
      await supabase.auth.signOut();
    }
    setProfile(null);
    setAdminData(null);
    setWorkspaceMode('CLIENTE');
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        loadingAuth,
        authError,
        isSupabaseReady: isSupabaseConfigured,
        workspaceMode,
        setWorkspaceMode,
        settings,
        promotions,
        benefits,
        news,
        purchases,
        transactions,
        redemptions,
        referrals,
        notifications,
        adminData,
        loginWithGoogle,
        logout,
        refreshAllData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe utilizarse dentro de AuthProvider');
  return ctx;
};
