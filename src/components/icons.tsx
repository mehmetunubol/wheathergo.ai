
import type { LucideProps } from 'lucide-react';
import { Sun, Cloud, CloudRain, CloudSnow, CloudSun, CloudFog, Zap, Wind, Moon, Snowflake, CloudLightning, Cloudy, Haze, Umbrella, CloudDrizzle, CloudMoon } from 'lucide-react';

interface WeatherIconMap {
  [key: string]: React.FC<LucideProps>;
}

// Combined map for WeatherAPI.com (numeric codes as strings)
// Day/Night specific icons are handled in getWeatherIcon logic
export const WeatherIcons: WeatherIconMap = {
  // WeatherAPI.com Condition Codes (numeric, converted to string keys)
  "1000": Sun, // Sunny / Clear (Day default)
  "1000_night": Moon, // Clear (Night)
  "1003": CloudSun, // Partly cloudy (Day default)
  "1003_night": CloudMoon, // Partly cloudy (Night)
  "1006": Cloud, // Cloudy
  "1009": Cloudy, // Overcast
  "1030": CloudFog, // Mist
  "1063": CloudDrizzle, // Patchy rain possible
  "1066": CloudSnow, // Patchy snow possible
  "1069": CloudDrizzle, // Patchy sleet possible
  "1072": CloudDrizzle, // Patchy freezing drizzle possible
  "1087": CloudLightning, // Thundery outbreaks possible
  "1114": CloudSnow, // Blowing snow
  "1117": Snowflake, // Blizzard
  "1135": CloudFog, // Fog
  "1147": CloudFog, // Freezing fog
  "1150": CloudDrizzle, // Patchy light drizzle
  "1153": CloudDrizzle, // Light drizzle
  "1168": CloudDrizzle, // Freezing drizzle
  "1171": CloudRain, // Heavy freezing drizzle
  "1180": CloudDrizzle, // Patchy light rain
  "1183": CloudRain, // Light rain
  "1186": CloudRain, // Moderate rain at times
  "1189": CloudRain, // Moderate rain
  "1192": CloudRain, // Heavy rain at times
  "1195": CloudRain, // Heavy rain
  "1198": CloudRain, // Light freezing rain
  "1201": CloudRain, // Moderate or heavy freezing rain
  "1204": CloudDrizzle, // Light sleet
  "1207": CloudRain, // Moderate or heavy sleet
  "1210": CloudSnow, // Patchy light snow
  "1213": CloudSnow, // Light snow
  "1216": CloudSnow, // Patchy moderate snow
  "1219": CloudSnow, // Moderate snow
  "1222": CloudSnow, // Patchy heavy snow
  "1225": Snowflake, // Heavy snow
  "1237": Snowflake, // Ice pellets
  "1240": CloudRain, // Light rain shower
  "1243": CloudRain, // Moderate or heavy rain shower
  "1246": CloudRain, // Torrential rain shower
  "1249": CloudDrizzle, // Light sleet showers
  "1252": CloudRain, // Moderate or heavy sleet showers
  "1255": CloudSnow, // Light snow showers
  "1258": CloudSnow, // Moderate or heavy snow showers
  "1261": Snowflake, // Light showers of ice pellets
  "1264": Snowflake, // Moderate or heavy showers of ice pellets
  "1273": CloudLightning, // Patchy light rain with thunder
  "1276": CloudLightning, // Moderate or heavy rain with thunder
  "1279": CloudLightning, // Patchy light snow with thunder
  "1282": CloudLightning, // Moderate or heavy snow with thunder
  
  // Fallback generic text conditions
  "Sunny": Sun,
  "Clear_night": Moon,
  "Clear": Sun, 
  "Partly cloudy_night": CloudMoon,
  "Partly cloudy": CloudSun,
  "Cloudy": Cloud,
  "Overcast": Cloudy,
  "Mist": CloudFog,
  "Fog": CloudFog,
  "Haze": Haze,
  "Rain": CloudRain,
  "Drizzle": CloudDrizzle,
  "Snow": Snowflake,
  "Thunderstorm": CloudLightning,
  "Sleet": CloudDrizzle,
  "Default": Cloud,
};

export const getWeatherIcon = (
  conditionCode: string | undefined,
  fallbackConditionText: string = "Default",
  isDay?: boolean // Optional: true for day, false for night
): React.FC<LucideProps> => {
  
  // Handle specific day/night variations based on code and isDay
  if (conditionCode === "1000") {
    return isDay === false ? WeatherIcons["1000_night"] : WeatherIcons["1000"];
  }
  if (conditionCode === "1003") {
    return isDay === false ? WeatherIcons["1003_night"] : WeatherIcons["1003"];
  }

  // Standard code mapping
  if (conditionCode && WeatherIcons[conditionCode]) {
    return WeatherIcons[conditionCode];
  }

  // Text-based fallback with isDay consideration
  const normalizedFallback = fallbackConditionText.toLowerCase();
  if (normalizedFallback.includes("clear")) {
    return isDay === false ? WeatherIcons["Clear_night"] : WeatherIcons["Clear"];
  }
  if (normalizedFallback.includes("partly cloudy")) {
    return isDay === false ? WeatherIcons["Partly cloudy_night"] : WeatherIcons["Partly cloudy"];
  }
  if (normalizedFallback.includes("sun") && isDay !== false) return Sun; // Ensure it's not night for "sunny"
  
  // General text fallbacks (less specific to day/night unless handled above)
  if (normalizedFallback.includes("overcast") || normalizedFallback.includes("cloud")) return Cloud;
  if (normalizedFallback.includes("mist") || normalizedFallback.includes("fog")) return CloudFog;
  if (normalizedFallback.includes("haze")) return Haze;
  if (normalizedFallback.includes("drizzle")) return CloudDrizzle;
  if (normalizedFallback.includes("rain") || normalizedFallback.includes("shower")) return CloudRain;
  if (normalizedFallback.includes("thunder")) return CloudLightning;
  if (normalizedFallback.includes("snow") || normalizedFallback.includes("blizzard")) return Snowflake;
  if (normalizedFallback.includes("sleet")) return CloudDrizzle;

  return WeatherIcons[fallbackConditionText] || WeatherIcons["Default"] || Cloud;
};
