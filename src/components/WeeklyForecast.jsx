import { Droplets } from "lucide-react";
import {
  capitalize,
  isSameDay,
  parseAllDay,
} from "../lib/date";
import { weatherLabel } from "../lib/weather";
import { WeatherGlyph } from "./WeatherGlyph";

function dayName(date) {
  return capitalize(
    new Intl.DateTimeFormat("es-ES", { weekday: "short" })
      .format(date)
      .replace(".", "")
  );
}

function dayNumber(date) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric" }).format(date);
}

function monthName(date) {
  return new Intl.DateTimeFormat("es-ES", { month: "short" })
    .format(date)
    .replace(".", "");
}

function isRainy(code) {
  return Number(code) >= 51;
}

export function WeeklyForecast({ days = [], now }) {
  const validDays = days.filter((day) => day && day.date).slice(0, 7);
  const temperatures = validDays
    .flatMap((day) => [Number(day.min), Number(day.max)])
    .filter(Number.isFinite);
  const coldest = temperatures.length ? Math.min(...temperatures) : 0;
  const warmest = temperatures.length ? Math.max(...temperatures) : 1;
  const span = Math.max(1, warmest - coldest);
  const wettest = [...validDays].sort(
    (a, b) =>
      Number(b.precipitationProbability || 0) -
      Number(a.precipitationProbability || 0)
  )[0];

  return (
    <article className="card weekly-card" aria-labelledby="weekly-title">
      <header className="weekly-card__head">
        <div>
          <span className="eyebrow">Previsión</span>
          <h2 id="weekly-title">Siete días</h2>
        </div>
        <span className="weekly-card__legend">Máx / mín</span>
      </header>

      {validDays.length ? (
        <div className="week-grid">
          {validDays.map((day) => {
            const date = parseAllDay(day.date);
            const today = isSameDay(date, now);
            const min = Number(day.min);
            const max = Number(day.max);
            const left = ((min - coldest) / span) * 100;
            const width = Math.max(9, ((max - min) / span) * 100);
            const rainy = isRainy(day.weatherCode);
            return (
              <div
                className={`week-day${today ? " is-today" : ""}${
                  rainy ? " is-rainy" : ""
                }`}
                key={day.date}
                title={weatherLabel(day.weatherCode)}
              >
                <div className="week-day__head">
                  <span>{today ? "Hoy" : dayName(date)}</span>
                  <small>
                    {dayNumber(date)} {monthName(date)}
                  </small>
                </div>
                <WeatherGlyph
                  code={day.weatherCode}
                  isDay
                  size={glyphSize(day.weatherCode)}
                  strokeWidth={1.25}
                  className="week-day__glyph"
                />
                <strong className="week-day__max">{Math.round(max)}°</strong>
                <span className="week-day__min">{Math.round(min)}°</span>
                <div className="week-day__range" aria-hidden="true">
                  <span style={{ left: `${left}%`, width: `${width}%` }} />
                </div>
                <span className="week-day__rain">
                  <Droplets size={11} strokeWidth={2} aria-hidden="true" />
                  {Math.round(day.precipitationProbability || 0)}%
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="weekly-card__empty">
          <strong>Sin previsión todavía</strong>
          <span>Se actualizará cuando llegue el tiempo.</span>
        </div>
      )}

      {wettest ? (
        <footer className="weekly-card__foot">
          <span className="weekly-card__foot-label">Lluvia más probable</span>
          <strong>
            {Number(wettest.precipitationProbability || 0) > 20
              ? `${dayName(parseAllDay(wettest.date))} · ${Math.round(
                  wettest.precipitationProbability
                )}%`
              : "Semana tranquila"}
          </strong>
        </footer>
      ) : null}
    </article>
  );
}

// Los días de lluvia se dibujan un poco más pequeños para dar aire a la
// columna sin cambiar la retícula.
function glyphSize(code) {
  return isRainy(code) ? 27 : 31;
}
