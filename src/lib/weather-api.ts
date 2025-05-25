
import type { WeatherData, HourlyForecastData } from '@/types';
import { format, parseISO, startOfDay, isValid, isToday as fnsIsToday, addHours, getHours, differenceInCalendarDays, addDays } from 'date-fns';
import { guessWeather, type GuessedWeatherOutput } from '@/ai/flows/guess-weather-flow';

const WEATHERAPI_BASE_URL = 'https://api.weatherapi.com/v1';
const API_KEY_ENV_VAR = process.env.NEXT_PUBLIC_WEATHERAPI_COM_API_KEY;
// MAX_API_FORECAST_DAYS is now passed as a parameter

const safeParseFloat = (value: any, defaultValue = 0): number => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

const normalizeLocationString = (location: string): string => {
  let normalized = location;
  normalized = normalized.replace(/ı/g, 'i').replace(/İ/g, 'I');
  normalized = normalized.replace(/ş/g, 's').replace(/Ş/g, 'S');
  normalized = normalized.replace(/ğ/g, 'g').replace(/Ğ/g, 'G');
  normalized = normalized.replace(/ç/g, 'c').replace(/Ç/g, 'C');
  normalized = normalized.replace(/ö/g, 'o').replace(/Ö/g, 'O');
  normalized = normalized.replace(/ü/g, 'u').replace(/Ü/g, 'U');
  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalized.toLowerCase();
};

export async function fetchWeather(
  locationInput: string, 
  selectedDate: Date,
  maxApiForecastDays: number // Added parameter for max real forecast days from settings
): Promise<WeatherData> {
  if (!API_KEY_ENV_VAR) {
    const apiKeyError = "WeatherAPI.com API key is missing. Please set NEXT_PUBLIC_WEATHERAPI_COM_API_KEY.";
    console.error(apiKeyError);
    throw new Error(apiKeyError);
  }

  const originalLocation = locationInput;
  const normalizedQueryLocation = locationInput.toLowerCase() === "auto:ip" ? "auto:ip" : normalizeLocationString(locationInput);
  const formattedDateForAPI = format(selectedDate, 'yyyy-MM-dd');
  const today = startOfDay(new Date());
  const daysFromToday = differenceInCalendarDays(startOfDay(selectedDate), today);

  if (daysFromToday < 0) {
    console.warn(`Selected date ${formattedDateForAPI} is in the past. AI guess will be used.`);
  }
  
  if (daysFromToday > maxApiForecastDays || daysFromToday < 0) {
    console.log(`Date ${formattedDateForAPI} is outside WeatherAPI.com's direct forecast range (max ${maxApiForecastDays} days). Using AI guess.`);
    try {
      const guessedData: GuessedWeatherOutput = await guessWeather({ location: originalLocation, date: formattedDateForAPI });
      return {
        temperature: Math.round(guessedData.temperature),
        condition: guessedData.condition,
        conditionCode: guessedData.conditionCode,
        humidity: Math.round(guessedData.humidity),
        windSpeed: Math.round(guessedData.windSpeed),
        location: guessedData.locationName || originalLocation,
        date: startOfDay(selectedDate).toISOString(),
        description: guessedData.description,
        isDay: true, 
        forecast: [], 
        isGuessed: true,
      };
    } catch (aiError: any) {
      console.error(`AI weather guess failed for "${originalLocation}" on ${formattedDateForAPI}:`, aiError.message);
      throw new Error(`Failed to generate AI weather estimate: ${aiError.message}`);
    }
  }

  const apiUrl = `${WEATHERAPI_BASE_URL}/forecast.json?key=${API_KEY_ENV_VAR}&q=${encodeURIComponent(normalizedQueryLocation)}&dt=${formattedDateForAPI}&aqi=no&alerts=no`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMessage = data.error ? data.error.message : `API request failed with status ${response.status}: ${response.statusText}`;
      console.error(`Error fetching weather data from WeatherAPI.com for "${originalLocation}" (normalized: "${normalizedQueryLocation}") on ${formattedDateForAPI}:`, errorMessage, `URL: ${apiUrl}`);
      throw new Error(errorMessage);
    }

    if (!data.forecast || !data.forecast.forecastday || data.forecast.forecastday.length === 0) {
      const noDataError = `No forecast data available from WeatherAPI.com for "${originalLocation}" (normalized: "${normalizedQueryLocation}") on ${formattedDateForAPI}.`;
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
      isGuessed: false,
    };

    const hourlyForecasts: HourlyForecastData[] = [];
    if (forecastDay.hour && forecastDay.hour.length > 0) {
      const maxHoursToFetch = 24; 
      let hoursAdded = 0;
      
      const forecastStartHour = isActualToday ? getHours(selectedDate) : 0;

      for (const hourData of forecastDay.hour) {
        const hourEpoch = hourData.time_epoch;
        const hourDate = new Date(hourEpoch * 1000); 
        const hourOfDay = getHours(hourDate);

        if (format(hourDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) {
          if (isActualToday && hourOfDay < forecastStartHour) {
            continue; 
          }

          hourlyForecasts.push({
            time: format(hourDate, 'h a'), 
            temperature: Math.round(safeParseFloat(hourData.temp_c)),
            condition: hourData.condition.text,
            conditionCode: String(hourData.condition.code),
            isDay: hourData.is_day === 1,
          });
          hoursAdded++;
        }
        if (hoursAdded >= maxHoursToFetch) break;
      }
    }
    weatherData.forecast = hourlyForecasts;

    return weatherData;

  } catch (error: any) {
    console.error(`Failed to fetch or parse weather data for "${originalLocation}" (normalized: "${normalizedQueryLocation}") on ${formattedDateForAPI}:`, error.message, `URL Attempted: ${apiUrl}`);
    throw error;
  }
}
