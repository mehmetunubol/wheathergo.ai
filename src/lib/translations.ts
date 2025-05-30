
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
    // Admin App Settings - Usage Limits Configuration
    usageLimitsConfigCardTitle: "Usage Limits Configuration",
    usageLimitsConfigCardDesc: "Set the usage limits for different user tiers. These are applied daily or as total counts where applicable.",
    dailyImageGenerationsLimitLabel: "Daily Image Generations",
    dailyOutfitSuggestionsLimitLabel: "Daily Outfit Suggestions",
    dailyActivitySuggestionsLimitLabel: "Daily Activity Suggestions",
    maxTravelPlansLimitLabel: "Max Travel Plans (Total)",
  },
  tr: {
    ...trTranslations,
    // Admin App Settings - Usage Limits Configuration
    usageLimitsConfigCardTitle: "Kullanım Limitleri Yapılandırması",
    usageLimitsConfigCardDesc: "Farklı kullanıcı seviyeleri için kullanım limitlerini ayarlayın. Bunlar günlük veya uygun olduğu yerlerde toplam sayı olarak uygulanır.",
    dailyImageGenerationsLimitLabel: "Günlük Resim Oluşturma Limiti",
    dailyOutfitSuggestionsLimitLabel: "Günlük Kıyafet Önerisi Limiti",
    dailyActivitySuggestionsLimitLabel: "Günlük Aktivite Önerisi Limiti",
    maxTravelPlansLimitLabel: "Maksimum Seyahat Planı (Toplam)",
  },
};

// Ensure enTranslations is imported before this line
export type TranslationKey = keyof typeof translations.en; // Use 'en' as the canonical source for keys
