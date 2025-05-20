import type { WeatherData, HourlyForecastData } from '@/types';
import { format, setHours, getHours as getDateFnsHours, startOfHour, addHours, startOfDay, isSameDay } from 'date-fns';

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
  const now = new Date();
  const isSelectedDateToday = format(selectedDateObj, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  
  let startTime: Date;
  if (isSelectedDateToday) {
    startTime = startOfHour(addHours(now, 1)); // Start from the next full hour for today
  } else {
    startTime = startOfDay(selectedDateObj); // Start from 00:00 of the selected future date
  }

  for (let i = 0; i < 24; i++) { // Generate 24 hourly forecasts
    const forecastTime = addHours(startTime, i);
    const hourlyCondition = getRandomCondition();
    
    forecastPoints.push({
      time: format(forecastTime, isSameDay(forecastTime, selectedDateObj) ? "h a" : "MMM d, h a"),
      temperature: varyTemperature(baseTemperature), // Vary based on the main day's temp for simplicity
      condition: hourlyCondition.generic,
      conditionCode: hourlyCondition.icon,
    });
  }
  
  mainWeatherData.forecast = forecastPoints.length > 0 ? forecastPoints : undefined;

  return mainWeatherData;
}
