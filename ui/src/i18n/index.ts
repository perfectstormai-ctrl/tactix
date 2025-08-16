import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/common.json';
import fr from './locales/fr/common.json';

const saved = localStorage.getItem('tactix.lang');
const browser = navigator.language && navigator.language.startsWith('fr') ? 'fr' : 'en';
const lang = saved || browser;

void i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr }
    },
    lng: lang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18next;
