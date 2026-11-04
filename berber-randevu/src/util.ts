import { Appointment, UserProfile } from './types';
import { QR_PREFIX } from './config';

export const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export const DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDays(s: string, days: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function formatDate(s: string): string {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${DAY_NAMES[d.getDay()]}`;
}

export function formatDateShort(s: string): string {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(n: number): string {
  return `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
}

export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseDate(s).getTime());
}

/** Berberin çalışma saatlerine göre o günün saat dilimlerini üretir */
export function generateSlots(barber: UserProfile): string[] {
  const start = toMinutes(barber.workStart || '09:00');
  const end = toMinutes(barber.workEnd || '19:00');
  const step = Math.max(10, barber.slotMinutes || 30);
  const out: string[] = [];
  for (let t = start; t + step <= end; t += step) out.push(fromMinutes(t));
  return out;
}

export function isWorkDay(barber: UserProfile, date: string): boolean {
  const days = barber.workDays ?? [1, 2, 3, 4, 5, 6];
  return days.includes(parseDate(date).getDay());
}

/** Geçmişte kalan saat dilimi mi? */
export function isPastSlot(date: string, time: string, now = new Date()): boolean {
  const today = toDateStr(now);
  if (date < today) return true;
  if (date > today) return false;
  return toMinutes(time) <= now.getHours() * 60 + now.getMinutes();
}

export function subscriptionActive(u: UserProfile): boolean {
  if (u.role !== 'barber') return true;
  if (u.active === false) return false;
  if (!u.subscription) return false;
  return u.subscription.endsAt >= todayStr();
}

export function planLabel(p?: string): string {
  return p === 'aylik' ? 'Aylık' : p === 'yillik' ? 'Yıllık' : p === 'deneme' ? 'Deneme' : '-';
}

export function statusLabel(a: Appointment): string {
  return a.status === 'booked' ? 'Onaylı' : a.status === 'done' ? 'Tamamlandı' : 'İptal';
}

export function sortAppointments(list: Appointment[]): Appointment[] {
  return [...list].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export function isUpcoming(a: Appointment): boolean {
  return a.status === 'booked' && !isPastSlot(a.date, a.time);
}

export function makeQr(kind: 'B' | 'C', id: string): string {
  return `${QR_PREFIX}:${kind}:${id}`;
}

export function parseQr(data: string): { kind: 'B' | 'C'; id: string } | null {
  const parts = data.trim().split(':');
  if (parts.length !== 3 || parts[0] !== QR_PREFIX) return null;
  if (parts[1] !== 'B' && parts[1] !== 'C') return null;
  if (!parts[2]) return null;
  return { kind: parts[1], id: parts[2] };
}

export function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

export function slotId(barberId: string, date: string, time: string): string {
  return `${barberId}_${date}_${time.replace(':', '')}`;
}

export function errorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'E-posta veya şifre hatalı.',
    'auth/wrong-password': 'Şifre hatalı.',
    'auth/user-not-found': 'Bu e-posta ile kayıtlı kullanıcı yok.',
    'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/invalid-email': 'Geçersiz e-posta adresi.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.',
    'auth/network-request-failed': 'İnternet bağlantısı yok.',
    'permission-denied': 'Bu işlem için yetkiniz yok.',
  };
  if (map[code]) return map[code];
  if (e instanceof Error) return e.message;
  return String(e);
}
