import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBR from './locales/pt-BR.json';
import es from './locales/es.json';
import en from './locales/en.json';

const savedLanguage = localStorage.getItem('profileai_language') || 'pt-BR';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      es: { translation: es },
      en: { translation: en },
    },
    lng: savedLanguage,
    fallbackLng: 'pt-BR',
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('profileai_language', lng);
  document.documentElement.lang = lng;
});

export default i18n;
