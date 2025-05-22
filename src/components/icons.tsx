
import type { LucideProps } from 'lucide-react';
import { Sun, Cloud, CloudRain, CloudSnow, CloudSun, CloudFog, Zap, Wind, Moon, Snowflake, CloudLightning, Cloudy, Haze, Umbrella, CloudDrizzle } from 'lucide-react';

interface WeatherIconMap {
  [key: string]: React.FC<LucideProps>;
}

// Combined map for OpenWeatherMap (alpha codes) and WeatherAPI.com (numeric codes as strings)
export const WeatherIcons: WeatherIconMap = {
  // OpenWeatherMap Codes (example)
  "01d": Sun, 
  "01n": Moon, 
  "02d": CloudSun,
  "02n": CloudSun, // Assuming CloudSun for few clouds at night too
  "03d": Cloud,
  "03n": Cloud,
  "04d": Cloudy, // Broken clouds - more distinct 'Cloudy' icon
  "04n": Cloudy,
  "09d": CloudDrizzle, // Shower rain - Drizzle icon
  "09n": CloudDrizzle,
  "10d": CloudRain,
  "10n": CloudRain,
  "11d": CloudLightning, // Thunderstorm - More specific icon
  "11n": CloudLightning,
  "13d": Snowflake, // Snow - More specific icon
  "13n": Snowflake,
  "50d": Haze, // Mist/Fog - Haze icon
  "50n": Haze,

  // WeatherAPI.com Condition Codes (numeric, converted to string keys)
  // Day icons primarily, night variations can be added if API provides distinct night codes
  // or if logic elsewhere determines day/night. For simplicity, using day-equivalent icons.
  "1000": Sun, // Sunny / Clear
  "1003": CloudSun, // Partly cloudy
  "1006": Cloud, // Cloudy
  "1009": Cloudy, // Overcast (using Cloudy as it's similar visual)
  "1030": CloudFog, // Mist
  "1063": CloudDrizzle, // Patchy rain possible
  "1066": CloudSnow, // Patchy snow possible
  "1069": CloudDrizzle, // Patchy sleet possible (using drizzle for sleet)
  "1072": CloudDrizzle, // Patchy freezing drizzle possible
  "1087": CloudLightning, // Thundery outbreaks possible
  "1114": CloudSnow, // Blowing snow
  "1117": Snowflake, // Blizzard (using Snowflake, could be Wind + Snowflake if combined)
  "1135": CloudFog, // Fog
  "1147": CloudFog, // Freezing fog
  "1150": CloudDrizzle, // Patchy light drizzle
  "1153": CloudDrizzle, // Light drizzle
  "1168": CloudDrizzle, // Freezing drizzle
  "1171": CloudRain, // Heavy freezing drizzle (using rain as primary visual)
  "1180": CloudDrizzle, // Patchy light rain
  "1183": CloudRain, // Light rain
  "1186": CloudRain, // Moderate rain at times
  "1189": CloudRain, // Moderate rain
  "1192": CloudRain, // Heavy rain at times
  "1195": CloudRain, // Heavy rain
  "1198": CloudRain, // Light freezing rain
  "1201": CloudRain, // Moderate or heavy freezing rain
  "1204": CloudDrizzle, // Light sleet (using drizzle)
  "1207": CloudRain, // Moderate or heavy sleet (using rain)
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
  "1249": CloudDrizzle, // Light sleet showers (using drizzle)
  "1252": CloudRain, // Moderate or heavy sleet showers (using rain)
  "1255": CloudSnow, // Light snow showers
  "1258": CloudSnow, // Moderate or heavy snow showers
  "1261": Snowflake, // Light showers of ice pellets
  "1264": Snowflake, // Moderate or heavy showers of ice pellets
  "1273": CloudLightning, // Patchy light rain with thunder
  "1276": CloudLightning, // Moderate or heavy rain with thunder
  "1279": CloudLightning, // Patchy light snow with thunder
  "1282": CloudLightning, // Moderate or heavy snow with thunder
  
  // Fallback generic text conditions (can be from either API if code mapping fails)
  "Sunny": Sun,
  "Clear": Sun, // WeatherAPI sometimes uses 'Clear' for night
  "Partly cloudy": CloudSun,
  "Cloudy": Cloud,
  "Overcast": Cloudy,
  "Mist": CloudFog,
  "Fog": CloudFog,
  "Rain": CloudRain,
  "Drizzle": CloudDrizzle,
  "Snow": Snowflake,
  "Thunderstorm": CloudLightning,
  "Sleet": CloudDrizzle, // Simplified
  "Default": Cloud, // Default fallback
};

export const getWeatherIcon = (conditionCode: string | undefined, fallbackConditionText: string = "Default"): React.FC<LucideProps> => {
  if (conditionCode && WeatherIcons[conditionCode]) {
    return WeatherIcons[conditionCode];
  }
  // Try mapping common text if code is not found or undefined
  const normalizedFallback = fallbackConditionText.toLowerCase();
  if (normalizedFallback.includes("sun") || normalizedFallback.includes("clear")) return Sun;
  if (normalizedFallback.includes("partly cloudy")) return CloudSun;
  if (normalizedFallback.includes("overcast") || normalizedFallback.includes("cloud")) return Cloud; // Prioritize Cloudy for Overcast
  if (normalizedFallback.includes("mist") || normalizedFallback.includes("fog") || normalizedFallback.includes("haze")) return CloudFog; // Haze for mist/fog
  if (normalizedFallback.includes("drizzle")) return CloudDrizzle;
  if (normalizedFallback.includes("rain") || normalizedFallback.includes("shower")) return CloudRain; // Umbrella for rain/shower
  if (normalizedFallback.includes("thunder")) return CloudLightning;
  if (normalizedFallback.includes("snow") || normalizedFallback.includes("blizzard")) return Snowflake;
  if (normalizedFallback.includes("sleet")) return CloudDrizzle;


  // Final fallback using the map with text keys or the ultimate 'Default'
  return WeatherIcons[fallbackConditionText] || WeatherIcons["Default"] || Cloud;
};

