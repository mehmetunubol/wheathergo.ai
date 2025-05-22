
import type { WeatherData, HourlyForecastData } from '@/types';
import { format, parseISO, startOfDay, isValid } from 'date-fns';

const WEATHERAPI_BASE_URL = 'https://api.weatherapi.com/v1';
const API_KEY_ENV_VAR = process.env.NEXT_PUBLIC_WEATHERAPI_COM_API_KEY;

// Helper function to safely parse numbers from API, defaulting to 0 if invalid
const safeParseFloat = (value: any, defaultValue = 0): number => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

export async function fetchWeather(location: string, selectedDate: Date): Promise<WeatherData | undefined> {
  if (!API_KEY_ENV_VAR) {
    console.error("WeatherAPI.com API key is missing. Please set NEXT_PUBLIC_WEATHERAPI_COM_API_KEY in your .env.local file.");
    // Optionally, you could throw an error here or return a specific error object
    // For now, returning undefined to be handled by the caller
    return undefined;
  }

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  // WeatherAPI.com forecast.json endpoint can fetch current, future (up to 10-14 days typically), or historical data.
  // We use 'forecast.json' and provide the 'dt' parameter for a specific day.
  const apiUrl = `${WEATHERAPI_BASE_URL}/forecast.json?key=${API_KEY_ENV_VAR}&q=${encodeURIComponent(location)}&dt=${formattedDate}&aqi=no&alerts=no`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok || data.error) {
      console.error(`Error fetching weather data from WeatherAPI.com for ${location} on ${formattedDate}:`, data.error ? data.error.message : response.statusText, `URL: ${apiUrl}`);
      // You might want to throw an error here or return a specific error structure
      return undefined; // Or throw new Error(data.error?.message || `API Error: ${response.status}`);
    }

    if (!data.forecast || !data.forecast.forecastday || data.forecast.forecastday.length === 0) {
      console.error(`No forecast data available for ${location} on ${formattedDate}. URL: ${apiUrl}`);
      return undefined;
    }

    const forecastDay = data.forecast.forecastday[0];
    const dayInfo = forecastDay.day;
    const currentInfo = data.current; // Available if the date is today

    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

    const mainTemperature = isToday ? safeParseFloat(currentInfo.temp_c) : safeParseFloat(dayInfo.avgtemp_c);
    const mainConditionText = isToday ? currentInfo.condition.text : dayInfo.condition.text;
    const mainConditionCode = isToday ? String(currentInfo.condition.code) : String(dayInfo.condition.code); // Ensure string for consistency

    const weatherData: WeatherData = {
      temperature: Math.round(mainTemperature),
      condition: mainConditionText, // Generic condition text like "Sunny", "Partly cloudy"
      conditionCode: mainConditionCode, // API specific code
      humidity: isToday ? safeParseFloat(currentInfo.humidity) : safeParseFloat(dayInfo.avghumidity),
      windSpeed: isToday ? safeParseFloat(currentInfo.wind_kph) : safeParseFloat(dayInfo.maxwind_kph),
      location: `${data.location.name}, ${data.location.region || data.location.country}`,
      date: startOfDay(selectedDate).toISOString(), // Store date as ISO string (start of day for consistency)
      description: mainConditionText, // Can be same as condition or more detailed if available
      forecast: [],
    };

    const hourlyForecasts: HourlyForecastData[] = [];
    if (forecastDay.hour && forecastDay.hour.length > 0) {
      forecastDay.hour.forEach((hourData: any) => {
        // Check if the hour's date matches the selectedDate to avoid issues with multi-day hourly forecasts
        // if data.forecast.forecastday.length was > 1 (which it shouldn't be with &dt=)
        if (format(parseISO(hourData.time), 'yyyy-MM-dd') === formattedDate) {
          hourlyForecasts.push({
            time: format(parseISO(hourData.time), 'h a'), // e.g., "3 PM"
            temperature: Math.round(safeParseFloat(hourData.temp_c)),
            condition: hourData.condition.text,
            conditionCode: String(hourData.condition.code), // Ensure string
          });
        }
      });
    }
    
    // Ensure we have 24 hourly data points if needed, or filter to current day if already passed
    // For WeatherAPI, it gives 24 hours for the 'dt' specified.
    // If it's today, we might want to filter past hours, but the main page already handles showing future hours from this.
    // So providing all 24 for the given 'dt' is fine.
    weatherData.forecast = hourlyForecasts.slice(0, 24); // Take up to 24 hours for the selected date.

    return weatherData;

  } catch (error) {
    console.error(`Failed to fetch or parse weather data for ${location} on ${formattedDate}:`, error, `URL: ${apiUrl}`);
    return undefined;
  }
}
