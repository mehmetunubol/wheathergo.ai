
import type { WeatherData, HourlyForecastData } from '@/types';
import { format, parseISO, startOfDay, isValid, isToday as fnsIsToday } from 'date-fns';

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
    // In a real app, you might throw an error or return a specific error object.
    return undefined;
  }

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  // For WeatherAPI, 'dt' is used for historical data. For forecast (including today), 'days' param and simple q is enough.
  // However, to get a specific day's forecast (even today), forecast.json with 'dt' should work for forecast up to 10 days.
  // If we need more than 1 day forecast for the main WeatherData (not just hourly), the API structure might differ.
  // For now, we're targeting forecast for a single 'dt'.
  const apiUrl = `${WEATHERAPI_BASE_URL}/forecast.json?key=${API_KEY_ENV_VAR}&q=${encodeURIComponent(location)}&dt=${formattedDate}&aqi=no&alerts=no`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok || data.error) {
      console.error(`Error fetching weather data from WeatherAPI.com for ${location} on ${formattedDate}:`, data.error ? data.error.message : response.statusText, `URL: ${apiUrl}`);
      return undefined;
    }

    if (!data.forecast || !data.forecast.forecastday || data.forecast.forecastday.length === 0) {
      console.error(`No forecast data available for ${location} on ${formattedDate}. URL: ${apiUrl}`);
      return undefined;
    }

    const forecastDay = data.forecast.forecastday[0];
    const dayInfo = forecastDay.day;
    const currentInfo = data.current; // This is present even if 'dt' is a future date, representing current conditions at the location.

    // Determine if the selectedDate is "today"
    const isActualToday = fnsIsToday(selectedDate);

    // For the main WeatherData object:
    // If selectedDate is today, use current conditions.
    // If selectedDate is a future/past day, use the daily average/summary from forecastDay.day.
    const mainTemperature = isActualToday ? safeParseFloat(currentInfo.temp_c) : safeParseFloat(dayInfo.avgtemp_c);
    const mainConditionText = isActualToday ? currentInfo.condition.text : dayInfo.condition.text;
    const mainConditionCode = isActualToday ? String(currentInfo.condition.code) : String(dayInfo.condition.code);
    // is_day from current for today, default to true (day) for forecast day summary
    const mainIsDay = isActualToday ? currentInfo.is_day === 1 : true; 
    const humidity = isActualToday ? safeParseFloat(currentInfo.humidity) : safeParseFloat(dayInfo.avghumidity);
    const windSpeed = isActualToday ? safeParseFloat(currentInfo.wind_kph) : safeParseFloat(dayInfo.maxwind_kph);


    const weatherData: WeatherData = {
      temperature: Math.round(mainTemperature),
      condition: mainConditionText,
      conditionCode: mainConditionCode,
      humidity: humidity,
      windSpeed: windSpeed,
      location: `${data.location.name}, ${data.location.region || data.location.country}`,
      date: startOfDay(selectedDate).toISOString(), // Store date as start of day ISO string
      description: mainConditionText, // Typically same as condition for WeatherAPI
      isDay: mainIsDay,
      forecast: [],
    };

    // Hourly forecast for the selected date
    const hourlyForecasts: HourlyForecastData[] = [];
    if (forecastDay.hour && forecastDay.hour.length > 0) {
      forecastDay.hour.forEach((hourData: any) => {
        // Ensure the hour belongs to the selectedDate
        // WeatherAPI's forecast.json with 'dt' param should already give hours for that 'dt'
        // but a defensive check on date part of hourData.time is good.
        if (format(parseISO(hourData.time), 'yyyy-MM-dd') === formattedDate) {
          hourlyForecasts.push({
            time: format(parseISO(hourData.time), 'h a'), // e.g., "3 PM"
            temperature: Math.round(safeParseFloat(hourData.temp_c)),
            condition: hourData.condition.text,
            conditionCode: String(hourData.condition.code),
            isDay: hourData.is_day === 1,
          });
        }
      });
    }
    
    // WeatherAPI forecast.json with 'dt' typically returns 24 hours for that day.
    weatherData.forecast = hourlyForecasts.slice(0, 24); // Ensure we don't exceed 24 if API gives more

    return weatherData;

  } catch (error) {
    console.error(`Failed to fetch or parse weather data for ${location} on ${formattedDate}:`, error, `URL: ${apiUrl}`);
    return undefined;
  }
}
