import {
  createAnonServerClient,
  VerifiedAuthContext,
} from '../middleware/auth.ts';
import {
  BASE_PESOS_PER_POINT,
  BIRTHDAY_BONUS_POINTS,
  DEFAULT_APP_LOGO_URL,
  DEFAULT_APP_SETTINGS,
  GENERATED_IMAGES,
  REFERRER_BONUS_POINTS,
  REFERRED_BONUS_POINTS,
  decodeLogoAndBanner,
  encodeLogoAndBanner,
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
import {
  getArgentinaTodayParts,
  isTodayUsersBirthday,
  parseBirthDateParts,
} from '../utils/points.ts';

// ============================================================================
// MAPEO DE FILAS DE SUPABASE POSTGRESQL A TIPOS DE DOMINIO
// ============================================================================

export function mapProfileRow(row: Record<string, any>): UserProfile {
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

export function mapEmployeeRow(row: Record<string, any>): EmployeeRecord {
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

export function mapPromotionRow(row: Record<string, any>): PromotionItem {
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

export function mapPurchaseRow(row: Record<string, any>): PurchaseRecord {
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

export function mapTransactionRow(row: Record<string, any>): PointsTransactionRecord {
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

export function mapBenefitRow(row: Record<string, any>): BenefitItem {
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

export function mapRedemptionRow(row: Record<string, any>): BenefitRedemptionRecord {
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

export function mapNewsRow(row: Record<string, any>): NewsItem {
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

export function mapCampaignRow(row: Record<string, any>): CampaignItem {
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

export function mapReferralRow(row: Record<string, any>): ReferralRecord {
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

export function mapNotificationRow(row: Record<string, any>): NotificationItem {
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

export function mapAuditRow(row: Record<string, any>): AuditLogRecord {
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

export function mapSettingsRow(row?: Record<string, any> | null): AppSettings {
  if (!row) return DEFAULT_APP_SETTINGS;

  const rawWhatsapp = String(row.whatsapp_contact || '').trim();
  const rawAddress = String(row.address || '').trim();
  const rawHours = String(row.opening_hours || '').trim();

  const isLegacyWhatsapp =
    !rawWhatsapp ||
    rawWhatsapp === '+54 9 3492 555-0192' ||
    rawWhatsapp === '+54 9 3492 42-0000';
  const isLegacyAddress =
    !rawAddress ||
    rawAddress === 'Av. Santa Fe 1240, Centro' ||
    rawAddress === 'Av. Santa Fe 1250, Rafaela, Santa Fe';
  const isLegacyHours =
    !rawHours ||
    rawHours === 'Lun a Sáb de 8:00 a 21:00 hs' ||
    rawHours === 'Lun a Sáb de 08:00 a 21:00 hs';

  const decodedLogos = decodeLogoAndBanner(row.logo_url);

  return {
    id: row.id || DEFAULT_APP_SETTINGS.id,
    clubName: row.club_name || DEFAULT_APP_SETTINGS.clubName,
    clubSubtitle: row.club_subtitle || DEFAULT_APP_SETTINGS.clubSubtitle,
    logoUrl: decodedLogos.logoUrl,
    appLogoUrl: decodedLogos.appLogoUrl,
    primaryColor: row.primary_color || DEFAULT_APP_SETTINGS.primaryColor,
    secondaryColor: row.secondary_color || DEFAULT_APP_SETTINGS.secondaryColor,
    accentColor: row.accent_color || DEFAULT_APP_SETTINGS.accentColor,
    basePointsRateLocked: BASE_PESOS_PER_POINT,
    birthdayBonusPoints: BIRTHDAY_BONUS_POINTS,
    referrerBonusPoints: REFERRER_BONUS_POINTS,
    referredBonusPoints: REFERRED_BONUS_POINTS,
    notificationsEnabled: Boolean(
      row.notifications_enabled ?? DEFAULT_APP_SETTINGS.notificationsEnabled
    ),
    whatsappContact: isLegacyWhatsapp ? DEFAULT_APP_SETTINGS.whatsappContact : rawWhatsapp,
    address: isLegacyAddress ? DEFAULT_APP_SETTINGS.address : rawAddress,
    openingHours: isLegacyHours ? DEFAULT_APP_SETTINGS.openingHours : rawHours,
  };
}

async function syncFixedSettingsInSupabase(auth: VerifiedAuthContext): Promise<void> {
  try {
    const { data: currentRow } = await auth.userClient
      .from('app_settings')
      .select('birthday_bonus_points, referrer_bonus_points, referred_bonus_points')
      .eq('id', 'mondino-global-settings')
      .maybeSingle();

    if (
      currentRow &&
      (Number(currentRow.birthday_bonus_points) !== BIRTHDAY_BONUS_POINTS ||
        Number(currentRow.referrer_bonus_points) !== REFERRER_BONUS_POINTS ||
        Number(currentRow.referred_bonus_points) !== REFERRED_BONUS_POINTS)
    ) {
      const updatePayload = {
        birthday_bonus_points: BIRTHDAY_BONUS_POINTS,
        referrer_bonus_points: REFERRER_BONUS_POINTS,
        referred_bonus_points: REFERRED_BONUS_POINTS,
        updated_at: new Date().toISOString(),
      };
      const { error } = await auth.adminClient
        .from('app_settings')
        .update(updatePayload)
        .eq('id', 'mondino-global-settings');
      if (error) {
        await auth.userClient
          .from('app_settings')
          .update(updatePayload)
          .eq('id', 'mondino-global-settings');
      }
    }
  } catch {
    // Sincronización silenciosa en caso de rol sin permisos de escritura en app_settings
  }
}

// ============================================================================
// OPERACIONES DEL REPOSITORIO BACKEND (SUPABASE POSTGRESQL + RLS + RPC)
// ============================================================================

export async function getPublicCatalogFromSupabase(
  customClient?: ReturnType<typeof createAnonServerClient>
) {
  const client = customClient || createAnonServerClient();
  if (!client) {
    return {
      settings: DEFAULT_APP_SETTINGS,
      promotions: [] as PromotionItem[],
      benefits: [] as BenefitItem[],
      news: [] as NewsItem[],
    };
  }

  const [settingsRes, promosRes, benefitsRes, newsRes] = await Promise.all([
    client.from('app_settings').select('*').eq('id', 'mondino-global-settings').maybeSingle(),
    client.from('promotions').select('*').order('created_at', { ascending: false }),
    client.from('benefits').select('*').order('points_required', { ascending: true }),
    client.from('news').select('*').order('published_at', { ascending: false }),
  ]);

  return {
    settings: mapSettingsRow(settingsRes.data),
    promotions: (promosRes.data || []).map(mapPromotionRow),
    benefits: (benefitsRes.data || []).map(mapBenefitRow),
    news: (newsRes.data || []).map(mapNewsRow),
  };
}

export async function getBootstrapStateFromSupabase(auth: VerifiedAuthContext) {
  await syncFixedSettingsInSupabase(auth);

  const { data: rpcProfile, error: rpcErr } = await auth.userClient.rpc('ensure_my_profile');
  if (rpcErr || !rpcProfile) {
    throw new Error(rpcErr?.message || 'No se pudo inicializar el perfil de usuario en Supabase.');
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
    getPublicCatalogFromSupabase(auth.userClient),
    auth.userClient
      .from('purchases')
      .select('*')
      .eq('customer_id', profile.id)
      .order('created_at', { ascending: false }),
    auth.userClient
      .from('points_transactions')
      .select('*')
      .eq('customer_id', profile.id)
      .order('created_at', { ascending: false }),
    auth.userClient
      .from('benefit_redemptions')
      .select('*')
      .eq('customer_id', profile.id)
      .order('created_at', { ascending: false }),
    auth.userClient
      .from('referrals')
      .select('*')
      .or(`referrer_id.eq.${profile.id},referred_id.eq.${profile.id}`)
      .order('created_at', { ascending: false }),
    auth.userClient
      .from('notifications')
      .select('*')
      .eq('customer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50),
    isStaffOrAdmin
      ? auth.userClient.from('profiles').select('*').order('created_at', { ascending: false })
      : Promise.resolve({ data: null }),
    isStaffOrAdmin
      ? auth.userClient.from('employees').select('*').order('created_at', { ascending: false })
      : Promise.resolve({ data: null }),
    isStaffOrAdmin
      ? auth.userClient
          .from('purchases')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300)
      : Promise.resolve({ data: null }),
    isStaffOrAdmin
      ? auth.userClient
          .from('points_transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(400)
      : Promise.resolve({ data: null }),
    isStaffOrAdmin
      ? auth.userClient
          .from('benefit_redemptions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300)
      : Promise.resolve({ data: null }),
    isAdmin
      ? auth.userClient.from('campaigns').select('*').order('created_at', { ascending: false })
      : Promise.resolve({ data: null }),
    isAdmin
      ? auth.userClient
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300)
      : Promise.resolve({ data: null }),
  ]);

  const mappedNotifications = (myNotificationsRes.data || []).map(mapNotificationRow);
  const todayParts = getArgentinaTodayParts();
  if (
    profile.birthDate &&
    isTodayUsersBirthday(profile.birthDate) &&
    (profile.birthdayBonusClaimedYear || 0) < todayParts.year &&
    !mappedNotifications.some((n) => n.id === `notif-bday-${todayParts.year}`)
  ) {
    mappedNotifications.unshift({
      id: `notif-bday-${todayParts.year}`,
      customerId: profile.id,
      type: 'CUMPLEANOS',
      title: `¡Feliz cumpleaños, ${profile.firstName}! 🎂`,
      message: `Hoy tenés disponibles +${BIRTHDAY_BONUS_POINTS} puntos de regalo en Mondino Club. Ingresá a Mi Perfil o Inicio para acreditarlos.`,
      isRead: false,
      actionUrl: '/perfil',
      createdAt: new Date().toISOString(),
    });
  }

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
    notifications: mappedNotifications,
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

export async function updateMyProfileInSupabase(
  auth: VerifiedAuthContext,
  input: {
    firstName: string;
    lastName: string;
    phone: string;
    birthDate: string;
    notificationPreferences: UserProfile['notificationPreferences'];
  }
): Promise<UserProfile> {
  const { data: currentRpc, error: currentErr } = await auth.userClient.rpc('ensure_my_profile');
  if (currentErr || !currentRpc) {
    throw new Error(currentErr?.message || 'No se pudo verificar el perfil actual.');
  }
  const currentProfile = mapProfileRow(currentRpc as Record<string, any>);
  const existingBirthDate = (currentProfile.birthDate || '').trim();
  const requestedBirthDate = (input.birthDate || '').trim();

  // Una vez guardada la fecha de cumpleaños, queda bloqueada y no se puede modificar
  const lockedBirthDate = existingBirthDate ? existingBirthDate : requestedBirthDate;

  const { data, error } = await auth.userClient.rpc('update_my_profile_safe', {
    p_first_name: input.firstName,
    p_last_name: input.lastName || '',
    p_phone: input.phone || '',
    p_birth_date: lockedBirthDate,
    p_notification_preferences: input.notificationPreferences,
  });

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo actualizar el perfil.');
  }

  return mapProfileRow(data as Record<string, any>);
}

export async function claimBirthdayBonusInSupabase(
  auth: VerifiedAuthContext
): Promise<{ bonusPoints: number; newBalance: number }> {
  await syncFixedSettingsInSupabase(auth);

  const { data: currentRpc, error: currentErr } = await auth.userClient.rpc('ensure_my_profile');
  if (currentErr || !currentRpc) {
    throw new Error(currentErr?.message || 'No se pudo verificar el perfil.');
  }
  const profile = mapProfileRow(currentRpc as Record<string, any>);

  if (!profile.birthDate || !profile.birthDate.trim()) {
    throw new Error('Primero debés completar y guardar tu fecha de cumpleaños en tu perfil.');
  }

  if (!isTodayUsersBirthday(profile.birthDate)) {
    const parsed = parseBirthDateParts(profile.birthDate);
    throw new Error(
      `El beneficio de cumpleaños solo se puede recibir el día de tu cumpleaños (${parsed?.formattedDayMonth || profile.birthDate}).`
    );
  }

  const { data, error } = await auth.userClient.rpc('claim_birthday_bonus_atomic');
  if (error || !data) {
    throw new Error(error?.message || 'No se pudo reclamar el bonus de cumpleaños.');
  }
  return data as { bonusPoints: number; newBalance: number };
}

export async function applyReferralCodeInSupabase(
  auth: VerifiedAuthContext,
  code: string
): Promise<{
  referrerName: string;
  referredBonus: number;
  referrerBonus: number;
  newBalance: number;
}> {
  await syncFixedSettingsInSupabase(auth);

  const { data, error } = await auth.userClient.rpc('apply_referral_code_atomic', {
    p_code: code,
  });
  if (error || !data) {
    throw new Error(error?.message || 'No se pudo aplicar el código de referido.');
  }
  return data as {
    referrerName: string;
    referredBonus: number;
    referrerBonus: number;
    newBalance: number;
  };
}

export async function markNotificationsReadInSupabase(
  auth: VerifiedAuthContext
): Promise<void> {
  const { error } = await auth.userClient
    .from('notifications')
    .update({ is_read: true })
    .eq('customer_id', auth.user.id)
    .eq('is_read', false);

  if (error) {
    throw new Error(error.message || 'No se pudieron marcar las notificaciones como leídas.');
  }
}

export async function redeemBenefitInSupabase(
  auth: VerifiedAuthContext,
  benefitId: string,
  idempotencyKey: string
): Promise<{
  redemptionId: string;
  redemptionCode: string;
  pointsSpent: number;
  newBalance: number;
  expiresAt: string;
}> {
  const { data, error } = await auth.userClient.rpc('redeem_benefit_atomic', {
    p_benefit_id: benefitId,
    p_idempotency_key: idempotencyKey,
  });

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo procesar el canje del beneficio.');
  }

  return data as {
    redemptionId: string;
    redemptionCode: string;
    pointsSpent: number;
    newBalance: number;
    expiresAt: string;
  };
}

export async function validateQrForStaffInSupabase(
  auth: VerifiedAuthContext,
  qrTokenOrEmail: string
): Promise<{ customer: ValidatedQrCustomer }> {
  const cleanQuery = qrTokenOrEmail.trim();
  const { data, error } = await auth.userClient.rpc('validate_qr_for_staff', {
    p_query: cleanQuery,
  });

  if (!error && data) {
    return { customer: data as ValidatedQrCustomer };
  }

  const client = auth.adminClient || auth.userClient;
  const { data: rows, error: fallbackErr } = await client
    .from('profiles')
    .select('*')
    .or(`qr_token.ilike.${cleanQuery},email.ilike.${cleanQuery}`)
    .limit(1);

  if (!fallbackErr && rows && rows.length > 0) {
    const r = rows[0];
    const firstName = String(r.first_name ?? '');
    const lastName = String(r.last_name ?? '');
    const email = String(r.email ?? '');
    return {
      customer: {
        id: String(r.id),
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim() || email,
        email,
        maskedEmail: email,
        qrToken: String(r.qr_token ?? ''),
        pointsBalance: Number(r.points_balance ?? 0),
        status: String(r.status ?? 'ACTIVO'),
        birthDate: String(r.birth_date ?? ''),
      },
    };
  }

  throw new Error(error?.message || 'No se pudo validar el código QR del cliente.');
}

export async function previewPointsForStaffInSupabase(
  auth: VerifiedAuthContext,
  input: { amount: number; category: string; promotionId?: string }
): Promise<BackendPointsPreview> {
  const { data, error } = await auth.userClient.rpc('preview_purchase_points', {
    p_amount: Number(input.amount),
    p_category: input.category,
    p_promotion_id: input.promotionId || null,
  });

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo previsualizar el cálculo de puntos.');
  }

  return data as BackendPointsPreview;
}

export async function registerPurchaseForStaffInSupabase(
  auth: VerifiedAuthContext,
  input: {
    idempotencyKey: string;
    customerId: string;
    amount: number;
    category: string;
    promotionId?: string;
    notes?: string;
  }
): Promise<{
  purchaseId: string;
  customerName: string;
  basePoints: number;
  promoPoints: number;
  totalPoints: number;
  newBalance: number;
}> {
  const { data, error } = await auth.userClient.rpc('register_purchase_atomic', {
    p_idempotency_key: input.idempotencyKey,
    p_customer_id: input.customerId,
    p_amount: Number(input.amount),
    p_category: input.category,
    p_promotion_id: input.promotionId || null,
    p_notes: input.notes || '',
  });

  if (error || !data) {
    throw new Error(error?.message || 'Error al registrar la compra.');
  }

  return data as {
    purchaseId: string;
    customerName: string;
    basePoints: number;
    promoPoints: number;
    totalPoints: number;
    newBalance: number;
  };
}

export async function validateRedemptionForStaffInSupabase(
  auth: VerifiedAuthContext,
  code: string
): Promise<BenefitRedemptionRecord> {
  const { data, error } = await auth.userClient.rpc('validate_redemption_for_staff', {
    p_code: code,
  });

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo validar el código de canje.');
  }

  return mapRedemptionRow(data as Record<string, any>);
}

export async function adjustPointsAdminInSupabase(
  auth: VerifiedAuthContext,
  input: { customerId: string; pointsDelta: number; reason: string }
): Promise<{ newBalance: number }> {
  const { data, error } = await auth.userClient.rpc('admin_adjust_points_atomic', {
    p_customer_id: input.customerId,
    p_points_delta: Math.trunc(Number(input.pointsDelta)),
    p_reason: input.reason,
  });

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo realizar el ajuste manual de puntos.');
  }

  return data as { newBalance: number };
}

export async function voidPurchaseAdminInSupabase(
  auth: VerifiedAuthContext,
  input: { purchaseId: string; reason: string }
): Promise<{ purchaseId: string; newBalance: number }> {
  const { data, error } = await auth.userClient.rpc('void_purchase_atomic', {
    p_purchase_id: input.purchaseId,
    p_reason: input.reason,
  });

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo anular la compra.');
  }

  return data as { purchaseId: string; newBalance: number };
}

export async function updateUserRoleStatusAdminInSupabase(
  auth: VerifiedAuthContext,
  input: {
    targetProfileId: string;
    role?: string;
    status?: string;
    employeePosition?: string;
    employeeBranch?: string;
  }
): Promise<UserProfile> {
  const { data, error } = await auth.userClient.rpc('admin_update_user_role_status', {
    p_target_profile_id: input.targetProfileId,
    p_role: input.role || null,
    p_status: input.status || null,
    p_employee_position: input.employeePosition || null,
    p_employee_branch: input.employeeBranch || null,
  });

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo actualizar el rol o estado de la cuenta.');
  }

  return mapProfileRow(data as Record<string, any>);
}

async function verifyActiveStaffOrAdminProfile(auth: VerifiedAuthContext): Promise<UserProfile> {
  const { data: rpcProfile, error: rpcErr } = await auth.userClient.rpc('ensure_my_profile');
  if (rpcErr || !rpcProfile) {
    throw new Error(rpcErr?.message || 'No se pudo verificar el perfil del operador.');
  }
  const profile = mapProfileRow(rpcProfile as Record<string, any>);
  if (
    profile.status !== AccountStatus.ACTIVO ||
    (profile.role !== UserRole.ADMINISTRADOR && profile.role !== UserRole.EMPLEADO)
  ) {
    throw new Error(
      'Acceso denegado: solo el Administrador o los Empleados autorizados pueden modificar imágenes, beneficios y novedades.'
    );
  }
  return profile;
}

export async function upsertPromotionAdminInSupabase(
  auth: VerifiedAuthContext,
  promo: Partial<PromotionItem> & { title: string; description: string }
): Promise<PromotionItem> {
  const actor = await verifyActiveStaffOrAdminProfile(auth);
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
    created_by: actor.id,
  };

  let { data, error } = await auth.adminClient
    .from('promotions')
    .upsert(payload)
    .select('*')
    .single();

  if (error || !data) {
    const fallback = await auth.userClient
      .from('promotions')
      .upsert(payload)
      .select('*')
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo guardar la promoción.');
  }

  return mapPromotionRow(data);
}

export async function upsertBenefitAdminInSupabase(
  auth: VerifiedAuthContext,
  benefit: Partial<BenefitItem> & { title: string; description: string }
): Promise<BenefitItem> {
  await verifyActiveStaffOrAdminProfile(auth);
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

  let { data, error } = await auth.adminClient
    .from('benefits')
    .upsert(payload)
    .select('*')
    .single();

  if (error || !data) {
    const fallback = await auth.userClient
      .from('benefits')
      .upsert(payload)
      .select('*')
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo guardar el beneficio.');
  }

  return mapBenefitRow(data);
}

export async function upsertNewsAdminInSupabase(
  auth: VerifiedAuthContext,
  news: Partial<NewsItem> & { title: string; description: string }
): Promise<NewsItem> {
  const actor = await verifyActiveStaffOrAdminProfile(auth);
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
    created_by: actor.email || 'Farmacia y Perfumería Mondino',
  };

  let { data, error } = await auth.adminClient
    .from('news')
    .upsert(payload)
    .select('*')
    .single();

  if (error || !data) {
    const fallback = await auth.userClient
      .from('news')
      .upsert(payload)
      .select('*')
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo guardar la novedad.');
  }

  return mapNewsRow(data);
}

export async function createCampaignAdminInSupabase(
  auth: VerifiedAuthContext,
  input: {
    title: string;
    message: string;
    segment: string;
    scheduledAt: string;
    status: string;
  }
): Promise<CampaignItem> {
  const { data, error } = await auth.userClient.rpc('admin_create_campaign_atomic', {
    p_title: input.title,
    p_message: input.message,
    p_segment: input.segment,
    p_scheduled_at: input.scheduledAt,
    p_status: input.status,
  });

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo crear la campaña segmentada.');
  }

  return mapCampaignRow(data as Record<string, any>);
}

export async function updateSettingsAdminInSupabase(
  auth: VerifiedAuthContext,
  settings: Partial<AppSettings>
): Promise<AppSettings> {
  const actor = await verifyActiveStaffOrAdminProfile(auth);
  const currentCatalog = await getPublicCatalogFromSupabase(auth.userClient);
  const current = currentCatalog.settings;

  // Empleados y Administrador pueden actualizar la imagen principal de la web (logoUrl) y el logotipo de la app (appLogoUrl);
  // Administrador puede actualizar todos los parámetros globales (excepto la regla base inmutable $100 = 1 pto)
  const isFullAdmin = actor.role === UserRole.ADMINISTRADOR;
  const nextBannerUrl = settings.logoUrl || current.logoUrl || DEFAULT_APP_SETTINGS.logoUrl;
  const nextAppLogoUrl = DEFAULT_APP_LOGO_URL;

  const payload = {
    id: 'mondino-global-settings',
    club_name: isFullAdmin ? settings.clubName || current.clubName : current.clubName,
    club_subtitle: isFullAdmin
      ? settings.clubSubtitle || current.clubSubtitle
      : current.clubSubtitle,
    logo_url: encodeLogoAndBanner(nextBannerUrl, nextAppLogoUrl),
    primary_color: isFullAdmin
      ? settings.primaryColor || current.primaryColor
      : current.primaryColor,
    secondary_color: isFullAdmin
      ? settings.secondaryColor || current.secondaryColor
      : current.secondaryColor,
    accent_color: isFullAdmin ? settings.accentColor || current.accentColor : current.accentColor,
    base_points_rate_locked: BASE_PESOS_PER_POINT, // SIEMPRE 100 ($100 = 1 punto)
    birthday_bonus_points: BIRTHDAY_BONUS_POINTS, // 20 puntos por cumpleaños
    referrer_bonus_points: REFERRER_BONUS_POINTS, // 15 puntos por invitar a un amigo
    referred_bonus_points: REFERRED_BONUS_POINTS, // 10 puntos por ser invitado
    notifications_enabled: isFullAdmin
      ? Boolean(settings.notificationsEnabled ?? current.notificationsEnabled)
      : current.notificationsEnabled,
    whatsapp_contact: isFullAdmin
      ? settings.whatsappContact || current.whatsappContact
      : current.whatsappContact,
    address: isFullAdmin ? settings.address || current.address : current.address,
    opening_hours: isFullAdmin
      ? settings.openingHours || current.openingHours
      : current.openingHours,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await auth.adminClient
    .from('app_settings')
    .update(payload)
    .eq('id', 'mondino-global-settings')
    .select('*')
    .single();

  if (error || !data) {
    const fallback = await auth.userClient
      .from('app_settings')
      .update(payload)
      .eq('id', 'mondino-global-settings')
      .select('*')
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo actualizar la configuración.');
  }

  return mapSettingsRow(data);
}
