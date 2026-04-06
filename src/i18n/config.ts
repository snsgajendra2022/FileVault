import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

export const LANGUAGE_STORAGE_KEY = 'fv_language';

const saved =
  typeof localStorage !== 'undefined' ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
const initialLng = saved === 'hi' || saved === 'en' ? saved : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: {
    useSuspense: false,
  },
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng === 'hi' ? 'hi' : 'en';
  }
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLng === 'hi' ? 'hi' : 'en';
}

export default i18n;
