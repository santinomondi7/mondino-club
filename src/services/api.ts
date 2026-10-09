import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import {
  BASE_PESOS_PER_POINT,
  DEFAULT_APP_SETTINGS,
  GENERATED_IMAGES,
} from '../constants/index.ts';
import {
  AccountStatus,
  AppSettings,
  AuditLogRecord,
  BackendPointsPreview,
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
  UserRole,
  ValidatedQrCustomer,
} from '../types/index.ts';

// ============================================================================
// CLIENTE UNIFICADO DE COMUNICACIÓN BACKEND (/api/*) + FALLBACK SUPABASE RPC
// ============================================================================

const PREVIEW_TOKEN_STORAGE_KEY = 'mondino_club_session_token';

export function getPreviewSessionToken(): string | null {
  try {
    return localStorage.getItem(PREVIEW_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setPreviewSessionToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(PREVIEW_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(PREVIEW_TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function getAccessToken(): Promise<string | null> {
  const previewToken = getPreviewSessionToken();
  if (previewToken) return previewToken;
  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  }
  return null;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  requireAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = await getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new Error('Tu sesión expiró o no iniciaste sesión. Ingresá con tu cuenta de Google.');
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`UNAVAILABLE_JSON_API:${response.status}`);
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || `Error en la operación (${response.status})`);
  }

  return payload as T;
}

function isApiRouteUnavailableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.message.startsWith('UNAVAILABLE_JSON_API:') ||
    err.message.includes('Failed to fetch') ||
    err.message.includes('NetworkError')
  );
}

function mapProfileRow(row: Record<string, any>): UserProfile {
  return {
    id: row.id,
    uid: row.id,
    email: row.email || '',
    firstName: row.first_name || 'Cliente',
    lastName: row.last_name || '',
    avatarUrl: row.avatar_url || '',
    phone: row.phone || '',
    birthDate: row.birth_date || '',
    role: (row.role as UserRole) || UserRole.CLIENTE,
    status: (row.status as AccountStatus) || AccountStatus.ACTIVO,
    qrToken: row.qr_token || '',
    referralCode: row.referral_code || '',
    referredById: row.referred_by_id || null,
    birthdayBonusClaimedYear:
      row.birthday_bonus_claimed_year != null
        ? Number(row.birthday_bonus_claimed_year)
        : undefined,
    notificationPreferences: row.notification_preferences || {
      promotions: true,
      benefits: true,
      expiring: true,
      birthday: true,
      news: true,
    },
    pointsBalance: Number(row.points_balance ?? 0),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapEmployeeRow(row: Record<string, any>): EmployeeRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    employeeCode: row.employee_code,
    position: row.position || 'Atención en Mostrador',
    branch: row.branch || 'Casa Central Mondino',
    canRegisterPurchases: Boolean(row.can_register_purchases ?? true),
    canManageRedemptions: Boolean(row.can_manage_redemptions ?? true),
    isActive: Boolean(row.is_active ?? true),
    authorizedBy: row.authorized_by || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapPromotionRow(row: Record<string, any>): PromotionItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url || GENERATED_IMAGES.heroPerfumery,
    category: row.category || 'Todos',
    promoType: row.promo_type || 'MULTIPLICADOR',
    multiplier: Number(row.multiplier ?? 1),
    extraPoints: Number(row.extra_points ?? 0),
    minPurchaseAmount: Number(row.min_purchase_amount ?? 0),
    startDate: row.start_date,
    endDate: row.end_date,
    usageLimit: Number(row.usage_limit ?? 0),
    currentUsages: Number(row.current_usages ?? 0),
    isActive: Boolean(row.is_active),
    termsConditions: row.terms_conditions || '',
    createdBy: row.created_by || null,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapPurchaseRow(row: Record<string, any>): PurchaseRecord {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    customerId: row.customer_id,
    employeeId: row.employee_id,
    amount: Number(row.amount ?? 0),
    category: row.category || 'Perfumería',
    basePoints: Number(row.base_points ?? 0),
    promoPoints: Number(row.promo_points ?? 0),
    totalPoints: Number(row.total_points ?? 0),
    promotionId: row.promotion_id || null,
    notes: row.notes || '',
    status: row.status || 'COMPLETADA',
    voidedReason: row.voided_reason || undefined,
    voidedBy: row.voided_by || null,
    voidedAt: row.voided_at || null,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapTransactionRow(row: Record<string, any>): PointsTransactionRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    purchaseId: row.purchase_id || null,
    promotionId: row.promotion_id || null,
    amount: Number(row.amount ?? 0),
    balanceAfter: Number(row.balance_after ?? 0),
    type: row.type,
    description: row.description,
    idempotencyKey: row.idempotency_key,
    createdBy: row.created_by || 'sistema@mondinoclub.com',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapBenefitRow(row: Record<string, any>): BenefitItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url || GENERATED_IMAGES.benefitSkincare,
    pointsRequired: Number(row.points_required ?? 100),
    category: row.category || 'Perfumería',
    startDate: row.start_date || '2025-01-01',
    endDate: row.end_date || '2027-12-31',
    isActive: Boolean(row.is_active),
    usageLimit: Number(row.usage_limit ?? 100),
    stockAvailable: Number(row.stock_available ?? 0),
    termsConditions: row.terms_conditions || '',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapRedemptionRow(row: Record<string, any>): BenefitRedemptionRecord {
  return {
    id: row.id,
    benefitId: row.benefit_id,
    customerId: row.customer_id,
    pointsSpent: Number(row.points_spent ?? 0),
    redemptionCode: row.redemption_code,
    status: row.status || 'DISPONIBLE',
    usedAt: row.used_at || null,
    usedBy: row.used_by || null,
    expiresAt: row.expires_at,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapNewsRow(row: Record<string, any>): NewsItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    description: row.description,
    imageUrl: row.image_url || GENERATED_IMAGES.newsDermocosmetics,
    category: row.category || 'Novedades',
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at,
    createdBy: row.created_by || 'Farmacia y Perfumería Mondino',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapCampaignRow(row: Record<string, any>): CampaignItem {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    imageUrl: row.image_url || GENERATED_IMAGES.heroPerfumery,
    segment: row.segment || 'TODOS',
    scheduledAt: row.scheduled_at,
    status: row.status || 'ENVIADA',
    estimatedReach: Number(row.estimated_reach ?? 0),
    createdBy: row.created_by || null,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapReferralRow(row: Record<string, any>): ReferralRecord {
  return {
    id: row.id,
    referrerId: row.referrer_id,
    referredId: row.referred_id,
    referralCodeUsed: row.referral_code_used,
    referrerPointsAwarded: Number(row.referrer_points_awarded ?? 0),
    referredPointsAwarded: Number(row.referred_points_awarded ?? 0),
    status: row.status || 'ACREDITADO',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapNotificationRow(row: Record<string, any>): NotificationItem {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: row.type || 'SISTEMA',
    title: row.title,
    message: row.message,
    isRead: Boolean(row.is_read),
    actionUrl: row.action_url || '/inicio',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapAuditRow(row: Record<string, any>): AuditLogRecord {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    actorRole: row.actor_role,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    reason: row.reason,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapSettingsRow(row?: Record<string, any> | null): AppSettings {
  if (!row) return DEFAULT_APP_SETTINGS;
  return {
    id: row.id || DEFAULT_APP_SETTINGS.id,
    clubName: row.club_name || DEFAULT_APP_SETTINGS.clubName,
    clubSubtitle: row.club_subtitle || DEFAULT_APP_SETTINGS.clubSubtitle,
    logoUrl: row.logo_url || DEFAULT_APP_SETTINGS.logoUrl,
    primaryColor: row.primary_color || DEFAULT_APP_SETTINGS.primaryColor,
    secondaryColor: row.secondary_color || DEFAULT_APP_SETTINGS.secondaryColor,
    accentColor: row.accent_color || DEFAULT_APP_SETTINGS.accentColor,
    basePointsRateLocked: BASE_PESOS_PER_POINT,
    birthdayBonusPoints: Number(
      row.birthday_bonus_points ?? DEFAULT_APP_SETTINGS.birthdayBonusPoints
    ),
    referrerBonusPoints: Number(
      row.referrer_bonus_points ?? DEFAULT_APP_SETTINGS.referrerBonusPoints
    ),
    referredBonusPoints: Number(
      row.referred_bonus_points ?? DEFAULT_APP_SETTINGS.referredBonusPoints
    ),
    notificationsEnabled: Boolean(
      row.notifications_enabled ?? DEFAULT_APP_SETTINGS.notificationsEnabled
    ),
    whatsappContact: row.whatsapp_contact || DEFAULT_APP_SETTINGS.whatsappContact,
    address: row.address || DEFAULT_APP_SETTINGS.address,
    openingHours: row.opening_hours || DEFAULT_APP_SETTINGS.openingHours,
  };
}

export interface BootstrapDataResponse {
  profile: UserProfile;
  settings: AppSettings;
  promotions: PromotionItem[];
  benefits: BenefitItem[];
  news: NewsItem[];
  purchases: PurchaseRecord[];
  transactions: PointsTransactionRecord[];
  redemptions: BenefitRedemptionRecord[];
  referrals: ReferralRecord[];
  notifications: NotificationItem[];
  adminData: {
    profiles: UserProfile[];
    employees: EmployeeRecord[];
    purchases: PurchaseRecord[];
    transactions: PointsTransactionRecord[];
    redemptions: BenefitRedemptionRecord[];
    campaigns: CampaignItem[];
    auditLogs: AuditLogRecord[];
  } | null;
}

export const mondinoApi = {
  async startGoogleBackendSession(email?: string): Promise<{
    token: string;
    profile: UserProfile;
  }> {
    const res = await apiRequest<{ token: string; profile: UserProfile }>(
      '/api/auth/google-session',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
      false
    );
    setPreviewSessionToken(res.token);
    return res;
  },

  async getPublicCatalog(): Promise<{
    settings: AppSettings;
    promotions: PromotionItem[];
    benefits: BenefitItem[];
    news: NewsItem[];
  }> {
    try {
      return await apiRequest('/api/public/catalog', { method: 'GET' }, false);
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !isSupabaseConfigured || !supabase) {
        return {
          settings: DEFAULT_APP_SETTINGS,
          promotions: [],
          benefits: [],
          news: [],
        };
      }

      const [settingsRes, promosRes, benefitsRes, newsRes] = await Promise.all([
        supabase.from('app_settings').select('*').eq('id', 'mondino-global-settings').maybeSingle(),
        supabase.from('promotions').select('*').order('created_at', { ascending: false }),
        supabase.from('benefits').select('*').order('points_required', { ascending: true }),
        supabase.from('news').select('*').order('published_at', { ascending: false }),
      ]);

      return {
        settings: mapSettingsRow(settingsRes.data),
        promotions: (promosRes.data || []).map(mapPromotionRow),
        benefits: (benefitsRes.data || []).map(mapBenefitRow),
        news: (newsRes.data || []).map(mapNewsRow),
      };
    }
  },

  async getBootstrapData(): Promise<BootstrapDataResponse> {
    try {
      return await apiRequest<BootstrapDataResponse>('/api/bootstrap', { method: 'GET' }, true);
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) {
        throw err;
      }

      const { data: rpcProfile, error: rpcErr } = await supabase.rpc('ensure_my_profile');
      if (rpcErr || !rpcProfile) {
        throw new Error(rpcErr?.message || 'No se pudo inicializar el perfil en Supabase.');
      }

      const profile = mapProfileRow(rpcProfile as Record<string, any>);
      const isStaffOrAdmin =
        profile.role === UserRole.EMPLEADO || profile.role === UserRole.ADMINISTRADOR;
      const isAdmin = profile.role === UserRole.ADMINISTRADOR;

      const [
        catalog,
        myPurchasesRes,
        myTxRes,
        myRedemptionsRes,
        myReferralsRes,
        myNotificationsRes,
        allProfilesRes,
        allEmployeesRes,
        allPurchasesRes,
        allTxRes,
        allRedemptionsRes,
        allCampaignsRes,
        allAuditRes,
      ] = await Promise.all([
        this.getPublicCatalog(),
        supabase
          .from('purchases')
          .select('*')
          .eq('customer_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('points_transactions')
          .select('*')
          .eq('customer_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('benefit_redemptions')
          .select('*')
          .eq('customer_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('referrals')
          .select('*')
          .or(`referrer_id.eq.${profile.id},referred_id.eq.${profile.id}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('notifications')
          .select('*')
          .eq('customer_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(50),
        isStaffOrAdmin
          ? supabase.from('profiles').select('*').order('created_at', { ascending: false })
          : Promise.resolve({ data: null }),
        isStaffOrAdmin
          ? supabase.from('employees').select('*').order('created_at', { ascending: false })
          : Promise.resolve({ data: null }),
        isStaffOrAdmin
          ? supabase
              .from('purchases')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(300)
          : Promise.resolve({ data: null }),
        isStaffOrAdmin
          ? supabase
              .from('points_transactions')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(400)
          : Promise.resolve({ data: null }),
        isStaffOrAdmin
          ? supabase
              .from('benefit_redemptions')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(300)
          : Promise.resolve({ data: null }),
        isAdmin
          ? supabase.from('campaigns').select('*').order('created_at', { ascending: false })
          : Promise.resolve({ data: null }),
        isAdmin
          ? supabase
              .from('audit_logs')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(300)
          : Promise.resolve({ data: null }),
      ]);

      return {
        profile,
        settings: catalog.settings,
        promotions: catalog.promotions,
        benefits: catalog.benefits,
        news: catalog.news,
        purchases: (myPurchasesRes.data || []).map(mapPurchaseRow),
        transactions: (myTxRes.data || []).map(mapTransactionRow),
        redemptions: (myRedemptionsRes.data || []).map(mapRedemptionRow),
        referrals: (myReferralsRes.data || []).map(mapReferralRow),
        notifications: (myNotificationsRes.data || []).map(mapNotificationRow),
        adminData: isStaffOrAdmin
          ? {
              profiles: (allProfilesRes.data || []).map(mapProfileRow),
              employees: (allEmployeesRes.data || []).map(mapEmployeeRow),
              purchases: (allPurchasesRes.data || []).map(mapPurchaseRow),
              transactions: (allTxRes.data || []).map(mapTransactionRow),
              redemptions: (allRedemptionsRes.data || []).map(mapRedemptionRow),
              campaigns: (allCampaignsRes.data || []).map(mapCampaignRow),
              auditLogs: (allAuditRes.data || []).map(mapAuditRow),
            }
          : null,
      };
    }
  },

  async updateMyProfile(input: {
    firstName: string;
    lastName: string;
    phone: string;
    birthDate: string;
    notificationPreferences: UserProfile['notificationPreferences'];
  }): Promise<UserProfile> {
    try {
      const res = await apiRequest<{ profile: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(input),
      });
      return res.profile;
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const { data, error } = await supabase.rpc('update_my_profile_safe', {
        p_first_name: input.firstName,
        p_last_name: input.lastName || '',
        p_phone: input.phone || '',
        p_birth_date: input.birthDate || '',
        p_notification_preferences: input.notificationPreferences,
      });
      if (error || !data) throw new Error(error?.message || 'Error al guardar el perfil.');
      return mapProfileRow(data as Record<string, any>);
    }
  },

  async claimBirthdayBonus(): Promise<{ bonusPoints: number; newBalance: number }> {
    try {
      return await apiRequest('/api/profile/birthday-bonus', { method: 'POST' });
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const { data, error } = await supabase.rpc('claim_birthday_bonus_atomic');
      if (error || !data) throw new Error(error?.message || 'Error al reclamar bonus de cumpleaños.');
      return data as { bonusPoints: number; newBalance: number };
    }
  },

  async applyReferralCode(code: string): Promise<{
    referrerName: string;
    referredBonus: number;
    referrerBonus: number;
    newBalance: number;
  }> {
    try {
      return await apiRequest('/api/profile/referral', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const { data, error } = await supabase.rpc('apply_referral_code_atomic', {
        p_code: code,
      });
      if (error || !data) throw new Error(error?.message || 'Error al aplicar el código de referido.');
      return data as {
        referrerName: string;
        referredBonus: number;
        referrerBonus: number;
        newBalance: number;
      };
    }
  },

  async markNotificationsRead(): Promise<void> {
    try {
      await apiRequest('/api/notifications/read', { method: 'POST' });
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('customer_id', user.id)
        .eq('is_read', false);
    }
  },

  async redeemBenefit(
    benefitId: string,
    idempotencyKey: string
  ): Promise<{
    redemptionId: string;
    redemptionCode: string;
    pointsSpent: number;
    newBalance: number;
    expiresAt: string;
  }> {
    try {
      return await apiRequest('/api/redemptions', {
        method: 'POST',
        body: JSON.stringify({ benefitId, idempotencyKey }),
      });
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const { data, error } = await supabase.rpc('redeem_benefit_atomic', {
        p_benefit_id: benefitId,
        p_idempotency_key: idempotencyKey,
      });
      if (error || !data) throw new Error(error?.message || 'No se pudo completar el canje.');
      return data as {
        redemptionId: string;
        redemptionCode: string;
        pointsSpent: number;
        newBalance: number;
        expiresAt: string;
      };
    }
  },

  async validateQrForStaff(qrToken: string): Promise<{ customer: ValidatedQrCustomer }> {
    try {
      return await apiRequest('/api/staff/validate-qr', {
        method: 'POST',
        body: JSON.stringify({ qrToken }),
      });
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const { data, error } = await supabase.rpc('validate_qr_for_staff', {
        p_query: qrToken,
      });
      if (error || !data) throw new Error(error?.message || 'Código QR no válido.');
      return { customer: data as ValidatedQrCustomer };
    }
  },

  async previewPointsForStaff(input: {
    amount: number;
    category: string;
    promotionId?: string;
  }): Promise<BackendPointsPreview> {
    try {
      return await apiRequest('/api/staff/preview-points', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const { data, error } = await supabase.rpc('preview_purchase_points', {
        p_amount: Number(input.amount),
        p_category: input.category,
        p_promotion_id: input.promotionId || null,
      });
      if (error || !data) throw new Error(error?.message || 'Error al previsualizar puntos.');
      return data as BackendPointsPreview;
    }
  },

  async registerPurchaseForStaff(input: {
    idempotencyKey: string;
    customerId: string;
    amount: number;
    category: string;
    promotionId?: string;
    notes?: string;
  }): Promise<{
    purchaseId: string;
    customerName: string;
    basePoints: number;
    promoPoints: number;
    totalPoints: number;
    newBalance: number;
  }> {
    try {
      return await apiRequest('/api/staff/register-purchase', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const { data, error } = await supabase.rpc('register_purchase_atomic', {
        p_idempotency_key: input.idempotencyKey,
        p_customer_id: input.customerId,
        p_amount: Number(input.amount),
        p_category: input.category,
        p_promotion_id: input.promotionId || null,
        p_notes: input.notes || '',
      });
      if (error || !data) throw new Error(error?.message || 'No se pudo registrar la compra.');
      return data as {
        purchaseId: string;
        customerName: string;
        basePoints: number;
        promoPoints: number;
        totalPoints: number;
        newBalance: number;
      };
    }
  },

  async validateRedemptionForStaff(redemptionCode: string): Promise<BenefitRedemptionRecord> {
    try {
      const res = await apiRequest<{ redemption: BenefitRedemptionRecord }>(
        '/api/staff/validate-redemption',
        {
          method: 'POST',
          body: JSON.stringify({ redemptionCode }),
        }
      );
      return res.redemption;
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const { data, error } = await supabase.rpc('validate_redemption_for_staff', {
        p_code: redemptionCode,
      });
      if (error || !data) throw new Error(error?.message || 'Error al validar el canje.');
      return mapRedemptionRow(data as Record<string, any>);
    }
  },

  async adjustPointsAdmin(input: {
    customerId: string;
    pointsDelta: number;
    reason: string;
  }): Promise<{ newBalance: number }> {
    try {
      return await apiRequest('/api/admin/adjust-points', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const { data, error } = await supabase.rpc('admin_adjust_points_atomic', {
        p_customer_id: input.customerId,
        p_points_delta: Math.trunc(Number(input.pointsDelta)),
        p_reason: input.reason,
      });
      if (error || !data) throw new Error(error?.message || 'Error al ajustar puntos.');
      return data as { newBalance: number };
    }
  },

  async voidPurchaseAdmin(input: {
    purchaseId: string;
    reason: string;
  }): Promise<{ purchaseId: string; newBalance: number }> {
    try {
      return await apiRequest('/api/admin/void-purchase', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const { data, error } = await supabase.rpc('void_purchase_atomic', {
        p_purchase_id: input.purchaseId,
        p_reason: input.reason,
      });
      if (error || !data) throw new Error(error?.message || 'Error al anular compra.');
      return data as { purchaseId: string; newBalance: number };
    }
  },

  async updateUserRoleStatusAdmin(input: {
    targetProfileId: string;
    role?: string;
    status?: string;
    employeePosition?: string;
    employeeBranch?: string;
  }): Promise<UserProfile> {
    try {
      const res = await apiRequest<{ profile: UserProfile }>('/api/admin/user-role-status', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return res.profile;
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const { data, error } = await supabase.rpc('admin_update_user_role_status', {
        p_target_profile_id: input.targetProfileId,
        p_role: input.role || null,
        p_status: input.status || null,
        p_employee_position: input.employeePosition || null,
        p_employee_branch: input.employeeBranch || null,
      });
      if (error || !data) throw new Error(error?.message || 'Error al actualizar permisos.');
      return mapProfileRow(data as Record<string, any>);
    }
  },

  async upsertPromotionAdmin(
    promo: Partial<PromotionItem> & { title: string; description: string }
  ): Promise<PromotionItem> {
    try {
      const res = await apiRequest<{ promotion: PromotionItem }>('/api/admin/promotions', {
        method: 'POST',
        body: JSON.stringify(promo),
      });
      return res.promotion;
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const id = promo.id || `promo-${Date.now()}`;
      const payload = {
        id,
        title: promo.title.trim(),
        description: promo.description.trim(),
        image_url: promo.imageUrl || GENERATED_IMAGES.heroPerfumery,
        category: promo.category || 'Todos',
        promo_type: promo.promoType || 'MULTIPLICADOR',
        multiplier: Math.max(1, Number(promo.multiplier ?? 1)),
        extra_points: Math.max(0, Math.trunc(Number(promo.extraPoints ?? 0))),
        min_purchase_amount: Math.max(0, Number(promo.minPurchaseAmount ?? 0)),
        start_date: promo.startDate || '2025-01-01',
        end_date: promo.endDate || '2027-12-31',
        usage_limit: Math.max(0, Math.trunc(Number(promo.usageLimit ?? 0))),
        is_active: Boolean(promo.isActive ?? true),
        terms_conditions: promo.termsConditions || '',
      };
      const { data, error } = await supabase
        .from('promotions')
        .upsert(payload)
        .select('*')
        .single();
      if (error || !data) throw new Error(error?.message || 'Error al guardar promoción.');
      return mapPromotionRow(data);
    }
  },

  async upsertBenefitAdmin(
    benefit: Partial<BenefitItem> & { title: string; description: string }
  ): Promise<BenefitItem> {
    try {
      const res = await apiRequest<{ benefit: BenefitItem }>('/api/admin/benefits', {
        method: 'POST',
        body: JSON.stringify(benefit),
      });
      return res.benefit;
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const id = benefit.id || `ben-${Date.now()}`;
      const payload = {
        id,
        title: benefit.title.trim(),
        description: benefit.description.trim(),
        image_url: benefit.imageUrl || GENERATED_IMAGES.benefitSkincare,
        points_required: Math.max(1, Math.trunc(Number(benefit.pointsRequired ?? 100))),
        category: benefit.category || 'Perfumería',
        start_date: benefit.startDate || '2025-01-01',
        end_date: benefit.endDate || '2027-12-31',
        is_active: Boolean(benefit.isActive ?? true),
        usage_limit: Math.max(0, Math.trunc(Number(benefit.usageLimit ?? 100))),
        stock_available: Math.max(0, Math.trunc(Number(benefit.stockAvailable ?? 0))),
        terms_conditions: benefit.termsConditions || '',
      };
      const { data, error } = await supabase
        .from('benefits')
        .upsert(payload)
        .select('*')
        .single();
      if (error || !data) throw new Error(error?.message || 'Error al guardar beneficio.');
      return mapBenefitRow(data);
    }
  },

  async upsertNewsAdmin(
    news: Partial<NewsItem> & { title: string; description: string }
  ): Promise<NewsItem> {
    try {
      const res = await apiRequest<{ news: NewsItem }>('/api/admin/news', {
        method: 'POST',
        body: JSON.stringify(news),
      });
      return res.news;
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const id = news.id || `news-${Date.now()}`;
      const payload = {
        id,
        title: news.title.trim(),
        summary: (news.summary || news.description).trim(),
        description: news.description.trim(),
        image_url: news.imageUrl || GENERATED_IMAGES.newsDermocosmetics,
        category: news.category || 'Novedades',
        is_published: Boolean(news.isPublished ?? true),
        published_at: news.publishedAt || new Date().toISOString().slice(0, 10),
      };
      const { data, error } = await supabase.from('news').upsert(payload).select('*').single();
      if (error || !data) throw new Error(error?.message || 'Error al guardar novedad.');
      return mapNewsRow(data);
    }
  },

  async createCampaignAdmin(input: {
    title: string;
    message: string;
    segment: string;
    scheduledAt: string;
    status: string;
  }): Promise<CampaignItem> {
    try {
      const res = await apiRequest<{ campaign: CampaignItem }>('/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return res.campaign;
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const { data, error } = await supabase.rpc('admin_create_campaign_atomic', {
        p_title: input.title,
        p_message: input.message,
        p_segment: input.segment,
        p_scheduled_at: input.scheduledAt,
        p_status: input.status,
      });
      if (error || !data) throw new Error(error?.message || 'Error al crear campaña.');
      return mapCampaignRow(data as Record<string, any>);
    }
  },

  async updateSettingsAdmin(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const res = await apiRequest<{ settings: AppSettings }>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      return res.settings;
    } catch (err) {
      if (!isApiRouteUnavailableError(err) || !supabase) throw err;
      const payload = {
        club_name: settings.clubName,
        club_subtitle: settings.clubSubtitle,
        logo_url: settings.logoUrl,
        primary_color: settings.primaryColor,
        secondary_color: settings.secondaryColor,
        accent_color: settings.accentColor,
        base_points_rate_locked: BASE_PESOS_PER_POINT,
        birthday_bonus_points: settings.birthdayBonusPoints,
        referrer_bonus_points: settings.referrerBonusPoints,
        referred_bonus_points: settings.referredBonusPoints,
        notifications_enabled: settings.notificationsEnabled,
        whatsapp_contact: settings.whatsappContact,
        address: settings.address,
        opening_hours: settings.openingHours,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('app_settings')
        .update(payload)
        .eq('id', 'mondino-global-settings')
        .select('*')
        .single();
      if (error || !data) throw new Error(error?.message || 'Error al guardar configuración.');
      return mapSettingsRow(data);
    }
  },
};
