
import type { LucideProps } from 'lucide-react';
import type { ClothingSuggestionsOutput } from '@/ai/flows/clothing-suggestions';
import type { ActivitySuggestionsOutput } from '@/ai/flows/activity-suggestions';

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
  segmentId: 'start' | 'middle' | 'end'; // To identify the segment (matches UI segment id)
  date: string; // ISO string of the segment's date
  weatherData: WeatherData; // Can now include isGuessed
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
  userId?: string; // Added when saving to Firestore
  createdAt?: string; // Added when saving to Firestore
  storedSuggestions?: StoredTripSegmentData[]; // Array to hold suggestions for key dates
}

// This type is primarily for UI state within the trip details page
export interface TripSegmentSuggestions {
  id: 'start' | 'middle' | 'end';
  label: string;
  date: Date;
  weatherData: WeatherData | null; // Can now include isGuessed
  clothingSuggestions: ClothingSuggestionsOutput | null;
  activitySuggestions: ActivitySuggestionsOutput | null;
  isLoading: boolean;
  error: string | null;
  source?: 'stored' | 'newly-fetched'; // To track where the data came from
}

// Cache types for homepage
export interface CachedItem<T> {
  timestamp: number;
  data: T;
  isGuessed?: boolean; // To know if cached data was an AI guess
}

export type CachedWeatherData = CachedItem<WeatherData>;
export type CachedOutfitSuggestions = CachedItem<ClothingSuggestionsOutput>;
export type CachedActivitySuggestions = CachedItem<ActivitySuggestionsOutput>;

// AI Flow for guessed weather
export interface GuessedWeatherInput {
  location: string;
  date: string; // YYYY-MM-DD
}

export interface GuessedWeatherOutput {
  temperature: number;
  condition: string;
  conditionCode: string;
  humidity: number;
  windSpeed: number;
  description: string;
  locationName?: string; // AI might return a resolved location name
}

