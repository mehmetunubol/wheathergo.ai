
import type { WeatherData, HourlyForecastData } from '@/types';
import { format, parseISO, startOfDay, isValid, isToday as fnsIsToday, addHours, getHours } from 'date-fns';

const WEATHERAPI_BASE_URL = 'https://api.weatherapi.com/v1';
const API_KEY_ENV_VAR = process.env.NEXT_PUBLIC_WEATHERAPI_COM_API_KEY;

// Helper function to safely parse numbers from API, defaulting to 0 if invalid
const safeParseFloat = (value: any, defaultValue = 0): number => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

// Helper function to normalize location strings
const normalizeLocationString = (location: string): string => {
  let normalized = location;

  // Specific character replacements (e.g., Turkish characters to common Latin counterparts)
  // This step is crucial for characters like 'ı' which don't get handled by NFD correctly for this purpose.
  normalized = normalized.replace(/ı/g, 'i');
  normalized = normalized.replace(/İ/g, 'I'); // Will become 'i' after toLowerCase
  normalized = normalized.replace(/ş/g, 's');
  normalized = normalized.replace(/Ş/g, 'S'); // Will become 's'
  normalized = normalized.replace(/ğ/g, 'g');
  normalized = normalized.replace(/Ğ/g, 'G'); // Will become 'g'
  normalized = normalized.replace(/ç/g, 'c');
  normalized = normalized.replace(/Ç/g, 'C'); // Will become 'c'
  normalized = normalized.replace(/ö/g, 'o');
  normalized = normalized.replace(/Ö/g, 'O'); // Will become 'o'
  normalized = normalized.replace(/ü/g, 'u');
  normalized = normalized.replace(/Ü/g, 'U'); // Will become 'u'

  // General diacritic removal for other accented characters
  normalized = normalized
    .normalize('NFD') // Decompose combined graphemes into base characters and diacritics
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks
    
  return normalized.toLowerCase(); // Convert to lowercase
};

export async function fetchWeather(location: string, selectedDate: Date): Promise<WeatherData> {
  if (!API_KEY_ENV_VAR) {
    const apiKeyError = "WeatherAPI.com API key is missing. Please set NEXT_PUBLIC_WEATHERAPI_COM_API_KEY.";
    console.error(apiKeyError);
    throw new Error(apiKeyError);
  }

  const originalLocation = location; // Keep original for logging/display if needed
  const normalizedQueryLocation = location.toLowerCase() === "auto:ip" ? "auto:ip" : normalizeLocationString(location);
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const apiUrl = `${WEATHERAPI_BASE_URL}/forecast.json?key=${API_KEY_ENV_VAR}&q=${encodeURIComponent(normalizedQueryLocation)}&dt=${formattedDate}&aqi=no&alerts=no`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMessage = data.error ? data.error.message : `API request failed with status ${response.status}: ${response.statusText}`;
      console.error(`Error fetching weather data from WeatherAPI.com for "${originalLocation}" (normalized query: "${normalizedQueryLocation}") on ${formattedDate}:`, errorMessage, `URL: ${apiUrl}`);
      throw new Error(errorMessage);
    }

    if (!data.forecast || !data.forecast.forecastday || data.forecast.forecastday.length === 0) {
      const noDataError = `No forecast data available for "${originalLocation}" (normalized query: "${normalizedQueryLocation}") on ${formattedDate}.`;
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
      const currentHourForToday = isActualToday ? getHours(new Date()) : -1; // Only filter if it's today
      let hoursAdded = 0;
      const maxHours = 24;
      const forecastStartHour = isActualToday ? currentHourForToday + 1 : 0;


      for (const hourData of forecastDay.hour) {
        const hourEpoch = hourData.time_epoch;
        const hourDate = new Date(hourEpoch * 1000);
        const hourOfDay = getHours(hourDate);

        if (format(hourDate, 'yyyy-MM-dd') === formattedDate) { // Ensure it's for the selected day
            if (isActualToday && hourOfDay < forecastStartHour) {
                continue; // Skip past hours for today
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
        if (hoursAdded >= maxHours) break; 
      }
      
      // If fewer than 24 hours were found for today (e.g. end of day)
      // and if we need to show a full 24 hour span, we'd need to fetch next day's forecast.
      // For now, this implementation provides up to 24 hours *within the selected day*.
    }
    
    weatherData.forecast = hourlyForecasts;

    return weatherData;

  } catch (error: any) {
    console.error(`Failed to fetch or parse weather data for "${originalLocation}" (normalized query: "${normalizedQueryLocation}") on ${formattedDate}:`, error.message, `URL Attempted: ${apiUrl}`);
    throw error; 
  }
}
