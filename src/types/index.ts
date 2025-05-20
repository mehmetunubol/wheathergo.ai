import type { LucideProps } from 'lucide-react';

export interface WeatherData {
  temperature: number;
  condition: string; // "Sunny", "Cloudy", "Rainy", "Snowy"
  conditionCode: string; // To map to icons
  humidity: number;
  windSpeed: number;
  location: string;
  date: string; // ISO string for the forecast date
  description: string; // e.g. "Clear sky"
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
