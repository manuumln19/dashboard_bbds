import {
  Clock3,
  CloudSun,
  Droplets,
  FlaskConical,
  MapPin,
  Sun,
  Sunrise,
  Sunset,
  Umbrella,
  Wind,
} from "lucide-react";
import { DEMO_MODE, LOCATION } from "../config";
import { formatAge, formatEventTime, formatLongDate } from "../lib/date";
import { weatherLabel } from "../lib/weather";
import { RadarPanel } from "./RadarPanel";
import { WeatherGlyph } from "./WeatherGlyph";
import { WeeklyForecast } from "./WeeklyForecast";

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "—";
}

function sunTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return formatEventTime(date);
}

export function WeatherView({ now, weather, error, loading }) {
  const current = weather && weather.current ? weather.current : null;
  const today = weather && weather.today ? weather.today : null;
  const days = weather && Array.isArray(weather.days) ? weather.days : [];
  const isDemo = DEMO_MODE || Boolean(weather && weather.demo);

  return (
    <section className="view weather-view" aria-labelledby="weather-title">
      <header className="weather-head">
        <div>
          <span className="eyebrow">Fuera de casa</span>
          <h1 id="weather-title">El tiempo</h1>
          <p>
            <MapPin size={14} strokeWidth={1.9} aria-hidden="true" />
            {LOCATION.name} · {formatLongDate(now)}
          </p>
        </div>

        <div className="weather-head__aside">
          <span className="weather-updated">
            <Clock3 size={14} strokeWidth={1.8} aria-hidden="true" />
            {weather
              ? `Actualizado ${formatAge(weather.updatedAt, now).toLowerCase()}`
              : loading
                ? "Consultando el cielo…"
                : "Sin datos"}
          </span>
          {isDemo ? (
            <span className="weather-demo">
              <FlaskConical size={13} strokeWidth={1.9} aria-hidden="true" />
              Datos demo
            </span>
          ) : null}
        </div>
      </header>

      {error && !DEMO_MODE ? (
        <div className="inline-alert" role="status">
          No se pudo actualizar el tiempo: {error}. Se reintentará solo.
        </div>
      ) : null}

      <div className="weather-layout">
        <article className="card weather-now" aria-label="Tiempo actual">
          <div className="weather-now__main">
            <div className="weather-now__glyph" aria-hidden="true">
              <WeatherGlyph
                code={current ? current.weatherCode : 1}
                isDay={current ? current.isDay : true}
                size={72}
                strokeWidth={1.15}
              />
            </div>

            <div className="weather-now__temperature">
              {current ? round(current.temperature) : "—"}
              <span>°</span>
            </div>

            <div className="weather-now__copy">
              <span className="eyebrow">Ahora mismo</span>
              <h2>
                {current ? weatherLabel(current.weatherCode) : "Mirando al cielo"}
              </h2>
              <p>
                {current
                  ? `Sensación de ${round(current.apparentTemperature)}°`
                  : "Esperando datos"}
                {today
                  ? ` · Máx ${round(today.max)}° / Mín ${round(today.min)}°`
                  : ""}
              </p>
            </div>
          </div>

          <div className="weather-now__metrics">
            <div>
              <span className="weather-metric__icon weather-metric__icon--blue">
                <Droplets size={16} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span>Humedad</span>
              <strong>{current ? `${round(current.humidity)}%` : "—"}</strong>
            </div>
            <div>
              <span className="weather-metric__icon weather-metric__icon--mint">
                <Wind size={16} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span>Viento</span>
              <strong>{current ? `${round(current.windSpeed)} km/h` : "—"}</strong>
            </div>
            <div>
              <span className="weather-metric__icon weather-metric__icon--lilac">
                <Umbrella size={16} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span>Lluvia</span>
              <strong>
                {today
                  ? `${round(today.precipitationProbability)}%`
                  : current
                    ? `${round(current.precipitation)} mm`
                    : "—"}
              </strong>
            </div>
            <div>
              <span className="weather-metric__icon weather-metric__icon--amber">
                <Sun size={16} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span>UV</span>
              <strong>{today ? round(today.uvIndex) : "—"}</strong>
            </div>
          </div>

          <footer className="weather-now__foot">
            <span>
              <Sunrise size={15} strokeWidth={1.9} aria-hidden="true" />
              <small>Amanece</small>
              <strong>{sunTime(today && today.sunrise)}</strong>
            </span>
            <span>
              <Sunset size={15} strokeWidth={1.9} aria-hidden="true" />
              <small>Anochece</small>
              <strong>{sunTime(today && today.sunset)}</strong>
            </span>
            <span className="weather-now__source">
              <CloudSun size={15} strokeWidth={1.8} aria-hidden="true" />
              {isDemo ? "Open-Meteo · demo local" : "Open-Meteo"}
            </span>
          </footer>
        </article>

        <WeeklyForecast days={days} now={now} />

        <RadarPanel now={now} today={today} />
      </div>
    </section>
  );
}
