
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
    notificationsConfiguredPremium: "Email notifications are configured for your travel plans.",
    notificationsPremiumFeature: "Automated email notifications for travel plans are a premium feature. Upgrade to receive daily/weekly updates!",
    // Newly added for missing translations
    validationErrorFillAllFields: "Please fill in all required fields.",
    validationErrorInvalidEmail: "Please enter a valid email address.",
    validationErrorEndDateBeforeStart: "End date cannot be before the start date.",
    errorAppSettingsLoading: "App settings are still loading, please wait.",
    errorCouldNotAddTravelPlan: "Could not add travel plan. Please try again.",
    successTravelPlanDeletedParam: "Travel plan '{tripName}' has been deleted.",
    errorCouldNotDeleteTravelPlan: "Could not delete travel plan.",

    userStatusUpdatedParam: "User {userId} active status updated to: {status}.",
    userAdminStatusUpdatedParam: "User {userId} admin status updated to: {status}.",
    userPremiumStatusUpdatedParam: "User {userId} premium status updated to: {status}.",
    userDeletedParam: "User {userId} Firestore record has been deleted.",

    blogPostStatusUpdatedParam: "Blog post '{postId}' status updated to: {status}.",
    blogPostDeletedParam: "Blog post '{postId}' has been deleted.",
    errorAIGenerateGeneric: "Failed to generate content with AI. Please try again.",

    activated: "activated",
    deactivated: "deactivated",
    promotedToAdmin: "promoted to admin",
    demotedFromAdmin: "demoted from admin",
    grantedPremium: "granted premium",
    revokedPremium: "revoked premium",
    errorFirebase: "A Firebase error occurred: {message}",
    adminToggleOwnAdminError: "Administrators cannot change their own admin status.",
    adminToggleOwnActiveError: "Administrators cannot change their own active status.",
    adminDeleteOwnError: "Administrators cannot delete their own account record.",
    confirmDeleteUserTitle: "Delete User Record?",
    confirmDeleteUserDesc: "This action will delete the user's Firestore record for '{userIdentifier}'. It will NOT delete their Firebase Authentication account. The user might be able to log in again, creating a new record.",
    confirmDeleteBlogPostTitle: "Delete Blog Post?",
    confirmDeleteBlogPostDesc: "Are you sure you want to delete the blog post titled '{postTitle}'? This action cannot be undone.",
    loginToVisualizeTitle: "Visualize Your Outfit with AI!",
    loginToVisualizeDescription: "Log in or sign up to use our AI-powered image generation and see your suggested outfit come to life.",
    loginToVisualizeButton: "Log In to Visualize",
    startOfTripLabel: "Start of Trip",
    middleOfTripLabel: "Middle of Trip",
    endOfTripLabel: "End of Trip",
    sharePlanDetailsNotLoaded: "Plan details are not loaded.",
    shareSuggestionsLoadingOrIncomplete: "Suggestions are loading or weather data is incomplete for some days.",
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
    notificationsConfiguredPremium: "Seyahat planlarınız için e-posta bildirimleri yapılandırıldı.",
    notificationsPremiumFeature: "Seyahat planları için otomatik e-posta bildirimleri premium bir özelliktir. Seyahatleriniz için günlük/haftalık güncellemeler almak için yükseltin!",
    // Newly added for missing translations
    validationErrorFillAllFields: "Lütfen tüm gerekli alanları doldurun.",
    validationErrorInvalidEmail: "Lütfen geçerli bir e-posta adresi girin.",
    validationErrorEndDateBeforeStart: "Bitiş tarihi başlangıç tarihinden önce olamaz.",
    errorAppSettingsLoading: "Uygulama ayarları hala yükleniyor, lütfen bekleyin.",
    errorCouldNotAddTravelPlan: "Seyahat planı eklenemedi. Lütfen tekrar deneyin.",
    successTravelPlanDeletedParam: "'{tripName}' adlı seyahat planı silindi.",
    errorCouldNotDeleteTravelPlan: "Seyahat planı silinemedi.",

    userStatusUpdatedParam: "{userId} kullanıcısının aktiflik durumu şuna güncellendi: {status}.",
    userAdminStatusUpdatedParam: "{userId} kullanıcısının yönetici durumu şuna güncellendi: {status}.",
    userPremiumStatusUpdatedParam: "{userId} kullanıcısının premium durumu şuna güncellendi: {status}.",
    userDeletedParam: "{userId} kullanıcısının Firestore kaydı silindi.",

    blogPostStatusUpdatedParam: "'{postId}' başlıklı blog yazısının durumu şuna güncellendi: {status}.",
    blogPostDeletedParam: "'{postId}' başlıklı blog yazısı silindi.",
    errorAIGenerateGeneric: "AI ile içerik oluşturulamadı. Lütfen tekrar deneyin.",
    
    activated: "etkinleştirildi",
    deactivated: "devre dışı bırakıldı",
    promotedToAdmin: "yönetici yapıldı",
    demotedFromAdmin: "yöneticilikten çıkarıldı",
    grantedPremium: "premium verildi",
    revokedPremium: "premium geri alındı",
    errorFirebase: "Bir Firebase hatası oluştu: {message}",
    adminToggleOwnAdminError: "Yöneticiler kendi yönetici durumlarını değiştiremezler.",
    adminToggleOwnActiveError: "Yöneticiler kendi aktiflik durumlarını değiştiremezler.",
    adminDeleteOwnError: "Yöneticiler kendi hesap kayıtlarını silemezler.",
    confirmDeleteUserTitle: "Kullanıcı Kaydını Sil?",
    confirmDeleteUserDesc: "'{userIdentifier}' kullanıcısının Firestore kaydını silmek istediğinizden emin misiniz? Bu işlem Firebase Kimlik Doğrulama hesabını SİLMEZ. Kullanıcı tekrar giriş yaparak yeni bir kayıt oluşturabilir.",
    confirmDeleteBlogPostTitle: "Blog Yazısını Sil?",
    confirmDeleteBlogPostDesc: "'{postTitle}' başlıklı blog yazısını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
    loginToVisualizeTitle: "Kıyafetinizi AI ile Görselleştirin!",
    loginToVisualizeDescription: "Önerilen kıyafetinizin canlandığını görmek için AI destekli resim oluşturma özelliğimizi kullanmak üzere giriş yapın veya kaydolun.",
    loginToVisualizeButton: "Görselleştirmek İçin Giriş Yapın",
    startOfTripLabel: "Seyahat Başlangıcı",
    middleOfTripLabel: "Seyahat Ortası",
    endOfTripLabel: "Seyahat Sonu",
    sharePlanDetailsNotLoaded: "Plan detayları yüklenmedi.",
    shareSuggestionsLoadingOrIncomplete: "Öneriler yükleniyor veya bazı günler için hava durumu verileri eksik.",
  },
};

// Ensure enTranslations is imported before this line
export type TranslationKey = keyof typeof translations.en; // Use 'en' as the canonical source for keys

    
