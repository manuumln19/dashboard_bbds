import {
  CalendarDays,
  Droplets,
  Sparkles,
  Sun,
  Thermometer,
  Umbrella,
  Wind,
} from "lucide-react";
import { LOCATION } from "../config";
import {
  capitalize,
  formatClock,
  formatLongDate,
  getGreeting,
} from "../lib/date";
import {
  getWeatherAdvice,
  nextHours,
  weatherLabel,
} from "../lib/weather";
import { WeatherGlyph } from "./WeatherGlyph";
import { dateFormat } from "../lib/intl";

const ADVICE_ICONS = {
  umbrella: Umbrella,
  jacket: Thermometer,
  sun: Sun,
  mild: Sparkles,
};

function hourLabel(value) {
  try {
    return dateFormat({
      hour: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function HeroCard({ now, weather }) {
  const current = weather && weather.current ? weather.current : null;
  const today = weather && weather.today ? weather.today : null;
  const advice = getWeatherAdvice(weather, now);
  const AdviceIcon = ADVICE_ICONS[advice.icon] || Sparkles;
  const hours = nextHours(weather, now, 4);
  const greeting = getGreeting(now);

  return (
    <article className="card home-hero" aria-label="Hora, fecha y tiempo">
      <header className="home-hero__head">
        <span className="eyebrow">
          {greeting} · {capitalize(LOCATION.name)}
        </span>
        <span className="home-hero__place">
          <CalendarDays size={14} strokeWidth={1.9} aria-hidden="true" />
          {formatLongDate(now)}
        </span>
      </header>

      <div className="home-hero__body">
        <div className="home-hero__clockblock">
          <time className="home-hero__clock" dateTime={now.toISOString()}>
            {formatClock(now)}
          </time>
          <p className="home-hero__caption">
            {current ? weatherLabel(current.weatherCode) : "Mirando al cielo…"}
          </p>
        </div>

        <div className="home-hero__weather">
          <WeatherGlyph
            code={current ? current.weatherCode : 0}
            isDay={current ? current.isDay : true}
            size={56}
            strokeWidth={1.15}
            className="home-hero__glyph"
          />
          <div className="home-hero__temperature">
            {current ? Math.round(current.temperature) : "—"}
            <span>°</span>
          </div>
          <div className="home-hero__weather-meta">
            <strong>
              {current
                ? `Sensación de ${Math.round(current.apparentTemperature)}°`
                : "Cargando el tiempo"}
            </strong>
            <span>
              {today
                ? `${Math.round(today.max)}° / ${Math.round(today.min)}° · ${
                    today.precipitationProbability ?? 0
                  }% lluvia`
                : "Un momento…"}
            </span>
            {current ? (
              <span className="home-hero__wind">
                <Wind size={12} strokeWidth={1.9} aria-hidden="true" />
                {Math.round(current.windSpeed)} km/h
                <Droplets size={12} strokeWidth={1.9} aria-hidden="true" />
                {Math.round(current.humidity)}%
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <footer className="home-hero__foot">
        <div className={`weather-advice weather-advice--${advice.tone}`}>
          <span className="weather-advice__icon" aria-hidden="true">
            <AdviceIcon size={17} strokeWidth={1.9} />
          </span>
          <div>
            <strong>{advice.title}</strong>
            <span>{advice.detail}</span>
          </div>
        </div>

        {hours.length ? (
          <div className="hour-strip" aria-label="Próximas horas">
            {hours.map((hour) => (
              <div className="hour-strip__item" key={hour.time}>
                <span>{hourLabel(hour.time)}</span>
                <WeatherGlyph
                  code={hour.weatherCode}
                  isDay={hour.isDay}
                  size={17}
                  strokeWidth={1.5}
                />
                <strong>{Math.round(hour.temperature)}°</strong>
              </div>
            ))}
          </div>
        ) : null}
      </footer>
    </article>
  );
}
