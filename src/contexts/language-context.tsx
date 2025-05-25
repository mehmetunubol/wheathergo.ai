
"use client";

import type { Locale } from 'date-fns';
import { enUS as enUSLocale, tr as trLocale } from 'date-fns/locale';
import * as React from 'react';
import type { Language, DateFnsLocaleMapping } from '@/types';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  dateLocale: Locale;
}

const dateLocales: DateFnsLocaleMapping = {
  en: enUSLocale,
  tr: trLocale,
};

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = React.useState<Language>('tr'); // Default to Turkish
  const [dateLocale, setDateLocale] = React.useState<Locale>(trLocale);

  React.useEffect(() => {
    const storedLang = localStorage.getItem('weatherugo-language') as Language | null;
    if (storedLang && (storedLang === 'en' || storedLang === 'tr')) {
      setLanguageState(storedLang);
      setDateLocale(dateLocales[storedLang]);
    } else {
      // If no stored language, or invalid, default to Turkish
      localStorage.setItem('weatherugo-language', 'tr');
      setLanguageState('tr');
      setDateLocale(trLocale);
    }
  }, []);

  const setLanguage = (newLang: Language) => {
    if (newLang === 'en' || newLang === 'tr') {
      localStorage.setItem('weatherugo-language', newLang);
      setLanguageState(newLang);
      setDateLocale(dateLocales[newLang]);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, dateLocale }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
