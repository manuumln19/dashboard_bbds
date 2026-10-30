import { memo } from "react";
import { CalendarDays, Moon, SprayCan } from "lucide-react";
import { capitalize, eventStartDate, eventTimeLabel, formatClock, formatLongDate, startOfDay, addDays } from "../lib/date";
import { cleaningDayIndex } from "../lib/today";
import { weatherLabel } from "../lib/weather";
import { WeatherGlyph } from "./WeatherGlyph";

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "—";
}

// Hoy de noche: la hora grande y lo de mañana a primera hora (tiempo,
// primeros eventos y la limpieza que toca), con Yoshi dormido. Menos luz y
// menos ruido que el panel de día; el botón de la luna de la barra lo cambia.
export const NightHome = memo(function NightHome({ now, weather, events, cleaning, mascot, onWake }) {
  const tomorrow = addDays(startOfDay(now), 1);
  const after = addDays(tomorrow, 1);
  const forecast = weather && Array.isArray(weather.days) ? weather.days[1] : null;
  const firstEvents = (Array.isArray(events) ? events : [])
    .filter((event) => {
      const at = eventStartDate(event);
      return at >= tomorrow && at < after;
    })
    .sort((a, b) => eventStartDate(a) - eventStartDate(b))
    .slice(0, 3);
  const tomorrowIndex = cleaningDayIndex(tomorrow);
  const chores = (cleaning.tasks || []).filter((task) => task.day === tomorrowIndex);
  const hour = now.getHours();
  const hello = hour >= 20 || hour < 6 ? "Buenas noches" : "Modo noche";

  return (
    // Sin barra ni botones: un toque en cualquier sitio la despierta.
    <div className="night-home" onClick={onWake}>
      <span className="night-home__wake">Toca para despertar</span>
      <div className="night-home__time">
        <span className="night-home__hello">
          <Moon size={16} strokeWidth={1.9} aria-hidden="true" />
          {hello}
        </span>
        <time dateTime={now.toISOString()}>{formatClock(now)}</time>
        <span className="night-home__date">{capitalize(formatLongDate(now))}</span>
      </div>

      <section className="night-home__tomorrow" aria-labelledby="night-tomorrow">
        <h2 id="night-tomorrow">Mañana</h2>

        {forecast ? (
          <div className="night-home__weather">
            <WeatherGlyph code={forecast.weatherCode} isDay size={34} strokeWidth={1.4} />
            <strong>
              {round(forecast.max)}° <small>/ {round(forecast.min)}°</small>
            </strong>
            <span>
              {weatherLabel(forecast.weatherCode)}
              {Number(forecast.precipitationProbability) >= 30
                ? ` · lluvia ${round(forecast.precipitationProbability)}%`
                : ""}
            </span>
          </div>
        ) : null}

        <ul className="night-home__list">
          {firstEvents.map((event) => (
            <li key={`${event.id || event.summary}-${event.start}`}>
              <CalendarDays size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="night-home__when">{eventTimeLabel(event).split("–")[0]}</span>
              <strong>{event.summary}</strong>
            </li>
          ))}
          {chores.map((task) => (
            <li key={task.id}>
              <SprayCan size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="night-home__when">{task.person ? task.person.name : "Limpieza"}</span>
              <strong>
                {task.area} · {task.title}
              </strong>
            </li>
          ))}
          {!firstEvents.length && !chores.length ? (
            <li className="night-home__free">Mañana empieza tranquilo.</li>
          ) : null}
        </ul>
      </section>

      {mascot ? <div className="night-home__yoshi">{mascot}</div> : null}
    </div>
  );
});
