
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
    aiFlowModelConfigCardTitle: "AI Flow Model Configuration", 
    aiFlowModelConfigCardDesc: "Select the AI model to be used for each specific generative flow.", 
    selectModelPlaceholder: "Select a model", 
    defaultModelLabel: "Default", 
    footerCopyright: "© {year} Weatherugo by Flow Teknoloji. All rights reserved.",
    privacyPolicyShort: "Privacy",
    termsOfServiceShort: "Terms",
    supportLinkText: "Support",
    instagramAltText: "Weatherugo Instagram",
    linkedinAltText: "Weatherugo LinkedIn",
  },
  tr: {
    ...trTranslations,
    aiFlowModelConfigCardTitle: "AI Akış Modeli Yapılandırması", 
    aiFlowModelConfigCardDesc: "Her bir üretken akış için kullanılacak AI modelini seçin.", 
    selectModelPlaceholder: "Bir model seçin", 
    defaultModelLabel: "Varsayılan", 
    footerCopyright: "© {year} Weatherugo, Flow Teknoloji tarafından. Tüm hakları saklıdır.",
    privacyPolicyShort: "Gizlilik",
    termsOfServiceShort: "Şartlar",
    supportLinkText: "Destek",
    instagramAltText: "Weatherugo Instagram",
    linkedinAltText: "Weatherugo LinkedIn",
  },
};

export type TranslationKey = keyof typeof translations.en;
