
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
    premiumComingSoonTitle: "Premium Upgrades Coming Soon!",
    premiumComingSoonDesc: "Direct upgrades to our Premium Tier will be available here shortly. We're working on integrating a seamless payment system.",
    premiumTrialRequest: "In the meantime, if you'd like to be considered for a trial of our Premium features, please contact an administrator.",
    contactAdminButton: "Contact Admin",
    imageGenerationAIBusyError: "The AI image generator is currently busy or encountered an issue. Please try again in a few moments.",
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
    premiumComingSoonTitle: "Premium Yükseltmeler Çok Yakında!",
    premiumComingSoonDesc: "Premium Seviyemize doğrudan yükseltmeler yakında burada olacak. Sorunsuz bir ödeme sistemi entegre etmek için çalışıyoruz.",
    premiumTrialRequest: "Bu arada, Premium özelliklerimizi denemek için değerlendirilmek isterseniz, lütfen bir yöneticiyle iletişime geçin.",
    contactAdminButton: "Yöneticiyle İletişime Geç",
    imageGenerationAIBusyError: "AI resim oluşturucu şu anda meşgul veya bir sorunla karşılaştı. Lütfen birkaç dakika içinde tekrar deneyin.",
  },
};

// Ensure enTranslations is imported before this line
export type TranslationKey = keyof typeof translations.en; // Use 'en' as the canonical source for keys

