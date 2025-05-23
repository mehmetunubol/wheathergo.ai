
import type { WeatherData, HourlyForecastData } from '@/types';
import { format, parseISO, startOfDay, isValid, isToday as fnsIsToday, addHours, getHours, differenceInCalendarDays, addDays } from 'date-fns';
import { guessWeather, type GuessedWeatherOutput } from '@/ai/flows/guess-weather-flow'; // Import the new AI flow

const WEATHERAPI_BASE_URL = 'https://api.weatherapi.com/v1';
const API_KEY_ENV_VAR = process.env.NEXT_PUBLIC_WEATHERAPI_COM_API_KEY;
const MAX_API_FORECAST_DAYS = 2; // API typically gives today + 2 future days (total 3, index 0,1,2)

// Helper function to safely parse numbers from API, defaulting to 0 if invalid
const safeParseFloat = (value: any, defaultValue = 0): number => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

// Helper function to normalize location strings
const normalizeLocationString = (location: string): string => {
  let normalized = location;
  normalized = normalized.replace(/ı/g, 'i');
  normalized = normalized.replace(/İ/g, 'I');
  normalized = normalized.replace(/ş/g, 's');
  normalized = normalized.replace(/Ş/g, 'S');
  normalized = normalized.replace(/ğ/g, 'g');
  normalized = normalized.replace(/Ğ/g, 'G');
  normalized = normalized.replace(/ç/g, 'c');
  normalized = normalized.replace(/Ç/g, 'C');
  normalized = normalized.replace(/ö/g, 'o');
  normalized = normalized.replace(/Ö/g, 'O');
  normalized = normalized.replace(/ü/g, 'u');
  normalized = normalized.replace(/Ü/g, 'U');
  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalized.toLowerCase();
};

export async function fetchWeather(locationInput: string, selectedDate: Date): Promise<WeatherData> {
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

  if (daysFromToday < 0) { // Date is in the past
    // For past dates, WeatherAPI's history.json endpoint is needed, which is often a premium feature.
    // For simplicity, we'll treat past dates like > MAX_API_FORECAST_DAYS and use AI guess or a message.
    // Or, you could throw an error: throw new Error("Historical weather data is not supported in this version.");
    console.warn(`Selected date ${formattedDateForAPI} is in the past. AI guess will be used.`);
  }
  
  if (daysFromToday > MAX_API_FORECAST_DAYS || daysFromToday < 0) {
    console.log(`Date ${formattedDateForAPI} is outside WeatherAPI.com's direct forecast range. Using AI guess.`);
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
        isDay: true, // AI provides a daily summary, assume daytime for general icon
        forecast: [], // AI guess does not provide hourly forecast
        isGuessed: true,
      };
    } catch (aiError: any) {
      console.error(`AI weather guess failed for "${originalLocation}" on ${formattedDateForAPI}:`, aiError.message);
      throw new Error(`Failed to generate AI weather estimate: ${aiError.message}`);
    }
  }

  // Proceed with WeatherAPI.com call for dates within range
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
      const maxHoursToFetch = 24; // We want up to 24 hours of forecast
      let hoursAdded = 0;
      
      // For "today", start from the next full hour based on *user's selected time on the homepage*
      // For future dates, start from midnight of that day.
      const forecastStartHour = isActualToday ? getHours(selectedDate) : 0;

      for (const hourData of forecastDay.hour) {
        const hourEpoch = hourData.time_epoch;
        const hourDate = new Date(hourEpoch * 1000); // API time_epoch is in seconds
        const hourOfDay = getHours(hourDate);

        // Ensure we are on the correct selected date and past the desired start hour for "today"
        if (format(hourDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) {
          if (isActualToday && hourOfDay < forecastStartHour) {
            continue; // Skip past hours for today based on user's time selection
          }

          hourlyForecasts.push({
            time: format(hourDate, 'h a'), // e.g., "3 PM"
            temperature: Math.round(safeParseFloat(hourData.temp_c)),
            condition: hourData.condition.text,
            conditionCode: String(hourData.condition.code),
            isDay: hourData.is_day === 1,
          });
          hoursAdded++;
        }
        if (hoursAdded >= maxHoursToFetch) break;
      }
      
      // If we need more hours (e.g., for a 24-hour span crossing midnight)
      // WeatherAPI's forecast.json for a specific `dt` usually only gives hours for *that* day.
      // A more complex implementation might fetch the next day if needed.
      // For now, we limit to hours available within the selected day's forecast.
    }
    weatherData.forecast = hourlyForecasts;

    return weatherData;

  } catch (error: any) {
    console.error(`Failed to fetch or parse weather data for "${originalLocation}" (normalized: "${normalizedQueryLocation}") on ${formattedDateForAPI}:`, error.message, `URL Attempted: ${apiUrl}`);
    throw error;
  }
}
