import type { WeatherData, HourlyForecastData } from '@/types';
import { format, setHours, getHours as getDateFnsHours } from 'date-fns';

const weatherConditions = [
  { description: "clear sky", icon: "01d", generic: "Sunny" },
  { description: "few clouds", icon: "02d", generic: "Cloudy" },
  { description: "scattered clouds", icon: "03d", generic: "Cloudy" },
  { description: "broken clouds", icon: "04d", generic: "Cloudy" },
  { description: "shower rain", icon: "09d", generic: "Rainy" },
  { description: "rain", icon: "10d", generic: "Rainy" },
  { description: "thunderstorm", icon: "11d", generic: "Rainy" },
  { description: "snow", icon: "13d", generic: "Snowy" },
  { description: "mist", icon: "50d", generic: "Cloudy" },
];

const varyTemperature = (baseTemp: number) => baseTemp + Math.floor(Math.random() * 5) - 2;
const getRandomCondition = () => weatherConditions[Math.floor(Math.random() * weatherConditions.length)];

export async function fetchWeather(location: string, date: Date): Promise<WeatherData> {
  await new Promise(resolve => setTimeout(resolve, 700));

  const baseRandomConditionData = getRandomCondition();
  const pseudoHash = (location + date.toDateString()).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  let tempModifier = (pseudoHash % 10) - 5;

  let baseTemperature: number;
  switch (baseRandomConditionData.generic) {
    case "Sunny": baseTemperature = 25 + tempModifier; break;
    case "Cloudy": baseTemperature = 18 + tempModifier; break;
    case "Rainy": baseTemperature = 15 + tempModifier; break;
    case "Snowy": baseTemperature = -2 + tempModifier; break;
    default: baseTemperature = 20 + tempModifier;
  }
  
  const selectedDateObj = date;

  const mainWeatherData: WeatherData = {
    temperature: Math.round(baseTemperature),
    condition: baseRandomConditionData.generic,
    conditionCode: baseRandomConditionData.icon,
    description: baseRandomConditionData.description,
    humidity: Math.floor(Math.random() * 40) + 40,
    windSpeed: Math.floor(Math.random() * 15) + 5,
    location: location,
    date: selectedDateObj.toISOString(),
    forecast: []
  };

  const forecastPoints: HourlyForecastData[] = [];
  const forecastHours = [9, 12, 15, 18, 21]; // 9 AM, 12 PM, 3 PM, 6 PM, 9 PM

  const now = new Date();
  const isSelectedDateToday = format(selectedDateObj, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  const currentHourToday = getDateFnsHours(now);

  for (const hour of forecastHours) {
    if (isSelectedDateToday && hour < currentHourToday) {
      // If it's today and the forecast slot's starting hour is in the past, skip it.
      continue;
    }

    const forecastTime = setHours(selectedDateObj, hour);
    const hourlyCondition = getRandomCondition();
    forecastPoints.push({
      time: format(forecastTime, "h a"), // e.g., "9 AM"
      temperature: varyTemperature(baseTemperature),
      condition: hourlyCondition.generic,
      conditionCode: hourlyCondition.icon,
    });
  }
  
  mainWeatherData.forecast = forecastPoints.length > 0 ? forecastPoints : undefined;

  return mainWeatherData;
}
