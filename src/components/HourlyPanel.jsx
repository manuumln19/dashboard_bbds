import { Droplets, Zap } from "lucide-react";
import { LOCATION } from "../config";
import { bandForPrice, classifyPriceBands } from "../lib/energy";
import { cheapPower } from "../lib/today";
import { hourLabel, isRainyHour, nextHours } from "../lib/weather";
import { WeatherGlyph } from "./WeatherGlyph";

const HOURS = 12;

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "—";
}

// Previsión real hora a hora (Open-Meteo). Sustituye al antiguo radar, que
// era un mapa ilustrativo sin datos.
// La banda de precio de la luz de cada hora ("YYYY-MM-DDTHH" local), para
// ponerla junto al tiempo: lo que cuesta poner la lavadora a esa hora.
function powerBands(electricity) {
  const map = {};
  const days = electricity && electricity.data && Array.isArray(electricity.data.days) ? electricity.data.days : [];
  days.forEach((day) => {
    const bands = classifyPriceBands(day);
    (day.hours || []).forEach((slot) => {
      map[String(slot.start).slice(0, 13)] = bandForPrice(slot.price, bands);
    });
  });
  return map;
}

export function HourlyPanel({ weather, now, electricity }) {
  const power = powerBands(electricity);
  const cheap = cheapPower(electricity, now);
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
        <p className="hourly-kicker">Próximas horas</p>
        <h2 id="hourly-title">{LOCATION.name}, hora a hora</h2>
      </header>

      <p className={`hourly-summary${rainy ? " is-rain" : ""}`}>
        <Droplets size={14} strokeWidth={1.9} aria-hidden="true" />
        {summary}
      </p>
      {cheap ? (
        <p className="hourly-summary is-power">
          <Zap size={14} strokeWidth={1.9} aria-hidden="true" />
          {cheap.label}
        </p>
      ) : null}

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
              {power[String(hour.time).slice(0, 13)] ? (
                <span className={`hourly-power energy-band energy-band--${power[String(hour.time).slice(0, 13)].id}`}>
                  {power[String(hour.time).slice(0, 13)].short}
                </span>
              ) : (
                <span className="hourly-power" />
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
