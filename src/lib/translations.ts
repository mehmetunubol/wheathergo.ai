
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
    aiFlowModelConfigCardTitle: "AI Flow Model Configuration", // Added
    aiFlowModelConfigCardDesc: "Select the AI model to be used for each specific generative flow.", // Added
    selectModelPlaceholder: "Select a model", // Added
    defaultModelLabel: "Default", // Added
  },
  tr: {
    ...trTranslations,
    aiFlowModelConfigCardTitle: "AI Akış Modeli Yapılandırması", // Added
    aiFlowModelConfigCardDesc: "Her bir üretken akış için kullanılacak AI modelini seçin.", // Added
    selectModelPlaceholder: "Bir model seçin", // Added
    defaultModelLabel: "Varsayılan", // Added
  },
};

export type TranslationKey = keyof typeof translations.en;
