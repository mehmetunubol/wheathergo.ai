
import type { WeatherData, HourlyForecastData } from '@/types';
import { format, parseISO, startOfDay, isValid, isToday as fnsIsToday, addHours, getHours } from 'date-fns';

const WEATHERAPI_BASE_URL = 'https://api.weatherapi.com/v1';
const API_KEY_ENV_VAR = process.env.NEXT_PUBLIC_WEATHERAPI_COM_API_KEY;

// Helper function to safely parse numbers from API, defaulting to 0 if invalid
const safeParseFloat = (value: any, defaultValue = 0): number => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

export async function fetchWeather(location: string, selectedDate: Date): Promise<WeatherData> {
  if (!API_KEY_ENV_VAR) {
    const apiKeyError = "WeatherAPI.com API key is missing. Please set NEXT_PUBLIC_WEATHERAPI_COM_API_KEY.";
    console.error(apiKeyError);
    throw new Error(apiKeyError);
  }

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const apiUrl = `${WEATHERAPI_BASE_URL}/forecast.json?key=${API_KEY_ENV_VAR}&q=${encodeURIComponent(location)}&dt=${formattedDate}&aqi=no&alerts=no`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMessage = data.error ? data.error.message : `API request failed with status ${response.status}: ${response.statusText}`;
      console.error(`Error fetching weather data from WeatherAPI.com for ${location} on ${formattedDate}:`, errorMessage, `URL: ${apiUrl}`);
      throw new Error(errorMessage);
    }

    if (!data.forecast || !data.forecast.forecastday || data.forecast.forecastday.length === 0) {
      const noDataError = `No forecast data available for ${location} on ${formattedDate}.`;
      console.error(noDataError, `URL: ${apiUrl}`);
      throw new Error(noDataError);
    }

    const forecastDay = data.forecast.forecastday[0];
    const dayInfo = forecastDay.day;
    const currentInfo = data.current; 

    const isActualToday = fnsIsToday(selectedDate);

    const mainTemperature = isActualToday ? safeParseFloat(currentInfo.temp_c) : safeParseFloat(dayInfo.avgtemp_c);
    const mainConditionText = isActualToday ? currentInfo.condition.text : dayInfo.condition.text;
    const mainConditionCode = isActualToday ? String(currentInfo.condition.code) : String(dayInfo.condition.code);
    const mainIsDay = isActualToday ? currentInfo.is_day === 1 : true; 
    const humidity = isActualToday ? safeParseFloat(currentInfo.humidity) : safeParseFloat(dayInfo.avghumidity);
    const windSpeed = isActualToday ? safeParseFloat(currentInfo.wind_kph) : safeParseFloat(dayInfo.maxwind_kph);


    const weatherData: WeatherData = {
      temperature: Math.round(mainTemperature),
      condition: mainConditionText,
      conditionCode: mainConditionCode,
      humidity: Math.round(humidity),
      windSpeed: Math.round(windSpeed),
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
    
    weatherData.forecast = hourlyForecasts;

    return weatherData;

  } catch (error: any) {
    // Catch fetch errors (network issues) or errors re-thrown from response check
    console.error(`Failed to fetch or parse weather data for "${location}" on ${formattedDate}:`, error.message, `URL Attempted: ${apiUrl}`);
    // Re-throw the error so the calling client code can handle it for UI updates
    throw error; 
  }
}
