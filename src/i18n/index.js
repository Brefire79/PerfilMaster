import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// FIX: removidos EN e ES — app é PT-BR exclusivo. Arquivos preservados em /locales mas não importados (não entram no bundle).
import ptBR from './locales/pt-BR.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
    },
    lng: 'pt-BR',
    fallbackLng: 'pt-BR',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
  });

// Garante que o localStorage não force um idioma removido
localStorage.setItem('profileai_language', 'pt-BR');
document.documentElement.lang = 'pt-BR';

export default i18n;
