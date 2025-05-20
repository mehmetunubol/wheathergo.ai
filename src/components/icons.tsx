import type { LucideProps } from 'lucide-react';
import { Sun, Cloud, CloudRain, CloudSnow, CloudSun, CloudFog, Zap, Wind, ThermometerSnowflake, ThermometerSun } from 'lucide-react';

interface WeatherIconMap {
  [key: string]: React.FC<LucideProps>;
}

export const WeatherIcons: WeatherIconMap = {
  "01d": Sun, // clear sky day
  "01n": Sun, // clear sky night (using Sun for simplicity, could use Moon)
  "02d": CloudSun, // few clouds day
  "02n": CloudSun, // few clouds night
  "03d": Cloud, // scattered clouds
  "03n": Cloud, // scattered clouds
  "04d": Cloud, // broken clouds
  "04n": Cloud, // broken clouds
  "09d": CloudRain, // shower rain
  "09n": CloudRain, // shower rain
  "10d": CloudRain, // rain day
  "10n": CloudRain, // rain night
  "11d": Zap, // thunderstorm
  "11n": Zap, // thunderstorm
  "13d": CloudSnow, // snow
  "13n": CloudSnow, // snow
  "50d": CloudFog, // mist
  "50n": CloudFog, // mist
  Sunny: Sun,
  Cloudy: Cloud,
  Rainy: CloudRain,
  Snowy: CloudSnow,
  Default: Cloud,
};

export const getWeatherIcon = (conditionCode: string, fallback: string = "Default"): React.FC<LucideProps> => {
  return WeatherIcons[conditionCode] || WeatherIcons[fallback] || Cloud;
};
