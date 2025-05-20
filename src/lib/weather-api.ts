import type { WeatherData, HourlyForecastData } from '@/types';
import { format, setHours, getHours as getDateFnsHours, startOfHour } from 'date-fns';

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
  
  let forecastStartHour = 8; // Default start hour for future dates (8 AM)
  const forecastEndHour = 22; // Forecast up to 10 PM
  const forecastInterval = 2; // Show forecast every 2 hours

  if (isSelectedDateToday) {
    // For today, start from the next hour, or 8 AM if it's earlier than that.
    // Ensure we round up to the next even hour for 2-hour intervals if needed, or just start from next hour.
    const currentHour = getDateFnsHours(now);
    forecastStartHour = Math.max(8, currentHour + 1);
    // If currentHour is 7, next hour is 8. If currentHour is 8, next hour is 9.
    // To align with 2-hour intervals starting from an even hour like 8:
    if (forecastStartHour % forecastInterval !== 0 && forecastStartHour > 8) {
        // If next hour is 9, and interval is 2, start from 10.
        // If next hour is 13, start from 14.
        forecastStartHour = Math.ceil(forecastStartHour / forecastInterval) * forecastInterval;
    } else if (forecastStartHour % forecastInterval !== 0 && forecastStartHour <= 8) {
        // If it's early (e.g. current 6AM, forecastStartHour becomes 7AM), make it 8AM to align.
        forecastStartHour = 8;
    }
     // if currentHour +1 is already an even hour, it's fine. e.g. current is 7, start at 8. current is 9, start at 10.
  }


  for (let hour = forecastStartHour; hour <= forecastEndHour; hour += forecastInterval) {
    const forecastTime = setHours(selectedDateObj, hour);
    // Double check for today: if the generated forecastTime is somehow in the past (e.g. due to interval logic), skip
    if (isSelectedDateToday && forecastTime < startOfHour(now)) {
        continue;
    }

    const hourlyCondition = getRandomCondition();
    forecastPoints.push({
      time: format(forecastTime, "h a"), // e.g., "8 AM", "10 AM"
      temperature: varyTemperature(baseTemperature),
      condition: hourlyCondition.generic,
      conditionCode: hourlyCondition.icon,
    });
  }
  
  mainWeatherData.forecast = forecastPoints.length > 0 ? forecastPoints : undefined;

  return mainWeatherData;
}
