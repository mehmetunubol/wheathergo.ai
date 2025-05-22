
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
    return undefined;
  }

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
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
    const currentInfo = data.current; 

    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

    const mainTemperature = isToday ? safeParseFloat(currentInfo.temp_c) : safeParseFloat(dayInfo.avgtemp_c);
    const mainConditionText = isToday ? currentInfo.condition.text : dayInfo.condition.text;
    const mainConditionCode = isToday ? String(currentInfo.condition.code) : String(dayInfo.condition.code);
    const mainIsDay = isToday ? currentInfo.is_day === 1 : true; // Default to day for forecast days, use current for today

    const weatherData: WeatherData = {
      temperature: Math.round(mainTemperature),
      condition: mainConditionText,
      conditionCode: mainConditionCode,
      humidity: isToday ? safeParseFloat(currentInfo.humidity) : safeParseFloat(dayInfo.avghumidity),
      windSpeed: isToday ? safeParseFloat(currentInfo.wind_kph) : safeParseFloat(dayInfo.maxwind_kph),
      location: `${data.location.name}, ${data.location.region || data.location.country}`,
      date: startOfDay(selectedDate).toISOString(),
      description: mainConditionText,
      isDay: mainIsDay,
      forecast: [],
    };

    const hourlyForecasts: HourlyForecastData[] = [];
    if (forecastDay.hour && forecastDay.hour.length > 0) {
      forecastDay.hour.forEach((hourData: any) => {
        if (format(parseISO(hourData.time), 'yyyy-MM-dd') === formattedDate) {
          hourlyForecasts.push({
            time: format(parseISO(hourData.time), 'h a'),
            temperature: Math.round(safeParseFloat(hourData.temp_c)),
            condition: hourData.condition.text,
            conditionCode: String(hourData.condition.code),
            isDay: hourData.is_day === 1,
          });
        }
      });
    }
    
    weatherData.forecast = hourlyForecasts.slice(0, 24);

    return weatherData;

  } catch (error) {
    console.error(`Failed to fetch or parse weather data for ${location} on ${formattedDate}:`, error, `URL: ${apiUrl}`);
    return undefined;
  }
}
