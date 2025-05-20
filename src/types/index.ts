
import type { LucideProps } from 'lucide-react';
import type { ClothingSuggestionsOutput } from '@/ai/flows/clothing-suggestions';
import type { ActivitySuggestionsOutput } from '@/ai/flows/activity-suggestions';

export interface HourlyForecastData {
  time: string; // e.g., "3:00 PM" or "May 21, 3:00 PM"
  temperature: number;
  condition: string; // "Sunny", "Cloudy", etc.
  conditionCode: string; // Icon code
  icon?: React.FC<LucideProps>; // Optional: pre-resolved icon component
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
  forecast?: HourlyForecastData[];
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
  tripContext?: string; // New field for trip-specific context
}

// This type is primarily for internal use within the trip details page
export interface TripSegmentSuggestions {
  id: 'start' | 'middle' | 'end';
  label: string;
  date: Date;
  weatherData: WeatherData | null;
  clothingSuggestions: ClothingSuggestionsOutput | null;
  activitySuggestions: ActivitySuggestionsOutput | null;
  isLoading: boolean;
  error: string | null;
}
