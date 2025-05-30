
import type { LucideProps } from 'lucide-react';
import type { ClothingSuggestionsOutput } from '@/ai/flows/clothing-suggestions';
import type { ActivitySuggestionsOutput } from '@/ai/flows/activity-suggestions';
import type { Locale } from 'date-fns';

export type Language = 'en' | 'tr';

export interface DateFnsLocaleMapping {
  en: Locale;
  tr: Locale;
}

export interface HourlyForecastData {
  time: string; // e.g., "3:00 PM" or "May 21, 3:00 PM"
  temperature: number;
  condition: string; // "Sunny", "Cloudy", etc.
  conditionCode: string; // Icon code
  icon?: React.FC<LucideProps>; // Optional: pre-resolved icon component
  isDay?: boolean; // Optional: true if daytime, false if nighttime
}

export interface WeatherData {
  temperature: number;
  condition: string;
  conditionCode: string;
  humidity: number;
  windSpeed: number;
  location: string;
  date: string; // ISO string for the forecast date
  description: string;
  isDay?: boolean; // Optional: true if daytime, false if nighttime
  forecast?: HourlyForecastData[];
  isGuessed?: boolean; // True if this data is AI-generated
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL?: string | null;
  isAdmin?: boolean;
  isActive?: boolean;
  createdAt?: string;
  isPremium?: boolean;
  dailyImageGenerations?: DailyUsage;
  dailyOutfitSuggestions?: DailyUsage;
  dailyActivitySuggestions?: DailyUsage;
}

export interface FamilyProfile {
  description: string;
}

// For localStorage to track weather changes
export interface LastKnownWeather {
  condition: string;
  temperature: number;
  location: string;
  date: string; // Date for which this weather was known, YYYY-MM-DD
}

export type NotificationFrequency = 'daily' | 'weekly';

// Represents the data structure for storing fetched suggestions in Firestore
export interface StoredTripSegmentData {
  segmentId: 'start' | 'middle' | 'end';
  date: string; // ISO string of the segment's date
  weatherData: WeatherData;
  clothingSuggestions: ClothingSuggestionsOutput;
  activitySuggestions: ActivitySuggestionsOutput;
  fetchedAt: string; // ISO string, timestamp of when this was fetched/updated
}

export interface TravelPlanItem {
  id: string;
  tripName: string;
  location: string;
  email: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  notificationTime: string; // e.g., "09:00" (24-hour format)
  notificationTimeLabel?: string; // User-friendly time label e.g. "9:00 AM"
  notificationFrequency: NotificationFrequency;
  tripContext?: string;
  userId?: string;
  createdAt?: string; // ISO string
  storedSuggestions?: StoredTripSegmentData[];
}

// This type is primarily for UI state within the trip details page
export interface TripSegmentSuggestions {
  id: 'start' | 'middle' | 'end';
  label: string;
  date: Date;
  weatherData: WeatherData | null;
  clothingSuggestions: ClothingSuggestionsOutput | null;
  activitySuggestions: ActivitySuggestionsOutput | null;
  isLoading: boolean;
  error: string | null;
  source?: 'stored' | 'newly-fetched';
}

// Cache types for homepage
export interface CachedItem<T> {
  timestamp: number;
  data: T;
  isGuessed?: boolean;
}

export type CachedWeatherData = CachedItem<WeatherData>;
export type CachedOutfitSuggestions = CachedItem<ClothingSuggestionsOutput>;
export type CachedActivitySuggestions = CachedItem<ActivitySuggestionsOutput>;

// AI Flow for guessed weather
export interface GuessedWeatherInput {
  location: string;
  date: string; // YYYY-MM-DD
  language?: Language;
}

export interface GuessedWeatherOutput {
  temperature: number;
  condition: string;
  conditionCode: string;
  humidity: number;
  windSpeed: number;
  description: string;
  locationName?: string;
}

// AI Flow for clothing suggestions
export interface ClothingSuggestionsInput {
  weatherCondition: string;
  temperature: number;
  familyProfile: string;
  location: string;
  timeOfDay?: string;
  language?: Language;
}

// AI Flow for activity suggestions
export interface ActivitySuggestionsInput {
  weatherCondition: string;
  temperature: number;
  familyProfile: string;
  timeOfDay: string;
  locationPreferences?: string;
  language?: Language;
}


// Firestore document for storing user preferences
export interface UserPreferences {
  lastLocation?: string;
  lastSelectedDate?: string;
  defaultLocation?: string;
}

// Firestore document for main user profile
export interface UserProfileData {
    description: string;
    updatedAt: string; // ISO string
}

// Application-wide settings configurable by admin
export interface AppSettings {
  defaultLocation: string;
  cacheDurationMs: number;
  maxApiForecastDays: number;
  defaultFamilyProfile: string;
  defaultNotificationTime: string; // e.g., "09:00"
  defaultNotificationFrequency: NotificationFrequency; // 'daily' | 'weekly'
}

// Blog Post Type
export interface BlogPost {
  id?: string; // Firestore document ID
  title: string;
  slug: string; // URL-friendly identifier
  content: string; // Markdown content
  authorId: string;
  authorName: string | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  publishedAt?: string | null; // ISO string, null if not published
  isPublished: boolean;
  excerpt?: string; // Short summary
  imageUrl?: string; // URL for a cover image
  tags?: string[];
}

// Input for the visual outfit generation flow
export interface GenerateVisualOutfitInput {
  weatherData: WeatherData;
  familyProfile: string;
  clothingSuggestions: ClothingSuggestionsOutput;
  language: Language;
}

// Output for the visual outfit generation flow
export interface GenerateVisualOutfitOutput {
  generatedImageUrl: string | null; // Data URI
}

// Input for Text Translation flow (for image prompt generation)
export interface TranslateTextsForImagePromptInput {
  familyProfile: string;
  weatherCondition: string;
  clothingSuggestions: string[];
  sourceLanguage: Language;
}

// Output for Text Translation flow
export interface TranslateTextsForImagePromptOutput {
  translatedFamilyProfile: string;
  translatedWeatherCondition: string;
  translatedClothingSuggestions: string[];
}


// Input for Blog Content Generation
export interface GenerateBlogContentInput {
  title: string;
  promptDetails?: string;
  language?: Language;
}

// Output for Blog Content Generation
export interface GenerateBlogContentOutput {
  generatedContent: string; // Markdown content
}

// Usage Limits Configuration
export const USAGE_LIMITS = {
  freeTier: {
    dailyImageGenerations: 3,
    dailyOutfitSuggestions: 10,
    dailyActivitySuggestions: 10,
    maxTravelPlans: 10,
  },
  premiumTier: { // Example for future use
    dailyImageGenerations: 50,
    dailyOutfitSuggestions: 100,
    dailyActivitySuggestions: 100,
    maxTravelPlans: 100,
  },
};

export type UsageLimitType = 'imageGenerations' | 'outfitSuggestions' | 'activitySuggestions';
