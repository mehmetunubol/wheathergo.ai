
import type { LucideProps } from 'lucide-react';

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

export interface TravelPlanItem {
  id: string;
  tripName: string;
  location: string;
  email: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  notificationTime: string; // e.g., "09:00" (24-hour format)
  notificationTimeLabel?: string; // User-friendly time label e.g. "9:00 AM"
}
