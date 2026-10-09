import { AppSettings } from '../types/index.ts';

/**
 * REGLA BASE PERMANENTE E INMUTABLE DE MONDINO CLUB:
 * $100 gastados = 1 punto (Equivalente exacto al 1% del valor de la compra expresado en puntos).
 * El administrador NO puede modificar esta regla base.
 */
export const BASE_PESOS_PER_POINT = 100 as const;

export const BASE_POINTS_EXAMPLES = [
  { amount: 1000, points: 10 },
  { amount: 10000, points: 100 },
  { amount: 50000, points: 500 },
  { amount: 100000, points: 1000 },
  { amount: 250000, points: 2500 },
] as const;

export const PRODUCT_CATEGORIES = [
  'Todos',
  'Perfumería',
  'Dermocosmética',
  'Cuidado Personal',
  'Farmacia',
  'Bienestar',
] as const;

export const PURCHASE_CATEGORIES = [
  'Perfumería',
  'Dermocosmética',
  'Cuidado Personal',
  'Farmacia',
  'Bienestar',
] as const;

export const CAMPAIGN_SEGMENTS = [
  { id: 'TODOS', label: 'Todos los clientes activos' },
  { id: 'PUNTOS_ALTOS', label: 'Clientes con saldo mayor a 500 puntos' },
  { id: 'SIN_COMPRAS_RECIENTES', label: 'Clientes sin compras en los últimos 30 días' },
  { id: 'CUMPLEANOS_MES', label: 'Clientes que cumplen años este mes' },
  { id: 'INTERES_PERFUMERIA', label: 'Clientes con compras en Perfumería y Dermocosmética' },
] as const;

export const GENERATED_IMAGES = {
  heroPerfumery: '/images/hero_perfumery_banner.jpg',
  benefitSkincare: '/images/benefit_skincare_kit.jpg',
  benefitFragrance: '/images/benefit_fragrance_voucher.jpg',
  newsDermocosmetics: '/images/news_dermocosmetics_launch.jpg',
  // Alias de compatibilidad
  HERO_BANNER: '/images/hero_perfumery_banner.jpg',
  BENEFIT_SKINCARE: '/images/benefit_skincare_kit.jpg',
  BENEFIT_FRAGRANCE: '/images/benefit_fragrance_voucher.jpg',
  PROMO_DERMO: '/images/news_dermocosmetics_launch.jpg',
  NEWS_EVENT: '/images/news_dermocosmetics_launch.jpg',
} as const;

export const BIRTHDAY_BONUS_POINTS = 20 as const;
export const REFERRER_BONUS_POINTS = 15 as const;
export const REFERRED_BONUS_POINTS = 10 as const;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'mondino-global-settings',
  clubName: 'Mondino Club',
  clubSubtitle: 'Farmacia y Perfumería Mondino',
  logoUrl: '/images/hero_perfumery_banner.jpg',
  primaryColor: '#064E3B',
  secondaryColor: '#0F766E',
  accentColor: '#D97706',
  basePointsRateLocked: BASE_PESOS_PER_POINT,
  birthdayBonusPoints: BIRTHDAY_BONUS_POINTS,
  referrerBonusPoints: REFERRER_BONUS_POINTS,
  referredBonusPoints: REFERRED_BONUS_POINTS,
  notificationsEnabled: true,
  whatsappContact: '+54 9 03541 59-0624',
  address: 'Av. San Martín 59, Villa Carlos Paz, Córdoba',
  openingHours: 'Lun a Sáb de 09:00 a 23:00hs, y Dom de 09:00 a 14:00hs y 17:00 a 23:00hs',
};
