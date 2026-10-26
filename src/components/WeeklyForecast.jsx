import { capitalize, isSameDay, parseAllDay } from "../lib/date";
import { weatherLabel } from "../lib/weather";
import { WeatherGlyph } from "./WeatherGlyph";
import { dateFormat } from "../lib/intl";

const WEEKDAY = dateFormat({ weekday: "short" });
const DAY = dateFormat({ day: "numeric" });
const MONTH = dateFormat({ month: "short" });

function dayName(date) {
  return capitalize(WEEKDAY.format(date).replace(".", ""));
}

function monthName(date) {
  return MONTH.format(date).replace(".", "");
}

function Drop() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 1.4C4.6 3.4 3.1 5.1 3.1 7a2.9 2.9 0 0 0 5.8 0C8.9 5.1 7.4 3.4 6 1.4Z" />
    </svg>
  );
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
  const firstDay = validDays.length ? parseAllDay(validDays[0].date) : null;
  const lastDay = validDays.length
    ? parseAllDay(validDays[validDays.length - 1].date)
    : null;

  return (
    <article className="forecast" aria-labelledby="forecast-title">
      <header className="forecast-head">
        <h2 id="forecast-title">Previsión</h2>
        <p>
          Siete días ·{" "}
          {firstDay && lastDay
            ? `${firstDay.getDate()}—${lastDay.getDate()} ${monthName(lastDay)}`
            : "—"}
          <br />
          Temperatura °C · escala {Math.round(coldest)}—{Math.round(warmest)}
        </p>
      </header>

      {validDays.length ? (
        <div className="forecast-rows">
          {validDays.map((day) => {
            const date = parseAllDay(day.date);
            const today = isSameDay(date, now);
            const min = Number(day.min);
            const max = Number(day.max);
            const left = ((min - coldest) / span) * 100;
            const width = Math.max(5, ((max - min) / span) * 100);
            return (
              <article
                className={`forecast-row${today ? " is-today" : ""}`}
                key={day.date}
                title={weatherLabel(day.weatherCode)}
              >
                <div className="row-day">
                  <strong>{today ? "Hoy" : dayName(date)}</strong>
                  <span>
                    {DAY.format(date)} {monthName(date)}
                  </span>
                </div>
                <WeatherGlyph
                  code={day.weatherCode}
                  isDay
                  size={28}
                  strokeWidth={1.4}
                  className="row-icon"
                />
                <span className="row-condition">
                  {weatherLabel(day.weatherCode)}
                </span>
                <span className="row-max">{Math.round(max)}°</span>
                <div className="row-range" aria-hidden="true">
                  <span style={{ left: `${left}%`, width: `${width}%` }} />
                </div>
                <span className="row-min">{Math.round(min)}°</span>
                <span className="row-rain">
                  <Drop />
                  {Math.round(day.precipitationProbability || 0)}%
                </span>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="forecast-empty">
          <strong>Sin previsión todavía</strong>
          <span>Se actualizará cuando llegue el tiempo.</span>
        </div>
      )}

      {wettest ? (
        <footer className="forecast-foot">
          <span>Lluvia más probable</span>
          <span>
            {Number(wettest.precipitationProbability || 0) > 20
              ? `${dayName(parseAllDay(wettest.date))} · `
              : "Semana tranquila"}
            <strong>
              {Number(wettest.precipitationProbability || 0) > 20
                ? `${Math.round(wettest.precipitationProbability)}%`
                : ""}
            </strong>
          </span>
        </footer>
      ) : null}
    </article>
  );
}
