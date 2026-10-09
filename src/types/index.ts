export enum UserRole {
  CLIENTE = 'CLIENTE',
  EMPLEADO = 'EMPLEADO',
  ADMINISTRADOR = 'ADMINISTRADOR',
}

export enum AccountStatus {
  ACTIVO = 'ACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
}

export interface NotificationPreferences {
  promotions: boolean;
  benefits: boolean;
  expiring: boolean;
  birthday: boolean;
  news: boolean;
}

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  phone: string;
  birthDate: string;
  role: UserRole | string;
  status: AccountStatus | string;
  qrToken: string;
  referralCode: string;
  referredById?: string | null;
  birthdayBonusClaimedYear?: number;
  notificationPreferences: NotificationPreferences;
  pointsBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeRecord {
  id: string;
  profileId: string;
  employeeCode: string;
  position: string;
  branch: string;
  canRegisterPurchases: boolean;
  canManageRedemptions: boolean;
  isActive: boolean;
  authorizedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  promoType: 'MULTIPLICADOR' | 'PUNTOS_EXTRA' | 'DESCUENTO_COMERCIAL' | string;
  multiplier: string | number;
  extraPoints: number;
  minPurchaseAmount: string | number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  currentUsages: number;
  isActive: boolean;
  termsConditions: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface PurchaseRecord {
  id: string;
  idempotencyKey: string;
  customerId: string;
  employeeId: string;
  amount: string | number;
  category: string;
  basePoints: number;
  promoPoints: number;
  totalPoints: number;
  promotionId?: string | null;
  notes: string;
  status: 'COMPLETADA' | 'ANULADA' | string;
  voidedReason?: string;
  voidedBy?: string | null;
  voidedAt?: string | null;
  createdAt: string;
}

export interface PointsTransactionRecord {
  id: string;
  customerId: string;
  purchaseId?: string | null;
  promotionId?: string | null;
  amount: number;
  balanceAfter: number;
  type:
    | 'COMPRA_BASE'
    | 'PROMOCION_COMPRA'
    | 'CANJE_BENEFICIO'
    | 'AJUSTE_MANUAL'
    | 'BONUS_CUMPLEANOS'
    | 'BONUS_REFERIDO'
    | 'ANULACION_COMPRA'
    | string;
  description: string;
  idempotencyKey: string;
  createdBy: string;
  createdAt: string;
}

export interface BenefitItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  pointsRequired: number;
  category: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageLimit: number;
  stockAvailable: number;
  termsConditions: string;
  createdAt: string;
}

export interface BenefitRedemptionRecord {
  id: string;
  benefitId: string;
  customerId: string;
  pointsSpent: number;
  redemptionCode: string;
  status: 'DISPONIBLE' | 'RESERVADO' | 'UTILIZADO' | 'VENCIDO' | 'CANCELADO' | string;
  usedAt?: string | null;
  usedBy?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  description: string;
  imageUrl: string;
  category: string;
  isPublished: boolean;
  publishedAt: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface CampaignItem {
  id: string;
  title: string;
  message: string;
  imageUrl: string;
  segment: string;
  scheduledAt: string;
  status: 'BORRADOR' | 'PROGRAMADA' | 'ENVIADA' | string;
  estimatedReach: number;
  createdBy?: string | null;
  createdAt: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredId: string;
  referralCodeUsed: string;
  referrerPointsAwarded: number;
  referredPointsAwarded: number;
  status: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  customerId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string;
  createdAt: string;
}

export interface AppSettings {
  id: string;
  clubName: string;
  clubSubtitle: string;
  logoUrl: string;
  appLogoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  basePointsRateLocked: number;
  birthdayBonusPoints: number;
  referrerBonusPoints: number;
  referredBonusPoints: number;
  notificationsEnabled: boolean;
  whatsappContact: string;
  address: string;
  openingHours: string;
}

export interface AuditLogRecord {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ValidatedQrCustomer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  maskedEmail: string;
  qrToken: string;
  pointsBalance: number;
  status: string;
  birthDate?: string;
}

export interface BackendPointsPreview {
  amount: number;
  basePoints: number;
  promoPoints: number;
  totalPoints: number;
  appliedPromotion: {
    id: string;
    title: string;
    promoType: string;
    multiplier: string | number;
    extraPoints: number;
  } | null;
}
