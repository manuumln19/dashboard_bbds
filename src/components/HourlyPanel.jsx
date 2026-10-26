import { Droplets } from "lucide-react";
import { LOCATION } from "../config";
import { hourLabel, isRainyHour, nextHours } from "../lib/weather";
import { WeatherGlyph } from "./WeatherGlyph";

const HOURS = 12;

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "—";
}

// Previsión real hora a hora (Open-Meteo). Sustituye al antiguo radar, que
// era un mapa ilustrativo sin datos.
export function HourlyPanel({ weather, now }) {
  const hours = nextHours(weather, now, HOURS);
  const rainy = hours.find(isRainyHour);
  const temperatures = hours.map((hour) => Number(hour.temperature)).filter(Number.isFinite);
  const low = Math.min(...temperatures);
  const high = Math.max(...temperatures);
  const span = Math.max(1, high - low);

  let summary = "Sin datos de las próximas horas";
  if (hours.length) {
    summary = rainy
      ? hours[0] === rainy
        ? "Lloviendo o a punto de llover"
        : `Lluvia probable hacia las ${hourLabel(rainy)}`
      : `Sin lluvia en las próximas ${hours.length} h`;
  }

  return (
    <aside className="card hourly" aria-labelledby="hourly-title">
      <header className="hourly-head">
        <p className="hourly-kicker">Próximas horas · Open-Meteo</p>
        <h2 id="hourly-title">{LOCATION.name}, hora a hora</h2>
      </header>

      <p className={`hourly-summary${rainy ? " is-rain" : ""}`}>
        <Droplets size={14} strokeWidth={1.9} aria-hidden="true" />
        {summary}
      </p>

      <ol className="hourly-list">
        {hours.map((hour) => {
          const chance = Number(hour.precipitationProbability) || 0;
          const temperature = Number(hour.temperature);
          return (
            <li key={hour.time} className={isRainyHour(hour) ? "is-rain" : ""}>
              <span className="hourly-time">{hourLabel(hour)}</span>
              <span className="hourly-glyph" aria-hidden="true">
                <WeatherGlyph code={hour.weatherCode} isDay={hour.isDay} size={17} strokeWidth={1.6} />
              </span>
              <span className="hourly-temp">
                <span className="hourly-track" aria-hidden="true">
                  <i
                    style={{
                      width: `${Number.isFinite(temperature) ? 12 + ((temperature - low) / span) * 88 : 0}%`,
                    }}
                  />
                </span>
                <strong>{round(temperature)}°</strong>
              </span>
              <span className="hourly-rain" aria-label={`Lluvia ${round(chance)}%`}>
                <span className="hourly-track" aria-hidden="true">
                  <i style={{ width: `${Math.max(2, Math.min(100, chance))}%` }} />
                </span>
                <small>{round(chance)}%</small>
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
