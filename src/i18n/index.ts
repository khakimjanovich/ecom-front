import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ru from './ru.json';
import uz from './uz.json';

export const LANGUAGES = [
  { code: 'uz', label: 'Oʻzbekcha', short: 'UZ' },
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'en', label: 'English', short: 'EN' },
] as const;

/** The screen language: the person's last choice, else the browser's, else English. */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ru: { translation: ru }, uz: { translation: uz } },
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

i18n.on('languageChanged', (lng) => document.documentElement.setAttribute('lang', lng));

/** The current language as a plain code (uz, ru, en), for Accept-Language and Keycloak's ui_locales. */
export const currentLanguage = () => i18n.resolvedLanguage ?? 'en';

export default i18n;
