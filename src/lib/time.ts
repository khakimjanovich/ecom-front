import { currentLanguage } from '../i18n';

const LOCALE: Record<string, string> = { en: 'en-GB', ru: 'ru-RU', uz: 'uz-Latn-UZ' };
const locale = () => LOCALE[currentLanguage()] ?? 'en-GB';

/** "in 23 hours", "5 minutes ago", in the screen language. */
export function fromNow(iso: string, now = Date.now()): string {
  const relative = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return relative.format(seconds, 'second');
}

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
