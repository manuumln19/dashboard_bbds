import { memo } from "react";
import { CalendarDays, ChevronRight, SprayCan, Umbrella } from "lucide-react";
import { MORNING_END, NIGHT } from "../config";
import { eventStartDate, formatClock, formatLongDate, isSameDay, minutesFromTime } from "../lib/date";
import { greetingFor } from "../lib/greeting";
import { cleaningDayIndex } from "../lib/today";
import { getWeatherAdvice, hourLabel, isRainyHour, nextHours, weatherLabel } from "../lib/weather";
import { WeatherGlyph } from "./WeatherGlyph";

const DISMISS_KEY = "bbds.morning.dismissed";

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "—";
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// La mañana va de que acaba la noche a MORNING_END (10:00).
export function isMorningTime(date) {
  const start = minutesFromTime(NIGHT.end);
  const end = minutesFromTime(MORNING_END);
  if (start === null || end === null || start >= end) return false;
  const current = date.getHours() * 60 + date.getMinutes();
  return current >= start && current < end;
}

// «Ver todo el día» la quita hasta mañana, también si se recarga.
export function morningDismissed(now) {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === dayKey(now);
  } catch {
    return false;
  }
}

export function dismissMorning(now) {
  try {
    window.localStorage.setItem(DISMISS_KEY, dayKey(now));
  } catch {
    // Sin almacenamiento, vuelve al recargar; no pasa nada.
  }
}

// Hoy de mañana: solo lo que hace falta para salir de casa. La hora en
// grande, el tiempo de las próximas horas y, a la derecha, el aviso de qué
// llevarse, lo primero de la agenda y lo que toca hoy en casa.
export const MorningHome = memo(function MorningHome({ now, weather, events, lists, cleaning, season, onShowDay }) {
  const current = weather && weather.current ? weather.current : null;
  const today = weather && weather.today ? weather.today : null;
  const hours = nextHours(weather, now, 12);
  const rain = hours.find(isRainyHour);
  const advice = getWeatherAdvice(weather, now);
  const greeting = greetingFor({ now, weather, season, lists, cleaning, events });

  const upcoming = (Array.isArray(events) ? events : [])
    .filter((event) => !event.allDay && isSameDay(eventStartDate(event), now) && eventStartDate(event) > now)
    .sort((a, b) => eventStartDate(a) - eventStartDate(b));
  const first = upcoming[0] || null;
  const firstAt = first ? eventStartDate(first) : null;

  const index = cleaningDayIndex(now);
  const chores = (cleaning.tasks || []).filter((task) => task.day === index && !task.done);
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const dueTasks = (lists.items || []).filter(
    (item) => item.listId === "tasks" && !item.done && item.dueOn && item.dueOn <= todayKey
  );

  return (
    <div className="morning-home">
      <section className="morning-home__time" aria-label="Hora y tiempo">
        <span className="morning-home__hello">
          <strong>{greeting.hello}</strong> · {formatLongDate(now)}
        </span>
        <time className="morning-home__clock" dateTime={now.toISOString()}>
          {formatClock(now)}
        </time>
        <p className="morning-home__weather">
          <WeatherGlyph code={current ? current.weatherCode : 0} isDay size={30} strokeWidth={1.4} />
          <span>
            {current ? `${round(current.temperature)}° ${weatherLabel(current.weatherCode).toLowerCase()}` : "Cargando el tiempo"}
            {today ? ` · máx ${round(today.max)}°` : ""}
            {rain && hourLabel(rain) ? ` · lluvia hacia las ${hourLabel(rain)}` : ""}
          </span>
        </p>
        {hours.length > 1 ? (
          <ol className="morning-home__hours" aria-label="Próximas horas">
            {hours
              .filter((hour, position) => position % 2 === 0)
              .slice(0, 6)
              .map((hour) => (
                <li key={hour.time} className={isRainyHour(hour) ? "is-rain" : undefined}>
                  <span>{hourLabel(hour).slice(0, 2)} h</span>
                  <WeatherGlyph code={hour.weatherCode} isDay={hour.isDay} size={20} strokeWidth={1.5} />
                  <strong>{round(hour.temperature)}°</strong>
                </li>
              ))}
          </ol>
        ) : null}
      </section>

      <section className="morning-home__cards" aria-label="Para salir de casa">
        <article className={`morning-card is-advice tone-${advice.tone}`}>
          <span className="morning-card__label">
            <Umbrella size={15} strokeWidth={1.9} aria-hidden="true" />
            Antes de salir
          </span>
          <strong>{advice.title}</strong>
          <small>{advice.detail}</small>
        </article>

        <article className="morning-card">
          <span className="morning-card__label">
            <CalendarDays size={15} strokeWidth={1.9} aria-hidden="true" />
            Lo primero
          </span>
          <strong>{first ? first.summary : "Agenda libre"}</strong>
          <small>
            {first
              ? `A las ${pad(firstAt.getHours())}:${pad(firstAt.getMinutes())}${first.location ? ` · ${first.location}` : ""}`
              : "Nada apuntado para hoy."}
            {upcoming.length > 1 ? ` · y ${upcoming.length - 1} más` : ""}
          </small>
        </article>

        <article className="morning-card">
          <span className="morning-card__label">
            <SprayCan size={15} strokeWidth={1.9} aria-hidden="true" />
            Hoy toca
          </span>
          <strong>
            {chores.length
              ? chores
                  .slice(0, 2)
                  .map((task) => `${task.title}${task.person ? ` · ${task.person.name}` : ""}`)
                  .join(" — ")
              : "Nada de limpieza"}
          </strong>
          <small>
            {dueTasks.length
              ? `${dueTasks.length} ${dueTasks.length === 1 ? "tarea" : "tareas"} para hoy`
              : chores.length > 2
                ? `y ${chores.length - 2} más de limpieza`
                : "Día tranquilo en casa."}
          </small>
        </article>

        <button type="button" className="morning-home__day" onClick={onShowDay}>
          Ver todo el día
          <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </section>
    </div>
  );
});
