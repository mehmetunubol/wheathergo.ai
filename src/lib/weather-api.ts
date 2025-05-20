import type { WeatherData } from '@/types';

// Basic mock, in a real app this would call a weather service
// Icon codes are inspired by OpenWeatherMap
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

export async function fetchWeather(location: string, date: Date): Promise<WeatherData> {
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API delay

  const randomConditionData = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
  const isFutureDate = new Date(date).setHours(0,0,0,0) > new Date().setHours(0,0,0,0);
  
  let tempModifier = 0;
  // Slightly adjust temperature based on a hash of location and date to make it pseudo-consistent
  const pseudoHash = (location + date.toDateString()).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  tempModifier = (pseudoHash % 10) - 5; // -5 to +4 C change

  let temperature: number;
  switch (randomConditionData.generic) {
    case "Sunny":
      temperature = 25 + tempModifier;
      break;
    case "Cloudy":
      temperature = 18 + tempModifier;
      break;
    case "Rainy":
      temperature = 15 + tempModifier;
      break;
    case "Snowy":
      temperature = -2 + tempModifier;
      break;
    default:
      temperature = 20 + tempModifier;
  }
  
  // If it's a future date, make it a bit more variable
  if (isFutureDate) {
    temperature += (Math.random() * 6) - 3; // +/- 3 degrees
  }


  return {
    temperature: Math.round(temperature),
    condition: randomConditionData.generic,
    conditionCode: randomConditionData.icon,
    description: randomConditionData.description,
    humidity: Math.floor(Math.random() * 40) + 40, // 40-79%
    windSpeed: Math.floor(Math.random() * 15) + 5, // 5-19 km/h
    location: location,
    date: date.toISOString(),
  };
}
