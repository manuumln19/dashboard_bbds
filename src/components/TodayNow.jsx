import { memo } from "react";
import { LOCATION } from "../config";
import { capitalize, formatClock, formatLongDate } from "../lib/date";
import { greetingFor } from "../lib/greeting";
import { isFiesta, nextFestivity } from "../lib/season";
import { SeasonScene } from "./SeasonDecor";
import { hourLabel, nextHours, weatherLabel } from "../lib/weather";
import { WeatherGlyph } from "./WeatherGlyph";

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "—";
}

// Lo que se mira de pasada: hora, fecha y tiempo, con las próximas horas.
export const TodayNow = memo(function TodayNow({ now, weather, season, lists, cleaning, events, onOpenWeather }) {
  const current = weather && weather.current ? weather.current : null;
  const today = weather && weather.today ? weather.today : null;
  const hours = nextHours(weather, now, 6).slice(1);
  const greeting = greetingFor({ now, weather, season, lists, cleaning, events });
  // El día de la fiesta no se cuenta hacia la siguiente: hoy toca esta.
  const countdown = isFiesta(season) ? null : nextFestivity(now, cleaning ? cleaning.people : []);

  return (
    <article className="card today-now" aria-label="Hora y tiempo">
      {/* Fecha como antetítulo y, debajo, el saludo a todo el ancho: era la
          frase más personal de la pantalla y a media tarjeta se cortaba. */}
      <header className="today-now__head">
        <span className="today-now__date">
          <span>
            {season && season.note ? <em>{season.note} · </em> : null}
            {formatLongDate(now)} · {capitalize(LOCATION.name)}
          </span>
          {countdown ? <small className="today-now__countdown">{countdown.label}</small> : null}
        </span>
        <p className="today-now__greeting">
          <strong>{greeting.hello}.</strong>
          {greeting.line ? <span> {greeting.line}</span> : null}
        </p>
      </header>

      <div className="today-now__main">
        <time className="today-now__clock" dateTime={now.toISOString()}>
          {formatClock(now)}
        </time>

        <button type="button" className="today-now__weather" onClick={onOpenWeather}>
          <WeatherGlyph
            code={current ? current.weatherCode : 0}
            isDay={current ? current.isDay : true}
            size={44}
            strokeWidth={1.3}
          />
          <span className="today-now__temp">
            {current ? round(current.temperature) : "—"}°
          </span>
          <span className="today-now__sky">
            <strong>{current ? weatherLabel(current.weatherCode) : "Cargando el tiempo"}</strong>
            <span>
              {today
                ? `Máx ${round(today.max)}° · mín ${round(today.min)}° · lluvia ${round(today.precipitationProbability)}%`
                : "Un momento…"}
            </span>
          </span>
        </button>
        {season ? <SeasonScene seasonId={season.id} /> : null}
      </div>

      {hours.length ? (
        <ol className="today-now__hours" aria-label="Próximas horas">
          {hours.map((hour) => (
            <li key={hour.time}>
              <span>{hourLabel(hour).slice(0, 2)} h</span>
              <WeatherGlyph code={hour.weatherCode} isDay={hour.isDay} size={18} strokeWidth={1.5} />
              <strong>{round(hour.temperature)}°</strong>
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  );
});
