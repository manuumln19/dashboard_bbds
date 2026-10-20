import { weatherIconName } from "../lib/weather";

const CLOUD =
  "M14.5 34h20.7a7 7 0 0 0 .3-14 10.2 10.2 0 0 0-18.4 2.5A5.8 5.8 0 0 0 14.5 34Z";

const GLYPHS = {
  sun: (
    <>
      <circle cx="24" cy="24" r="8" />
      <path d="M24 7v5M24 36v5M7 24h5M36 24h5M12 12l3.5 3.5M32.5 32.5 36 36M12 36l3.5-3.5M32.5 15.5 36 12" />
    </>
  ),
  moon: <path d="M35.7 30.9A14.3 14.3 0 0 1 17.1 12.3a14.5 14.5 0 1 0 18.6 18.6Z" />,
  "cloud-sun": (
    <>
      <circle cx="18" cy="17" r="7.4" />
      <path d="M18 3.5v4M18 26.5v4M4.5 17h4M27.5 17h4M8.4 7.4l2.8 2.8M24.8 23.8l2.8 2.8M8.4 26.6l2.8-2.8M24.8 10.2l2.8-2.8" />
      <path d="M19.5 34h16.4a6.3 6.3 0 0 0 .2-12.6 9.2 9.2 0 0 0-16.6 2.2A5.2 5.2 0 0 0 19.5 34Z" />
    </>
  ),
  "cloud-moon": (
    <>
      <path d="M31.6 20.2a9.3 9.3 0 0 1-12.1-12 9.4 9.4 0 1 0 12.1 12Z" />
      <path d="M17.5 35h17.7a6.5 6.5 0 0 0 .3-13 9.5 9.5 0 0 0-17.1 2.3A5.4 5.4 0 0 0 17.5 35Z" />
    </>
  ),
  cloud: <path d={CLOUD} />,
  fog: (
    <>
      <path d={CLOUD} />
      <path d="M10 39h28M14 44h22M18 49h14" />
    </>
  ),
  drizzle: (
    <>
      <path d="M14.5 29h20.7a7 7 0 0 0 .3-14 10.2 10.2 0 0 0-18.4 2.5A5.8 5.8 0 0 0 14.5 29Z" />
      <path d="m19 35-1.5 4M27 35l-1.5 4M35 35l-1.5 4" />
    </>
  ),
  rain: (
    <>
      <path d="M14.5 28h20.7a7 7 0 0 0 .3-14 10.2 10.2 0 0 0-18.4 2.5A5.8 5.8 0 0 0 14.5 28Z" />
      <path d="m17 34-2 5M25 34l-2 5M33 34l-2 5" />
    </>
  ),
  snow: (
    <>
      <path d="M14.5 28h20.7a7 7 0 0 0 .3-14 10.2 10.2 0 0 0-18.4 2.5A5.8 5.8 0 0 0 14.5 28Z" />
      <path d="M16 36v5M13.8 37.3l4.4 2.4M18.2 37.3l-4.4 2.4M32 36v5M29.8 37.3l4.4 2.4M34.2 37.3l-4.4 2.4" />
    </>
  ),
  storm: (
    <>
      <path d="M14.5 27h20.7a7 7 0 0 0 .3-14 10.2 10.2 0 0 0-18.4 2.5A5.8 5.8 0 0 0 14.5 27Z" />
      <path d="m25 30-4 8h7l-3 6M17 34l-1.5 4M35 34l-1.5 4" />
    </>
  ),
};

export function WeatherGlyph({
  code,
  isDay = true,
  size = 48,
  strokeWidth = 1.55,
  className = "",
}) {
  const name = weatherIconName(code, isDay);
  return (
    <svg
      className={`weather-glyph ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPHS[name] || GLYPHS.cloud}
    </svg>
  );
}
