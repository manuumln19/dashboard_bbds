import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from "lucide-react";
import { weatherIconName } from "../lib/weather";

const ICONS = {
  sun: Sun,
  moon: Moon,
  "cloud-sun": CloudSun,
  "cloud-moon": CloudMoon,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

export function WeatherGlyph({
  code,
  isDay = true,
  size = 48,
  strokeWidth = 1.35,
  className = "",
}) {
  const name = weatherIconName(code, isDay);
  const Icon = ICONS[name] || Cloud;
  return (
    <Icon
      className={`weather-glyph ${className}`}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    />
  );
}
