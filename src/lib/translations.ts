
import type { Language } from '@/types';
import { enTranslations } from './english-translations';
import { trTranslations } from './turkish-translations';

type Translations = {
  [key: string]: string;
};

type AllTranslations = {
  [lang in Language]: Translations;
};

export const translations: AllTranslations = {
  en: {
    ...enTranslations,
  },
  tr: {
    ...trTranslations,
  },
};

// Ensure enTranslations is imported before this line
export type TranslationKey = keyof typeof translations.en; // Use 'en' as the canonical source for keys


