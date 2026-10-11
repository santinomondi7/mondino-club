import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  BASE_PESOS_PER_POINT,
  BIRTHDAY_BONUS_POINTS,
  DEFAULT_APP_SETTINGS,
  GENERATED_IMAGES,
  REFERRER_BONUS_POINTS,
  REFERRED_BONUS_POINTS,
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
  maskCustomerEmail,
  parseBirthDateParts,
} from '../utils/points.ts';

interface PreviewDatabaseState {
  settings: AppSettings;
  profiles: UserProfile[];
  employees: EmployeeRecord[];
  promotions: PromotionItem[];
  benefits: BenefitItem[];
  news: NewsItem[];
  purchases: PurchaseRecord[];
  transactions: PointsTransactionRecord[];
  redemptions: BenefitRedemptionRecord[];
  referrals: ReferralRecord[];
  notifications: NotificationItem[];
  campaigns: CampaignItem[];
  auditLogs: AuditLogRecord[];
}

const STATE_FILE = path.join(process.cwd(), '.mondino-preview-db.json');
const TOKEN_SECRET = process.env.GEMINI_API_KEY || 'mondino-club-server-hmac-secret-2026';

function createInitialState(): PreviewDatabaseState {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const adminProfile: UserProfile = {
    id: 'usr-admin-santino',
    uid: 'usr-admin-santino',
    email: 'santinomondi2010@gmail.com',
    firstName: 'Santino',
    lastName: 'Mondino',
    avatarUrl: '',
    phone: '+54 9 3492 42-0000',
    birthDate: '1995-05-15',
    role: UserRole.ADMINISTRADOR,
    status: AccountStatus.ACTIVO,
    qrToken: 'MND-QR-ADMIN-001A',
    referralCode: 'SANT-1001',
    referredById: null,
    notificationPreferences: {
      promotions: true,
      benefits: true,
      expiring: true,
      birthday: true,
      news: true,
    },
    pointsBalance: 1450,
    createdAt: now,
    updatedAt: now,
  };

  const staffProfile: UserProfile = {
    id: 'usr-staff-mostrador',
    uid: 'usr-staff-mostrador',
    email: 'mostrador@farmaciamondino.com',
    firstName: 'Lucía',
    lastName: 'Peralta (Farmacéutica)',
    avatarUrl: '',
    phone: '+54 9 3492 51-2233',
    birthDate: '1992-08-20',
    role: UserRole.EMPLEADO,
    status: AccountStatus.ACTIVO,
    qrToken: 'MND-QR-STAFF-002B',
    referralCode: 'LUCI-2002',
    referredById: null,
    notificationPreferences: {
      promotions: true,
      benefits: true,
      expiring: true,
      birthday: true,
      news: true,
    },
    pointsBalance: 420,
    createdAt: now,
    updatedAt: now,
  };

  const client1: UserProfile = {
    id: 'usr-cli-valeria',
    uid: 'usr-cli-valeria',
    email: 'valeria.gomez@gmail.com',
    firstName: 'Valeria',
    lastName: 'Gómez',
    avatarUrl: '',
    phone: '+54 9 3492 60-1122',
    birthDate: '1990-10-12',
    role: UserRole.CLIENTE,
    status: AccountStatus.ACTIVO,
    qrToken: 'MND-QR-CLI01-74829B',
    referralCode: 'VALE-7482',
    referredById: null,
    notificationPreferences: {
      promotions: true,
      benefits: true,
      expiring: true,
      birthday: true,
      news: true,
    },
    pointsBalance: 1250,
    createdAt: now,
    updatedAt: now,
  };

  const client2: UserProfile = {
    id: 'usr-cli-martin',
    uid: 'usr-cli-martin',
    email: 'martin.castellanos@gmail.com',
    firstName: 'Martín',
    lastName: 'Castellanos',
    avatarUrl: '',
    phone: '+54 9 3492 64-8899',
    birthDate: '1986-03-22',
    role: UserRole.CLIENTE,
    status: AccountStatus.ACTIVO,
    qrToken: 'MND-QR-CLI02-91834C',
    referralCode: 'MART-9183',
    referredById: client1.id,
    notificationPreferences: {
      promotions: true,
      benefits: true,
      expiring: true,
      birthday: true,
      news: true,
    },
    pointsBalance: 580,
    createdAt: now,
    updatedAt: now,
  };

  const promotions: PromotionItem[] = [
    {
      id: 'promo-dermo-x2',
      title: 'Semana Dermocosmética: Puntos x2',
      description:
        'Duplicá tus puntos base en todas las líneas de cuidado facial, serums y fotoprotección dermatológica.',
      imageUrl: GENERATED_IMAGES.newsDermocosmetics,
      category: 'Dermocosmética',
      promoType: 'MULTIPLICADOR',
      multiplier: 2,
      extraPoints: 0,
      minPurchaseAmount: 15000,
      startDate: '2025-01-01',
      endDate: '2027-12-31',
      usageLimit: 500,
      currentUsages: 14,
      isActive: true,
      termsConditions:
        'Válido en compras superiores a $15.000 presentando QR de Mondino Club.',
      createdBy: adminProfile.id,
      createdAt: now,
    },
    {
      id: 'promo-perfumeria-plus150',
      title: 'Especial Fragancias Selectivas (+150 pts)',
      description:
        'Sumá 150 puntos extra adicionales a tus puntos base ($1.000 = 1 punto) comprando fragancias importadas seleccionadas.',
      imageUrl: GENERATED_IMAGES.heroPerfumery,
      category: 'Perfumería',
      promoType: 'PUNTOS_EXTRA',
      multiplier: 1,
      extraPoints: 150,
      minPurchaseAmount: 40000,
      startDate: '2025-01-01',
      endDate: '2027-12-31',
      usageLimit: 300,
      currentUsages: 9,
      isActive: true,
      termsConditions: 'Acumulable con la regla base permanente ($1.000 = 1 punto).',
      createdBy: adminProfile.id,
      createdAt: now,
    },
  ];

  const benefits: BenefitItem[] = [
    {
      id: 'ben-kit-skincare',
      title: 'Kit Rutina Hidratación Termal + Neceser Mondino',
      description:
        'Incluye agua termal 150ml, emulsión hidratante hipoalergénica y neceser exclusivo de Farmacia Mondino.',
      imageUrl: GENERATED_IMAGES.benefitSkincare,
      pointsRequired: 450,
      category: 'Dermocosmética',
      startDate: '2025-01-01',
      endDate: '2027-12-31',
      isActive: true,
      usageLimit: 100,
      stockAvailable: 25,
      termsConditions: 'Presentar código único de canje y DNI en mostrador.',
      createdAt: now,
    },
    {
      id: 'ben-voucher-perfumeria',
      title: 'Voucher $15.000 en Perfumería Selectiva',
      description:
        'Descuento directo sobre fragancias importadas y cofres de regalo en sucursal.',
      imageUrl: GENERATED_IMAGES.benefitFragrance,
      pointsRequired: 600,
      category: 'Perfumería',
      startDate: '2025-01-01',
      endDate: '2027-12-31',
      isActive: true,
      usageLimit: 100,
      stockAvailable: 40,
      termsConditions: 'Válido para compras superiores a $50.000 en el sector Perfumería.',
      createdAt: now,
    },
    {
      id: 'ben-cuidado-capilar',
      title: 'Set Reparación Capilar Intensiva Profesional',
      description:
        'Shampoo + máscara nutritiva con óleo de argán y keratina dermatológicamente testeada.',
      imageUrl: GENERATED_IMAGES.benefitSkincare,
      pointsRequired: 320,
      category: 'Cuidado Personal',
      startDate: '2025-01-01',
      endDate: '2027-12-31',
      isActive: true,
      usageLimit: 100,
      stockAvailable: 30,
      termsConditions: 'Sujeto a disponibilidad de stock en sucursal.',
      createdAt: now,
    },
  ];

  const news: NewsItem[] = [
    {
      id: 'news-diagnostico-piel',
      title: 'Jornada de Diagnóstico Dermo-Facial Sin Cargo para Socios',
      summary:
        'Reservá tu turno con nuestras especialistas en dermocosmética y descubrí tu rutina ideal.',
      description:
        'Durante todo el mes en Farmacia y Perfumería Mondino realizamos análisis dermo-facial digital para socios de Mondino Club. Además, todas tus compras en el sector suman puntos automáticamente presentando tu QR personal.',
      imageUrl: GENERATED_IMAGES.newsDermocosmetics,
      category: 'Eventos',
      isPublished: true,
      publishedAt: today,
      createdBy: 'Farmacia y Perfumería Mondino',
      createdAt: now,
    },
    {
      id: 'news-fragancias-temporada',
      title: 'Nuevas Fragancias Internacionales en Perfumería Mondino',
      summary: 'Conocé los lanzamientos exclusivos de temporada y multiplicá tus puntos.',
      description:
        'Ya ingresaron las nuevas colecciones de eau de parfum importados. Acercate a nuestro espacio de perfumería para probarlas y acumular puntos con cada compra ($1.000 = 1 punto garantizado).',
      imageUrl: GENERATED_IMAGES.heroPerfumery,
      category: 'Lanzamientos',
      isPublished: true,
      publishedAt: today,
      createdBy: 'Farmacia y Perfumería Mondino',
      createdAt: now,
    },
  ];

  const purchases: PurchaseRecord[] = [
    {
      id: 'pur-init-1001',
      idempotencyKey: 'idem-init-1001',
      customerId: client1.id,
      employeeId: staffProfile.id,
      amount: 50000,
      category: 'Dermocosmética',
      basePoints: 50,
      promoPoints: 50,
      totalPoints: 100,
      promotionId: 'promo-dermo-x2',
      notes: 'Serum Ácido Hialurónico + Fotoprotector ISDIN Fusion Water',
      status: 'COMPLETADA',
      createdAt: now,
    },
    {
      id: 'pur-init-1002',
      idempotencyKey: 'idem-init-1002',
      customerId: adminProfile.id,
      employeeId: staffProfile.id,
      amount: 100000,
      category: 'Perfumería',
      basePoints: 100,
      promoPoints: 150,
      totalPoints: 250,
      promotionId: 'promo-perfumeria-plus150',
      notes: 'Eau de Parfum Importado 100ml',
      status: 'COMPLETADA',
      createdAt: now,
    },
  ];

  const transactions: PointsTransactionRecord[] = [
    {
      id: 'tx-init-1',
      customerId: client1.id,
      purchaseId: 'pur-init-1001',
      promotionId: null,
      amount: 50,
      balanceAfter: 300,
      type: 'COMPRA_BASE',
      description: 'Puntos base ($1.000 = 1 pto) — Compra en Dermocosmética ($50.000)',
      idempotencyKey: 'idem-init-1001-base',
      createdBy: staffProfile.email,
      createdAt: now,
    },
    {
      id: 'tx-init-2',
      customerId: client1.id,
      purchaseId: 'pur-init-1001',
      promotionId: 'promo-dermo-x2',
      amount: 50,
      balanceAfter: 350,
      type: 'PROMOCION_COMPRA',
      description: 'Bonificación promoción: Semana Dermocosmética: Puntos x2',
      idempotencyKey: 'idem-init-1001-promo',
      createdBy: staffProfile.email,
      createdAt: now,
    },
    {
      id: 'tx-init-3',
      customerId: adminProfile.id,
      purchaseId: 'pur-init-1002',
      promotionId: null,
      amount: 100,
      balanceAfter: 400,
      type: 'COMPRA_BASE',
      description: 'Puntos base ($1.000 = 1 pto) — Compra en Perfumería ($100.000)',
      idempotencyKey: 'idem-init-1002-base',
      createdBy: staffProfile.email,
      createdAt: now,
    },
    {
      id: 'tx-init-4',
      customerId: adminProfile.id,
      purchaseId: 'pur-init-1002',
      promotionId: 'promo-perfumeria-plus150',
      amount: 150,
      balanceAfter: 1450,
      type: 'PROMOCION_COMPRA',
      description: 'Bonificación promoción: Especial Fragancias Selectivas (+150 pts)',
      idempotencyKey: 'idem-init-1002-promo',
      createdBy: staffProfile.email,
      createdAt: now,
    },
  ];

  const redemptions: BenefitRedemptionRecord[] = [
    {
      id: 'red-init-01',
      benefitId: 'ben-cuidado-capilar',
      customerId: client1.id,
      pointsSpent: 320,
      redemptionCode: 'MND-8F4A2C',
      status: 'DISPONIBLE',
      expiresAt: '2026-12-31',
      createdAt: now,
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-init-1',
      customerId: adminProfile.id,
      type: 'BIENVENIDA',
      title: '¡Bienvenido a Mondino Club!',
      message:
        'Tu cuenta de Administrador está activa. Podés alternar entre Vista Cliente, Modo Empleado y Panel Admin desde la barra superior.',
      isRead: false,
      actionUrl: '/inicio',
      createdAt: now,
    },
    {
      id: 'notif-init-2',
      customerId: client1.id,
      type: 'COMPRA',
      title: '¡Sumaste +1.000 puntos en Dermocosmética!',
      message: 'Acreditamos tu compra de $50.000 con Multiplicador x2.',
      isRead: false,
      actionUrl: '/historial',
      createdAt: now,
    },
  ];

  const auditLogs: AuditLogRecord[] = [
    {
      id: 'aud-init-1',
      actorId: staffProfile.id,
      actorEmail: staffProfile.email,
      actorRole: UserRole.EMPLEADO,
      action: 'REGISTRO_COMPRA_QR',
      entityType: 'purchases',
      entityId: 'pur-init-1001',
      reason: 'Compra registrada en mostrador ($50.000 ARS -> +1.000 pts)',
      metadata: { customerId: client1.id, amount: 50000, totalPoints: 1000 },
      createdAt: now,
    },
  ];

  return {
    settings: { ...DEFAULT_APP_SETTINGS },
    profiles: [adminProfile, staffProfile, client1, client2],
    employees: [
      {
        id: 'emp-init-1',
        profileId: staffProfile.id,
        employeeCode: 'EMP-001',
        position: 'Farmacéutica — Atención en Mostrador',
        branch: 'Casa Central Mondino',
        canRegisterPurchases: true,
        canManageRedemptions: true,
        isActive: true,
        authorizedBy: adminProfile.id,
        createdAt: now,
        updatedAt: now,
      },
    ],
    promotions,
    benefits,
    news,
    purchases,
    transactions,
    redemptions,
    referrals: [],
    notifications,
    campaigns: [],
    auditLogs,
  };
}

let memoryState: PreviewDatabaseState | null = null;

function normalizePreviewSettings(state: PreviewDatabaseState): void {
  if (!state.settings) {
    state.settings = { ...DEFAULT_APP_SETTINGS };
    return;
  }
  if (!state.settings.appLogoUrl) {
    state.settings.appLogoUrl = DEFAULT_APP_SETTINGS.appLogoUrl;
  }
  state.settings.birthdayBonusPoints = BIRTHDAY_BONUS_POINTS;
  state.settings.referrerBonusPoints = REFERRER_BONUS_POINTS;
  state.settings.referredBonusPoints = REFERRED_BONUS_POINTS;
  if (
    !state.settings.whatsappContact ||
    state.settings.whatsappContact === '+54 9 3492 555-0192' ||
    state.settings.whatsappContact === '+54 9 3492 42-0000'
  ) {
    state.settings.whatsappContact = DEFAULT_APP_SETTINGS.whatsappContact;
  }
  if (
    !state.settings.address ||
    state.settings.address === 'Av. Santa Fe 1240, Centro' ||
    state.settings.address === 'Av. Santa Fe 1250, Rafaela, Santa Fe'
  ) {
    state.settings.address = DEFAULT_APP_SETTINGS.address;
  }
  if (
    !state.settings.openingHours ||
    state.settings.openingHours === 'Lun a Sáb de 8:00 a 21:00 hs' ||
    state.settings.openingHours === 'Lun a Sáb de 08:00 a 21:00 hs'
  ) {
    state.settings.openingHours = DEFAULT_APP_SETTINGS.openingHours;
  }
}

function loadState(): PreviewDatabaseState {
  if (memoryState) {
    normalizePreviewSettings(memoryState);
    return memoryState;
  }
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      memoryState = JSON.parse(raw) as PreviewDatabaseState;
      normalizePreviewSettings(memoryState);
      return memoryState;
    }
  } catch {
    // fallback to initial state
  }
  memoryState = createInitialState();
  normalizePreviewSettings(memoryState);
  saveState(memoryState);
  return memoryState;
}

function saveState(state: PreviewDatabaseState): void {
  memoryState = state;
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // ignore read-only fs in serverless
  }
}

export function createPreviewSessionToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() })).toString(
    'base64url'
  );
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `mnd_prev_${payload}.${sig}`;
}

export function verifyPreviewSessionToken(authHeader?: string): UserProfile {
  const state = loadState();
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Sesión no iniciada. Ingresá con tu cuenta de Google.');
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token.startsWith('mnd_prev_')) {
    throw new Error('Token de sesión inválido o expirado.');
  }
  const raw = token.slice('mnd_prev_'.length);
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) {
    throw new Error('Formato de token inválido.');
  }
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  if (sig !== expectedSig) {
    throw new Error('Firma de sesión inválida.');
  }
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
    sub: string;
  };
  const profile = state.profiles.find((p) => p.id === decoded.sub);
  if (!profile) {
    throw new Error('Perfil de usuario no encontrado.');
  }
  return profile;
}

export function previewSignInWithGoogle(email?: string): {
  token: string;
  profile: UserProfile;
} {
  const state = loadState();
  const targetEmail = (email || 'santinomondi2010@gmail.com').trim().toLowerCase();
  let profile = state.profiles.find((p) => p.email.toLowerCase() === targetEmail);

  if (!profile) {
    const now = new Date().toISOString();
    const localName = targetEmail.split('@')[0] || 'Cliente';
    const firstName = localName.charAt(0).toUpperCase() + localName.slice(1);
    profile = {
      id: `usr-${crypto.randomBytes(4).toString('hex')}`,
      uid: `usr-${crypto.randomBytes(4).toString('hex')}`,
      email: targetEmail,
      firstName,
      lastName: '',
      avatarUrl: '',
      phone: '',
      birthDate: '',
      role: UserRole.CLIENTE,
      status: AccountStatus.ACTIVO,
      qrToken: `MND-QR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      referralCode: `${firstName.slice(0, 4).toUpperCase()}-${crypto
        .randomBytes(2)
        .toString('hex')
        .toUpperCase()}`,
      referredById: null,
      notificationPreferences: {
        promotions: true,
        benefits: true,
        expiring: true,
        birthday: true,
        news: true,
      },
      pointsBalance: 0,
      createdAt: now,
      updatedAt: now,
    };
    state.profiles.unshift(profile);
    saveState(state);
  }

  return {
    token: createPreviewSessionToken(profile.id),
    profile,
  };
}

export function previewGetPublicCatalog() {
  const state = loadState();
  return {
    settings: state.settings,
    promotions: state.promotions,
    benefits: state.benefits,
    news: state.news,
  };
}

export function previewGetBootstrapState(actor: UserProfile) {
  const state = loadState();
  const isStaffOrAdmin =
    actor.role === UserRole.EMPLEADO || actor.role === UserRole.ADMINISTRADOR;

  const myNotifications = state.notifications.filter((n) => n.customerId === actor.id);
  const todayParts = getArgentinaTodayParts();
  if (
    actor.birthDate &&
    isTodayUsersBirthday(actor.birthDate) &&
    (actor.birthdayBonusClaimedYear || 0) < todayParts.year &&
    !myNotifications.some((n) => n.id === `notif-bday-${todayParts.year}`)
  ) {
    myNotifications.unshift({
      id: `notif-bday-${todayParts.year}`,
      customerId: actor.id,
      type: 'CUMPLEANOS',
      title: `¡Feliz cumpleaños, ${actor.firstName}! 🎂`,
      message: `Hoy tenés disponibles +${state.settings.birthdayBonusPoints} puntos de regalo en Mondino Club. Ingresá a Mi Perfil o Inicio para acreditarlos.`,
      isRead: false,
      actionUrl: '/perfil',
      createdAt: new Date().toISOString(),
    });
  }

  return {
    profile: actor,
    settings: state.settings,
    promotions: state.promotions,
    benefits: state.benefits,
    news: state.news,
    purchases: state.purchases.filter((p) => p.customerId === actor.id),
    transactions: state.transactions.filter((t) => t.customerId === actor.id),
    redemptions: state.redemptions.filter((r) => r.customerId === actor.id),
    referrals: state.referrals.filter(
      (r) => r.referrerId === actor.id || r.referredId === actor.id
    ),
    notifications: myNotifications,
    adminData: isStaffOrAdmin
      ? {
          profiles: state.profiles,
          employees: state.employees,
          purchases: state.purchases,
          transactions: state.transactions,
          redemptions: state.redemptions,
          campaigns: state.campaigns,
          auditLogs: state.auditLogs,
        }
      : null,
  };
}

export function previewUpdateMyProfile(
  actor: UserProfile,
  input: {
    firstName: string;
    lastName: string;
    phone: string;
    birthDate: string;
    notificationPreferences: UserProfile['notificationPreferences'];
  }
): UserProfile {
  const state = loadState();
  const target = state.profiles.find((p) => p.id === actor.id);
  if (!target || target.status !== AccountStatus.ACTIVO) {
    throw new Error('Tu cuenta no está activa.');
  }
  if (!input.firstName?.trim()) {
    throw new Error('El nombre es obligatorio.');
  }
  target.firstName = input.firstName.trim();
  target.lastName = (input.lastName || '').trim();
  target.phone = (input.phone || '').trim();
  // La fecha de cumpleaños solo se puede establecer una vez; luego queda bloqueada
  const existingBirthDate = (target.birthDate || '').trim();
  const requestedBirthDate = (input.birthDate || '').trim();
  target.birthDate = existingBirthDate ? existingBirthDate : requestedBirthDate;

  if (input.notificationPreferences) {
    target.notificationPreferences = input.notificationPreferences;
  }
  target.updatedAt = new Date().toISOString();
  saveState(state);
  return target;
}

export function previewClaimBirthdayBonus(actor: UserProfile): {
  bonusPoints: number;
  newBalance: number;
} {
  const state = loadState();
  const target = state.profiles.find((p) => p.id === actor.id);
  if (!target || target.status !== AccountStatus.ACTIVO) {
    throw new Error('Cuenta no activa.');
  }
  if (!target.birthDate || !target.birthDate.trim()) {
    throw new Error('Primero debés completar y guardar tu fecha de cumpleaños en tu perfil.');
  }
  if (!isTodayUsersBirthday(target.birthDate)) {
    const parsed = parseBirthDateParts(target.birthDate);
    throw new Error(
      `El beneficio de cumpleaños solo se puede recibir el día de tu cumpleaños (${parsed?.formattedDayMonth || target.birthDate}).`
    );
  }
  const currentYear = getArgentinaTodayParts().year;
  if ((target.birthdayBonusClaimedYear || 0) >= currentYear) {
    throw new Error(`Ya acreditaste tu bonus de cumpleaños correspondiente al año ${currentYear}.`);
  }
  const bonus = Number(state.settings.birthdayBonusPoints || BIRTHDAY_BONUS_POINTS);
  target.pointsBalance += bonus;
  target.birthdayBonusClaimedYear = currentYear;
  target.updatedAt = new Date().toISOString();

  state.transactions.unshift({
    id: `tx-bday-${Date.now()}`,
    customerId: target.id,
    amount: bonus,
    balanceAfter: target.pointsBalance,
    type: 'BONUS_CUMPLEANOS',
    description: `Bonificación anual de cumpleaños ${currentYear} — Farmacia y Perfumería Mondino`,
    idempotencyKey: `bday-${target.id}-${currentYear}`,
    createdBy: 'sistema@mondinoclub.com',
    createdAt: new Date().toISOString(),
  });
  saveState(state);
  return { bonusPoints: bonus, newBalance: target.pointsBalance };
}

export function previewApplyReferralCode(
  actor: UserProfile,
  code: string
): {
  referrerName: string;
  referredBonus: number;
  referrerBonus: number;
  newBalance: number;
} {
  const state = loadState();
  const referred = state.profiles.find((p) => p.id === actor.id);
  if (!referred || referred.status !== AccountStatus.ACTIVO) {
    throw new Error('Cuenta no activa.');
  }
  if (referred.referredById) {
    throw new Error('Ya aplicaste un código de invitación anteriormente.');
  }
  const cleanCode = (code || '').trim().toUpperCase();
  const referrer = state.profiles.find((p) => p.referralCode.toUpperCase() === cleanCode);
  if (!referrer) {
    throw new Error('El código de referido ingresado no pertenece a ningún socio.');
  }
  if (referrer.id === referred.id) {
    throw new Error('No podés utilizar tu propio código de referido.');
  }

  const referrerBonus = Number(state.settings.referrerBonusPoints || REFERRER_BONUS_POINTS);
  const referredBonus = Number(state.settings.referredBonusPoints || REFERRED_BONUS_POINTS);
  const now = new Date().toISOString();

  referred.referredById = referrer.id;
  referred.pointsBalance += referredBonus;
  referred.updatedAt = now;

  referrer.pointsBalance += referrerBonus;
  referrer.updatedAt = now;

  state.referrals.unshift({
    id: `ref-${Date.now()}`,
    referrerId: referrer.id,
    referredId: referred.id,
    referralCodeUsed: referrer.referralCode,
    referrerPointsAwarded: referrerBonus,
    referredPointsAwarded: referredBonus,
    status: 'ACREDITADO',
    createdAt: now,
  });

  state.transactions.unshift(
    {
      id: `tx-ref1-${Date.now()}`,
      customerId: referred.id,
      amount: referredBonus,
      balanceAfter: referred.pointsBalance,
      type: 'BONUS_REFERIDO',
      description: `Bono bienvenida por invitación de ${referrer.firstName} ${referrer.lastName}`,
      idempotencyKey: `ref-referred-${referred.id}`,
      createdBy: 'sistema@mondinoclub.com',
      createdAt: now,
    },
    {
      id: `tx-ref2-${Date.now() + 1}`,
      customerId: referrer.id,
      amount: referrerBonus,
      balanceAfter: referrer.pointsBalance,
      type: 'BONUS_REFERIDO',
      description: `Bono por invitar a ${referred.firstName} ${referred.lastName} a Mondino Club`,
      idempotencyKey: `ref-referrer-${referred.id}`,
      createdBy: 'sistema@mondinoclub.com',
      createdAt: now,
    }
  );

  saveState(state);
  return {
    referrerName: `${referrer.firstName} ${referrer.lastName}`.trim(),
    referredBonus,
    referrerBonus,
    newBalance: referred.pointsBalance,
  };
}

export function previewMarkNotificationsRead(actor: UserProfile): void {
  const state = loadState();
  state.notifications.forEach((n) => {
    if (n.customerId === actor.id) {
      n.isRead = true;
    }
  });
  saveState(state);
}

export function previewRedeemBenefit(
  actor: UserProfile,
  benefitId: string,
  idempotencyKey: string
): {
  redemptionId: string;
  redemptionCode: string;
  pointsSpent: number;
  newBalance: number;
  expiresAt: string;
} {
  const state = loadState();
  const customer = state.profiles.find((p) => p.id === actor.id);
  if (!customer || customer.status !== AccountStatus.ACTIVO) {
    throw new Error('Tu cuenta no se encuentra activa para realizar canjes.');
  }

  const benefit = state.benefits.find((b) => b.id === benefitId);
  if (!benefit || !benefit.isActive) {
    throw new Error('El beneficio seleccionado ya no se encuentra activo.');
  }
  if (benefit.stockAvailable <= 0) {
    throw new Error('Este beneficio no tiene stock disponible en este momento.');
  }
  if (customer.pointsBalance < benefit.pointsRequired) {
    throw new Error(
      `Saldo insuficiente. Necesitás ${benefit.pointsRequired} puntos y tenés ${customer.pointsBalance} puntos.`
    );
  }

  const code = `MND-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const redemptionId = `red-${Date.now()}`;
  const expiresDate = new Date();
  expiresDate.setDate(expiresDate.getDate() + 30);
  const expiresAt = expiresDate.toISOString().slice(0, 10);
  const now = new Date().toISOString();

  benefit.stockAvailable -= 1;
  customer.pointsBalance -= benefit.pointsRequired;
  customer.updatedAt = now;

  state.redemptions.unshift({
    id: redemptionId,
    benefitId: benefit.id,
    customerId: customer.id,
    pointsSpent: benefit.pointsRequired,
    redemptionCode: code,
    status: 'DISPONIBLE',
    expiresAt,
    createdAt: now,
  });

  state.transactions.unshift({
    id: `tx-red-${Date.now()}`,
    customerId: customer.id,
    amount: -benefit.pointsRequired,
    balanceAfter: customer.pointsBalance,
    type: 'CANJE_BENEFICIO',
    description: `Canje de beneficio: ${benefit.title} (Código ${code})`,
    idempotencyKey: idempotencyKey || `tx-${redemptionId}`,
    createdBy: customer.email,
    createdAt: now,
  });

  state.notifications.unshift({
    id: `notif-red-${Date.now()}`,
    customerId: customer.id,
    type: 'CANJE',
    title: `Canje confirmado: ${code}`,
    message: `Presentá el código ${code} en Farmacia y Perfumería Mondino para retirar "${benefit.title}".`,
    isRead: false,
    actionUrl: '/beneficios',
    createdAt: now,
  });

  state.auditLogs.unshift({
    id: `aud-red-${Date.now()}`,
    actorId: customer.id,
    actorEmail: customer.email,
    actorRole: customer.role,
    action: 'CANJE_BENEFICIO',
    entityType: 'benefit_redemptions',
    entityId: redemptionId,
    reason: `Canje de "${benefit.title}" por ${benefit.pointsRequired} puntos`,
    metadata: { redemptionCode: code, pointsSpent: benefit.pointsRequired },
    createdAt: now,
  });

  saveState(state);
  return {
    redemptionId,
    redemptionCode: code,
    pointsSpent: benefit.pointsRequired,
    newBalance: customer.pointsBalance,
    expiresAt,
  };
}

function assertStaffOrAdmin(actor: UserProfile) {
  if (
    actor.status !== AccountStatus.ACTIVO ||
    (actor.role !== UserRole.EMPLEADO && actor.role !== UserRole.ADMINISTRADOR)
  ) {
    throw new Error(
      'Acceso denegado: solo empleados autorizados o administradores pueden operar en mostrador.'
    );
  }
}

function assertAdmin(actor: UserProfile) {
  if (actor.status !== AccountStatus.ACTIVO || actor.role !== UserRole.ADMINISTRADOR) {
    throw new Error('Acceso denegado: operación exclusiva para administradores.');
  }
}

export function previewValidateQrForStaff(
  actor: UserProfile,
  qrTokenOrEmail: string
): { customer: ValidatedQrCustomer } {
  assertStaffOrAdmin(actor);
  const state = loadState();
  const q = (qrTokenOrEmail || '').trim().toLowerCase();
  if (!q) {
    throw new Error('Ingresá un código QR o email válido.');
  }
  const found = state.profiles.find(
    (p) => p.qrToken.toLowerCase() === q || p.email.toLowerCase() === q
  );
  if (!found) {
    throw new Error('No se encontró ningún socio registrado con ese código QR o email.');
  }
  if (found.status !== AccountStatus.ACTIVO) {
    throw new Error(`La cuenta del socio (${found.email}) se encuentra suspendida.`);
  }
  return {
    customer: {
      id: found.id,
      firstName: found.firstName,
      lastName: found.lastName,
      fullName: `${found.firstName} ${found.lastName}`.trim(),
      email: found.email,
      maskedEmail: maskCustomerEmail(found.email),
      qrToken: found.qrToken,
      pointsBalance: found.pointsBalance,
      status: found.status,
      birthDate: found.birthDate,
    },
  };
}

export function previewCalculatePoints(input: {
  amount: number;
  category: string;
  promotionId?: string;
}): BackendPointsPreview {
  const state = loadState();
  const numAmount = Number(input.amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > 50000000) {
    throw new Error('El importe de la compra debe ser mayor a $0.');
  }

  // REGLA BASE INMUTABLE: $1.000 = 1 punto
  const rate =
    Number(state.settings.basePointsRateLocked) === BASE_PESOS_PER_POINT
      ? state.settings.basePointsRateLocked
      : BASE_PESOS_PER_POINT;
  const basePoints = Math.floor(numAmount / rate);
  let promoPoints = 0;
  let bestPromo: PromotionItem | null = null;
  const today = new Date().toISOString().slice(0, 10);

  if (input.promotionId) {
    const candidate = state.promotions.find(
      (p) =>
        p.id === input.promotionId &&
        p.isActive &&
        p.startDate <= today &&
        p.endDate >= today &&
        numAmount >= Number(p.minPurchaseAmount || 0) &&
        (p.category === 'Todos' || p.category.toLowerCase() === input.category.toLowerCase()) &&
        (!p.usageLimit || p.currentUsages < p.usageLimit)
    );
    if (candidate) {
      bestPromo = candidate;
      if (candidate.promoType === 'MULTIPLICADOR') {
        promoPoints = Math.max(0, Math.round(basePoints * (Number(candidate.multiplier) - 1)));
      } else if (candidate.promoType === 'PUNTOS_EXTRA') {
        promoPoints = Math.max(0, Number(candidate.extraPoints || 0));
      }
    }
  } else {
    for (const candidate of state.promotions) {
      if (
        !candidate.isActive ||
        candidate.startDate > today ||
        candidate.endDate < today ||
        numAmount < Number(candidate.minPurchaseAmount || 0) ||
        (candidate.category !== 'Todos' &&
          candidate.category.toLowerCase() !== input.category.toLowerCase()) ||
        (candidate.usageLimit > 0 && candidate.currentUsages >= candidate.usageLimit)
      ) {
        continue;
      }
      let bonus = 0;
      if (candidate.promoType === 'MULTIPLICADOR') {
        bonus = Math.max(0, Math.round(basePoints * (Number(candidate.multiplier) - 1)));
      } else if (candidate.promoType === 'PUNTOS_EXTRA') {
        bonus = Math.max(0, Number(candidate.extraPoints || 0));
      }
      if (bonus > promoPoints) {
        promoPoints = bonus;
        bestPromo = candidate;
      }
    }
  }

  return {
    amount: numAmount,
    basePoints,
    promoPoints,
    totalPoints: basePoints + promoPoints,
    appliedPromotion:
      bestPromo && promoPoints > 0
        ? {
            id: bestPromo.id,
            title: bestPromo.title,
            promoType: bestPromo.promoType,
            multiplier: bestPromo.multiplier,
            extraPoints: bestPromo.extraPoints,
          }
        : null,
  };
}

export function previewRegisterPurchase(
  actor: UserProfile,
  input: {
    idempotencyKey: string;
    customerId: string;
    amount: number;
    category: string;
    promotionId?: string;
    notes?: string;
  }
) {
  assertStaffOrAdmin(actor);
  const state = loadState();
  const key = (input.idempotencyKey || '').trim();
  if (!key) {
    throw new Error('Se requiere clave de idempotencia (idempotencyKey).');
  }

  const existing = state.purchases.find((p) => p.idempotencyKey === key);
  if (existing) {
    const cust = state.profiles.find((p) => p.id === existing.customerId);
    return {
      purchaseId: existing.id,
      customerName: cust ? `${cust.firstName} ${cust.lastName}`.trim() : existing.customerId,
      basePoints: existing.basePoints,
      promoPoints: existing.promoPoints,
      totalPoints: existing.totalPoints,
      newBalance: cust ? cust.pointsBalance : 0,
    };
  }

  const customer = state.profiles.find((p) => p.id === input.customerId);
  if (!customer || customer.status !== AccountStatus.ACTIVO) {
    throw new Error('El cliente no existe o su cuenta se encuentra suspendida.');
  }

  const calc = previewCalculatePoints({
    amount: input.amount,
    category: input.category,
    promotionId: input.promotionId,
  });

  const now = new Date().toISOString();
  const purchaseId = `pur-${Date.now()}`;
  const balanceAfterBase = customer.pointsBalance + calc.basePoints;
  const newBalance = customer.pointsBalance + calc.totalPoints;

  state.purchases.unshift({
    id: purchaseId,
    idempotencyKey: key,
    customerId: customer.id,
    employeeId: actor.id,
    amount: calc.amount,
    category: input.category || 'Perfumería',
    basePoints: calc.basePoints,
    promoPoints: calc.promoPoints,
    totalPoints: calc.totalPoints,
    promotionId: calc.appliedPromotion?.id || null,
    notes: (input.notes || '').trim(),
    status: 'COMPLETADA',
    createdAt: now,
  });

  if (calc.basePoints > 0) {
    state.transactions.unshift({
      id: `tx-base-${Date.now()}`,
      customerId: customer.id,
      purchaseId,
      promotionId: null,
      amount: calc.basePoints,
      balanceAfter: balanceAfterBase,
      type: 'COMPRA_BASE',
      description: `Puntos base ($1.000 = 1 pto) — Compra en ${input.category}`,
      idempotencyKey: `${key}-base`,
      createdBy: actor.email,
      createdAt: now,
    });
  }

  if (calc.promoPoints > 0) {
    state.transactions.unshift({
      id: `tx-promo-${Date.now() + 1}`,
      customerId: customer.id,
      purchaseId,
      promotionId: calc.appliedPromotion?.id || null,
      amount: calc.promoPoints,
      balanceAfter: newBalance,
      type: 'PROMOCION_COMPRA',
      description: `Bonificación promoción: ${calc.appliedPromotion?.title || 'Promo Mondino'}`,
      idempotencyKey: `${key}-promo`,
      createdBy: actor.email,
      createdAt: now,
    });
    if (calc.appliedPromotion?.id) {
      const promoObj = state.promotions.find((p) => p.id === calc.appliedPromotion?.id);
      if (promoObj) promoObj.currentUsages += 1;
    }
  }

  customer.pointsBalance = newBalance;
  customer.updatedAt = now;

  state.notifications.unshift({
    id: `notif-pur-${Date.now()}`,
    customerId: customer.id,
    type: 'COMPRA',
    title: `¡Sumaste +${calc.totalPoints} puntos en Mondino Club!`,
    message: `Acreditamos tu compra de $${calc.amount.toLocaleString('es-AR')} en ${input.category}. Nuevo saldo: ${newBalance} puntos.`,
    isRead: false,
    actionUrl: '/historial',
    createdAt: now,
  });

  state.auditLogs.unshift({
    id: `aud-pur-${Date.now()}`,
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'REGISTRO_COMPRA_QR',
    entityType: 'purchases',
    entityId: purchaseId,
    reason: `Compra registrada en mostrador ($${calc.amount} ARS -> +${calc.totalPoints} pts)`,
    metadata: {
      customerId: customer.id,
      amount: calc.amount,
      basePoints: calc.basePoints,
      promoPoints: calc.promoPoints,
      totalPoints: calc.totalPoints,
    },
    createdAt: now,
  });

  saveState(state);
  return {
    purchaseId,
    customerName: `${customer.firstName} ${customer.lastName}`.trim(),
    basePoints: calc.basePoints,
    promoPoints: calc.promoPoints,
    totalPoints: calc.totalPoints,
    newBalance,
  };
}

export function previewValidateRedemptionForStaff(
  actor: UserProfile,
  code: string
): BenefitRedemptionRecord {
  assertStaffOrAdmin(actor);
  const state = loadState();
  const clean = (code || '').trim().toUpperCase();
  const red = state.redemptions.find((r) => r.redemptionCode.toUpperCase() === clean);
  if (!red) {
    throw new Error('El código de canje ingresado no existe.');
  }
  if (red.status === 'UTILIZADO') {
    throw new Error(`Este código de canje (${red.redemptionCode}) ya fue utilizado previamente.`);
  }
  if (red.status !== 'DISPONIBLE' && red.status !== 'RESERVADO') {
    throw new Error(`El código se encuentra en estado ${red.status} y no puede utilizarse.`);
  }

  red.status = 'UTILIZADO';
  red.usedAt = new Date().toISOString();
  red.usedBy = actor.id;

  state.auditLogs.unshift({
    id: `aud-valred-${Date.now()}`,
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'VALIDACION_CANJE_MOSTRADOR',
    entityType: 'benefit_redemptions',
    entityId: red.id,
    reason: `Código ${red.redemptionCode} validado y entregado en mostrador`,
    metadata: { redemptionCode: red.redemptionCode },
    createdAt: new Date().toISOString(),
  });

  saveState(state);
  return red;
}

export function previewAdjustPointsAdmin(
  actor: UserProfile,
  input: { customerId: string; pointsDelta: number; reason: string }
): { newBalance: number } {
  assertAdmin(actor);
  const state = loadState();
  const delta = Math.trunc(Number(input.pointsDelta));
  if (!delta || Math.abs(delta) > 100000) {
    throw new Error('La cantidad de puntos a ajustar debe ser distinta de 0.');
  }
  if (!input.reason || input.reason.trim().length < 4) {
    throw new Error('Debés especificar un motivo válido para el registro de auditoría.');
  }
  const customer = state.profiles.find((p) => p.id === input.customerId);
  if (!customer) {
    throw new Error('Cliente no encontrado.');
  }
  if (customer.pointsBalance + delta < 0) {
    throw new Error(
      `El ajuste dejaría el saldo del cliente en negativo (Saldo actual: ${customer.pointsBalance} pts).`
    );
  }

  const now = new Date().toISOString();
  customer.pointsBalance += delta;
  customer.updatedAt = now;

  state.transactions.unshift({
    id: `tx-adj-${Date.now()}`,
    customerId: customer.id,
    amount: delta,
    balanceAfter: customer.pointsBalance,
    type: 'AJUSTE_MANUAL',
    description: `Ajuste administrativo: ${input.reason.trim()}`,
    idempotencyKey: `adj-${Date.now()}`,
    createdBy: actor.email,
    createdAt: now,
  });

  state.auditLogs.unshift({
    id: `aud-adj-${Date.now()}`,
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'AJUSTE_MANUAL_PUNTOS',
    entityType: 'profiles',
    entityId: customer.id,
    reason: input.reason.trim(),
    metadata: { pointsDelta: delta, newBalance: customer.pointsBalance },
    createdAt: now,
  });

  saveState(state);
  return { newBalance: customer.pointsBalance };
}

export function previewVoidPurchaseAdmin(
  actor: UserProfile,
  input: { purchaseId: string; reason: string }
): { purchaseId: string; newBalance: number } {
  assertAdmin(actor);
  const state = loadState();
  if (!input.reason?.trim()) {
    throw new Error('Debés indicar el motivo obligatorio de la anulación.');
  }
  const purchase = state.purchases.find((p) => p.id === input.purchaseId);
  if (!purchase) {
    throw new Error('La compra indicada no existe.');
  }
  if (purchase.status === 'ANULADA') {
    throw new Error('Esta compra ya fue anulada previamente.');
  }
  const customer = state.profiles.find((p) => p.id === purchase.customerId);
  if (!customer) {
    throw new Error('Cliente no encontrado.');
  }

  const now = new Date().toISOString();
  purchase.status = 'ANULADA';
  purchase.voidedReason = input.reason.trim();
  purchase.voidedBy = actor.id;
  purchase.voidedAt = now;

  customer.pointsBalance = Math.max(0, customer.pointsBalance - purchase.totalPoints);
  customer.updatedAt = now;

  state.transactions.unshift({
    id: `tx-void-${Date.now()}`,
    customerId: customer.id,
    purchaseId: purchase.id,
    amount: -purchase.totalPoints,
    balanceAfter: customer.pointsBalance,
    type: 'ANULACION_COMPRA',
    description: `Anulación de compra #${purchase.id.slice(-6)}: ${input.reason.trim()}`,
    idempotencyKey: `void-${purchase.id}`,
    createdBy: actor.email,
    createdAt: now,
  });

  state.auditLogs.unshift({
    id: `aud-void-${Date.now()}`,
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'ANULACION_COMPRA',
    entityType: 'purchases',
    entityId: purchase.id,
    reason: input.reason.trim(),
    metadata: { pointsReverted: purchase.totalPoints, newBalance: customer.pointsBalance },
    createdAt: now,
  });

  saveState(state);
  return { purchaseId: purchase.id, newBalance: customer.pointsBalance };
}

export function previewUpdateUserRoleStatusAdmin(
  actor: UserProfile,
  input: {
    targetProfileId: string;
    role?: string;
    status?: string;
    employeePosition?: string;
    employeeBranch?: string;
  }
): UserProfile {
  assertAdmin(actor);
  const state = loadState();
  const target = state.profiles.find((p) => p.id === input.targetProfileId);
  if (!target) {
    throw new Error('Usuario no encontrado.');
  }
  if (input.role) target.role = input.role;
  if (input.status) target.status = input.status;
  target.updatedAt = new Date().toISOString();

  if (target.role === UserRole.EMPLEADO) {
    const existingEmp = state.employees.find((e) => e.profileId === target.id);
    if (existingEmp) {
      existingEmp.position = input.employeePosition || existingEmp.position;
      existingEmp.branch = input.employeeBranch || existingEmp.branch;
      existingEmp.isActive = true;
      existingEmp.updatedAt = new Date().toISOString();
    } else {
      state.employees.unshift({
        id: `emp-${Date.now()}`,
        profileId: target.id,
        employeeCode: `EMP-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        position: input.employeePosition || 'Atención en Mostrador',
        branch: input.employeeBranch || 'Casa Central Mondino',
        canRegisterPurchases: true,
        canManageRedemptions: true,
        isActive: true,
        authorizedBy: actor.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  state.auditLogs.unshift({
    id: `aud-role-${Date.now()}`,
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'CAMBIO_ROL_O_ESTADO',
    entityType: 'profiles',
    entityId: target.id,
    reason: `Actualización de cuenta ${target.email} -> Rol: ${target.role}, Estado: ${target.status}`,
    metadata: { role: target.role, status: target.status },
    createdAt: new Date().toISOString(),
  });

  saveState(state);
  return target;
}

export function previewUpsertPromotionAdmin(
  actor: UserProfile,
  promo: Partial<PromotionItem> & { title: string; description: string }
): PromotionItem {
  assertStaffOrAdmin(actor);
  const state = loadState();
  const existingIdx = promo.id ? state.promotions.findIndex((p) => p.id === promo.id) : -1;
  const item: PromotionItem = {
    id: promo.id || `promo-${Date.now()}`,
    title: promo.title.trim(),
    description: promo.description.trim(),
    imageUrl: promo.imageUrl || GENERATED_IMAGES.heroPerfumery,
    category: promo.category || 'Todos',
    promoType: promo.promoType || 'MULTIPLICADOR',
    multiplier: Math.max(1, Number(promo.multiplier ?? 1)),
    extraPoints: Math.max(0, Math.trunc(Number(promo.extraPoints ?? 0))),
    minPurchaseAmount: Math.max(0, Number(promo.minPurchaseAmount ?? 0)),
    startDate: promo.startDate || '2025-01-01',
    endDate: promo.endDate || '2027-12-31',
    usageLimit: Math.max(0, Math.trunc(Number(promo.usageLimit ?? 0))),
    currentUsages: existingIdx >= 0 ? state.promotions[existingIdx].currentUsages : 0,
    isActive: Boolean(promo.isActive ?? true),
    termsConditions: promo.termsConditions || '',
    createdBy: actor.id,
    createdAt:
      existingIdx >= 0 ? state.promotions[existingIdx].createdAt : new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    state.promotions[existingIdx] = item;
  } else {
    state.promotions.unshift(item);
  }
  saveState(state);
  return item;
}

export function previewUpsertBenefitAdmin(
  actor: UserProfile,
  benefit: Partial<BenefitItem> & { title: string; description: string }
): BenefitItem {
  assertStaffOrAdmin(actor);
  const state = loadState();
  const existingIdx = benefit.id ? state.benefits.findIndex((b) => b.id === benefit.id) : -1;
  const item: BenefitItem = {
    id: benefit.id || `ben-${Date.now()}`,
    title: benefit.title.trim(),
    description: benefit.description.trim(),
    imageUrl: benefit.imageUrl || GENERATED_IMAGES.benefitSkincare,
    pointsRequired: Math.max(1, Math.trunc(Number(benefit.pointsRequired ?? 100))),
    category: benefit.category || 'Perfumería',
    startDate: benefit.startDate || '2025-01-01',
    endDate: benefit.endDate || '2027-12-31',
    isActive: Boolean(benefit.isActive ?? true),
    usageLimit: Math.max(0, Math.trunc(Number(benefit.usageLimit ?? 100))),
    stockAvailable: Math.max(0, Math.trunc(Number(benefit.stockAvailable ?? 0))),
    termsConditions: benefit.termsConditions || '',
    createdAt:
      existingIdx >= 0 ? state.benefits[existingIdx].createdAt : new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    state.benefits[existingIdx] = item;
  } else {
    state.benefits.unshift(item);
  }
  saveState(state);
  return item;
}

export function previewUpsertNewsAdmin(
  actor: UserProfile,
  news: Partial<NewsItem> & { title: string; description: string }
): NewsItem {
  assertStaffOrAdmin(actor);
  const state = loadState();
  const existingIdx = news.id ? state.news.findIndex((n) => n.id === news.id) : -1;
  const item: NewsItem = {
    id: news.id || `news-${Date.now()}`,
    title: news.title.trim(),
    summary: (news.summary || news.description).trim(),
    description: news.description.trim(),
    imageUrl: news.imageUrl || GENERATED_IMAGES.newsDermocosmetics,
    category: news.category || 'Novedades',
    isPublished: Boolean(news.isPublished ?? true),
    publishedAt: news.publishedAt || new Date().toISOString().slice(0, 10),
    createdBy: actor.email,
    createdAt: existingIdx >= 0 ? state.news[existingIdx].createdAt : new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    state.news[existingIdx] = item;
  } else {
    state.news.unshift(item);
  }
  saveState(state);
  return item;
}

export function previewCreateCampaignAdmin(
  actor: UserProfile,
  input: {
    title: string;
    message: string;
    segment: string;
    scheduledAt: string;
    status: string;
  }
): CampaignItem {
  assertAdmin(actor);
  const state = loadState();
  const targets = state.profiles.filter((p) => {
    if (p.status !== AccountStatus.ACTIVO) return false;
    if (input.segment === 'PUNTOS_ALTOS') return p.pointsBalance >= 500;
    return true;
  });

  const now = new Date().toISOString();
  if ((input.status || 'ENVIADA') === 'ENVIADA') {
    targets.forEach((t, idx) => {
      state.notifications.unshift({
        id: `notif-camp-${Date.now()}-${idx}`,
        customerId: t.id,
        type: 'CAMPANA',
        title: input.title.trim(),
        message: input.message.trim(),
        isRead: false,
        actionUrl: '/novedades',
        createdAt: now,
      });
    });
  }

  const campaign: CampaignItem = {
    id: `camp-${Date.now()}`,
    title: input.title.trim(),
    message: input.message.trim(),
    imageUrl: GENERATED_IMAGES.heroPerfumery,
    segment: input.segment || 'TODOS',
    scheduledAt: input.scheduledAt || now.slice(0, 10),
    status: input.status || 'ENVIADA',
    estimatedReach: targets.length,
    createdBy: actor.id,
    createdAt: now,
  };

  state.campaigns.unshift(campaign);
  saveState(state);
  return campaign;
}

export function previewUpdateSettingsAdmin(
  actor: UserProfile,
  updates: Partial<AppSettings>
): AppSettings {
  assertStaffOrAdmin(actor);
  const state = loadState();
  if (actor.role === UserRole.ADMINISTRADOR) {
    state.settings = {
      ...state.settings,
      ...updates,
      appLogoUrl: DEFAULT_APP_SETTINGS.appLogoUrl,
      basePointsRateLocked: BASE_PESOS_PER_POINT, // INMUTABLE: $1.000 = 1 punto
      birthdayBonusPoints: BIRTHDAY_BONUS_POINTS, // 20 puntos por cumpleaños
      referrerBonusPoints: REFERRER_BONUS_POINTS, // 15 puntos por invitar a un amigo
      referredBonusPoints: REFERRED_BONUS_POINTS, // 10 puntos por ser invitado
    };
  } else {
    // Empleado puede actualizar la imagen principal de la web (logoUrl)
    state.settings = {
      ...state.settings,
      logoUrl: updates.logoUrl || state.settings.logoUrl,
      appLogoUrl: DEFAULT_APP_SETTINGS.appLogoUrl,
      basePointsRateLocked: BASE_PESOS_PER_POINT,
      birthdayBonusPoints: BIRTHDAY_BONUS_POINTS,
      referrerBonusPoints: REFERRER_BONUS_POINTS,
      referredBonusPoints: REFERRED_BONUS_POINTS,
    };
  }
  saveState(state);
  return state.settings;
}
