import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import zh from './zh/translation.json';
import en from './en/translation.json';

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { zh: { translation: zh }, en: { translation: en } },
  fallbackLng: 'zh', supportedLngs: ['zh', 'en'], load: 'languageOnly',
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  interpolation: { escapeValue: false },
});
export default i18n;
