import { BASE_PESOS_PER_POINT } from '../constants/index.ts';

/**
 * Calcula la previsualización local del 1% base ($100 = 1 punto).
 * NOTA DE SEGURIDAD: Este cálculo es únicamente informativo para la interfaz.
 * El cálculo definitivo se realiza y valida exclusivamente en el backend (PostgreSQL).
 */
export function calculateClientPreviewBasePoints(amountInPesos: number): number {
  if (!Number.isFinite(amountInPesos) || amountInPesos <= 0) {
    return 0;
  }
  return Math.floor(amountInPesos / BASE_PESOS_PER_POINT);
}

export function formatCurrencyARS(amount: number | string): string {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '$0';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatPoints(points: number | string): string {
  const num = Number(points);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDateES(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTimeES(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function maskCustomerEmail(email: string): string {
  const [user, domain] = (email || '').split('@');
  if (!user || !domain) return email;
  if (user.length <= 3) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 3)}***${user.slice(-1)}@${domain}`;
}

export function generateIdempotencyKey(prefix = 'op'): string {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomPart}`;
}

export function getArgentinaTodayParts(): {
  year: number;
  month: number;
  day: number;
  isoDate: string;
} {
  try {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Cordoba',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const [y, m, d] = formatted.split('-').map(Number);
    if (y && m && d) {
      return { year: y, month: m, day: d, isoDate: formatted };
    }
  } catch {
    // fallback to local time
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { year, month, day, isoDate };
}

export function parseBirthDateParts(birthDate?: string | null): {
  year: number;
  month: number;
  day: number;
  formattedDayMonth: string;
  formattedFull: string;
} | null {
  if (!birthDate) return null;
  const clean = birthDate.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const monthNames = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  return {
    year,
    month,
    day,
    formattedDayMonth: `${day} de ${monthNames[month - 1]}`,
    formattedFull: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
  };
}

export function isTodayUsersBirthday(birthDate?: string | null): boolean {
  const parts = parseBirthDateParts(birthDate);
  if (!parts) return false;
  const today = getArgentinaTodayParts();
  if (parts.month === today.month && parts.day === today.day) {
    return true;
  }
  const isLeapYear =
    (today.year % 4 === 0 && today.year % 100 !== 0) || today.year % 400 === 0;
  if (
    !isLeapYear &&
    parts.month === 2 &&
    parts.day === 29 &&
    today.month === 2 &&
    today.day === 28
  ) {
    return true;
  }
  return false;
}
