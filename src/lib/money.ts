import { currentLanguage } from '../i18n';

const LOCALE: Record<string, string> = { en: 'en-GB', ru: 'ru-RU', uz: 'uz-Latn-UZ' };

/** Amounts travel as whole tiyin (1 so'm = 100 tiyin); people read and type so'm. */
export const toTiyin = (som: number) => Math.round(som * 100);

export const formatSom = (tiyin: number) =>
  new Intl.NumberFormat(LOCALE[currentLanguage()] ?? 'en-GB', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 2,
  }).format(tiyin / 100);
