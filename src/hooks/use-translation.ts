
"use client";

import * as React from 'react'; // Added React import for useCallback
import { useLanguage } from '@/contexts/language-context';
import { translations, type TranslationKey } from '@/lib/translations';

export const useTranslation = () => {
  const { language } = useLanguage();

  const t = React.useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    let translation = translations[language][key] || translations.en[key] || key; // Fallback to English then key

    if (params) {
      Object.keys(params).forEach((paramKey) => {
        translation = translation.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }
    return translation;
  }, [language]); // Memoize 't' based on language

  return { t, currentLanguage: language };
};

