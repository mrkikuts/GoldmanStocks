import { getIntlLocale } from '@/lib/i18n';

export function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function startOfWeek(date: Date) {
  const start = new Date(date);
  const weekday = start.getDay();
  start.setDate(start.getDate() - ((weekday + 6) % 7));
  start.setHours(12, 0, 0, 0);
  return start;
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(getIntlLocale(), { day: 'numeric', month: 'short' }).format(
    new Date(`${value}T12:00:00`),
  );
}

export function formatWorkdayDate(value: string) {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${value}T12:00:00`));
}

export function weekdayShort(date: Date, locale = getIntlLocale()) {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
}
