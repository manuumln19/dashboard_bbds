import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock3,
  X,
} from "lucide-react";
import {
  addDays,
  capitalize,
  eventStartDate,
  eventTimeLabel,
  formatEventTime,
  formatLongDate,
  isSameDay,
  startOfDay,
} from "../lib/date";
import { eventTone, eventsForDay, layoutDayEvents } from "../lib/agenda";
import { formatFreshnessTime } from "../lib/freshness";
import { CalendarSheet } from "./CalendarSheet";
import { EventQR } from "./EventQR";
import { dateFormat } from "../lib/intl";

const MODES = [
  { id: "day", label: "Hoy" },
  { id: "three", label: "3 días" },
  { id: "week", label: "Semana" },
];

const START_HOUR = 6;
const END_HOUR = 23;
const RANGE_MINUTES = (END_HOUR - START_HOUR) * 60;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, index) => START_HOUR + index
);

function modeDays(mode) {
  if (mode === "day") return 1;
  if (mode === "three") return 3;
  return 7;
}

function weekdayShort(date) {
  return capitalize(
    dateFormat({ weekday: "short" })
      .format(date)
      .replace(".", "")
  );
}

function monthShort(date) {
  return dateFormat({ month: "short" })
    .format(date)
    .replace(".", "");
}

function rangeLabel(days) {
  if (!days.length) return "";
  const first = days[0];
  const last = days[days.length - 1];
  if (days.length === 1) return formatLongDate(first);
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} ${monthShort(first)}`;
  }
  return `${first.getDate()} ${monthShort(first)} – ${last.getDate()} ${monthShort(last)}`;
}

function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function positionFor(date) {
  const minutes = Math.max(
    START_HOUR * 60,
    Math.min(END_HOUR * 60, minutesOfDay(date))
  );
  return ((minutes - START_HOUR * 60) / RANGE_MINUTES) * 100;
}

function EventDetail({ event, onClose }) {
  const start = eventStartDate(event);
  const tone = eventTone(event);

  return (
    <div className="event-overlay" role="presentation" onMouseDown={onClose}>
      <article
        className={`event-sheet event-sheet--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-title"
        onMouseDown={(clickEvent) => clickEvent.stopPropagation()}
      >
        <header className="event-sheet__head">
          <span className="eyebrow">Detalle de la cita</span>
          <button
            type="button"
            className="event-sheet__close"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            <X size={19} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <h2 id="event-title">{event.summary || "Sin título"}</h2>

        {event.calendarName ? (
          <span className={`event-sheet__calendar tone-${tone}`}>
            {event.calendarName}
            {event.personName && event.personName !== event.calendarName
              ? ` · ${event.personName}`
              : ""}
          </span>
        ) : null}

        <div className="event-sheet__meta">
          <span>
            <CalendarDays size={17} strokeWidth={1.8} aria-hidden="true" />
            {formatLongDate(start)}
          </span>
          <span>
            <Clock3 size={17} strokeWidth={1.8} aria-hidden="true" />
            {eventTimeLabel(event)}
          </span>
        </div>

        <EventQR location={event.location} />

        <p className="event-sheet__note">
          Los calendarios se leen como solo lectura. Aquí puedes consultar la
          cita, pero los cambios se hacen desde el móvil o el ordenador.
        </p>
      </article>
    </div>
  );
}

export function AgendaView({
  events,
  now,
  configured = true,
  error,
  calendar,
  people = [],
}) {
  const [mode, setMode] = useState("week");
  const [anchor, setAnchor] = useState(() => startOfDay(now));
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [calendarsOpen, setCalendarsOpen] = useState(false);
  const feeds = (calendar && calendar.feeds) || [];
  const feedErrors = feeds.filter((feed) => feed.lastError);
  const lastUpdated = calendar && calendar.lastUpdated;
  const count = modeDays(mode);
  const days = useMemo(
    () => Array.from({ length: count }, (_, index) => addDays(anchor, index)),
    [anchor, count]
  );

  useEffect(() => {
    if (!selectedEvent) return undefined;
    function handleKey(event) {
      if (event.key === "Escape") setSelectedEvent(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedEvent]);

  function changeMode(nextMode) {
    setMode(nextMode);
    setAnchor(startOfDay(now));
  }

  function goToday() {
    setAnchor(startOfDay(now));
  }

  function shift(delta) {
    setAnchor((current) => addDays(current, delta * count));
  }

  const today = startOfDay(now);
  const isOnToday = anchor.getTime() === today.getTime();
  const range = rangeLabel(days);

  return (
    <section className="view agenda-view" aria-labelledby="agenda-title">
      <header className="agenda-view__head">
        <div>
          <span className="eyebrow">Calendarios · solo lectura</span>
          <h1 id="agenda-title">Agenda</h1>
          <p>{range}</p>
        </div>

        <div className="agenda-view__controls">
          <button
            type="button"
            className="agenda-calendars-button"
            onClick={() => setCalendarsOpen(true)}
          >
            <CalendarDays size={15} strokeWidth={1.9} aria-hidden="true" />
            Calendarios
          </button>
          <div className="segmented" role="group" aria-label="Vista de agenda">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={mode === item.id ? "is-active" : ""}
                onClick={() => changeMode(item.id)}
                aria-pressed={mode === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="agenda-nav">
            <button
              type="button"
              className="agenda-nav__button"
              onClick={() => shift(-1)}
              aria-label="Periodo anterior"
            >
              <ChevronLeft size={19} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`agenda-nav__today${isOnToday ? " is-current" : ""}`}
              onClick={goToday}
              aria-label="Volver a hoy"
              title="Volver a hoy"
            >
              <CalendarDays size={16} strokeWidth={1.9} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="agenda-nav__button"
              onClick={() => shift(1)}
              aria-label="Periodo siguiente"
            >
              <ChevronRight size={19} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {feeds.length ? (
        <div className="agenda-feed-bar" aria-label="Calendarios conectados">
          {feeds.map((feed) => (
            <span
              key={feed.id}
              className={`agenda-feed tone-${feed.color || "ink"}${
                feed.lastError ? " is-error" : ""
              }`}
              title={feed.lastError || `${feed.eventCount || 0} eventos`}
            >
              <i aria-hidden="true" />
              <strong>{feed.name}</strong>
              {feed.eventCount || 0}
            </span>
          ))}
          {lastUpdated ? (
            <span className="agenda-freshness">
              Actualizado {formatFreshnessTime(lastUpdated)}
            </span>
          ) : null}
        </div>
      ) : null}

      {error && configured ? (
        <div className="inline-alert" role="status">
          No se pudo actualizar la agenda: {error}. Se reintentará solo.
        </div>
      ) : null}

      {feedErrors.length ? (
        <div className="inline-alert" role="status">
          Hay calendarios que no se pudieron leer:{" "}
          {feedErrors.map((feed) => feed.name).join(", ")}. Se usará la última
          copia disponible.
        </div>
      ) : null}

      {!configured ? (
        <div className="card agenda-empty">
          <CalendarOff size={48} strokeWidth={1.2} aria-hidden="true" />
          <h2>Calendario sin conectar</h2>
          <p>
            Conecta la dirección iCal de Manu, Paco o Casa para ver aquí las
            citas de la casa.
          </p>
          <button
            type="button"
            className="feature-button"
            onClick={() => setCalendarsOpen(true)}
          >
            Añadir calendario
          </button>
        </div>
      ) : (
        <div className={`agenda-calendar agenda-calendar--${mode}`}>
          <div className="agenda-axis" aria-hidden="true">
            <div className="agenda-axis__head">
              <span>Hora</span>
            </div>
            <div className="agenda-axis__all-day" />
            <div className="agenda-axis__track">
              {HOURS.map((hour) => (
                <span
                  key={hour}
                  style={{
                    top: `${((hour - START_HOUR) * 60 / RANGE_MINUTES) * 100}%`,
                  }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ))}
            </div>
          </div>

          <div
            className="agenda-columns"
            style={{ "--agenda-days": days.length }}
          >
            {days.map((day) => {
              const items = eventsForDay(events, day);
              const allDay = items.filter((item) => item.allDay);
              // Las citas que quedan fuera de la franja 06:00–23:00 no se
              // aplastan contra el borde: pasan a la fila superior.
              const outside = items.filter(
                (item) =>
                  !item.allDay &&
                  (minutesOfDay(item.end) <= START_HOUR * 60 ||
                    minutesOfDay(item.start) >= END_HOUR * 60)
              );
              const timed = layoutDayEvents(items).filter(
                ({ start, end }) =>
                  minutesOfDay(end) > START_HOUR * 60 &&
                  minutesOfDay(start) < END_HOUR * 60
              );
              const isToday = isSameDay(day, now);
              const nowTop = positionFor(now);
              const showNow =
                isToday &&
                minutesOfDay(now) >= START_HOUR * 60 &&
                minutesOfDay(now) < END_HOUR * 60;

              return (
                <div
                  className={`agenda-column${isToday ? " is-today" : ""}`}
                  key={day.toISOString()}
                >
                  <header className="agenda-day-head">
                    <span>{weekdayShort(day)}</span>
                    <strong>{day.getDate()}</strong>
                    <small>{monthShort(day)}</small>
                  </header>

                  <div className="agenda-all-day">
                    {allDay.length || outside.length ? (
                      <>
                        {allDay.map(({ event }) => (
                          <button
                            key={event.id}
                            type="button"
                            className={`agenda-all-day__chip tone-${eventTone(event)}`}
                            onClick={() => setSelectedEvent(event)}
                            title={event.summary || "Sin título"}
                          >
                            {event.summary || "Sin título"}
                          </button>
                        ))}
                        {outside.map(({ event }) => (
                          <button
                            key={`outside-${event.id}`}
                            type="button"
                            className={`agenda-all-day__chip agenda-all-day__chip--outside tone-${eventTone(
                              event
                            )}`}
                            onClick={() => setSelectedEvent(event)}
                            title={`${event.summary || "Sin título"} · ${formatEventTime(
                              eventStartDate(event)
                            )}`}
                          >
                            <span>{formatEventTime(eventStartDate(event))}</span>
                            {event.summary || "Sin título"}
                          </button>
                        ))}
                      </>
                    ) : (
                      <span className="agenda-all-day__empty">—</span>
                    )}
                  </div>

                  <div className="agenda-track">
                    {timed.map(({ event, start, end, lane, laneCount }) => {
                      const top = positionFor(start);
                      const bottom = positionFor(end);
                      const height = Math.max(3.8, bottom - top);
                      const showLocation = height >= 8;
                      // Los eventos cortos no caben en dos líneas: hora y
                      // título van seguidos en una sola.
                      const short = height < 6.5;
                      return (
                        <button
                          key={event.id}
                          type="button"
                          className={`agenda-event tone-${eventTone(event)}${short ? " is-short" : ""}`}
                          style={{
                            top: `${top}%`,
                            height: `${height}%`,
                            left: `calc(${(lane / laneCount) * 100}% + 4px)`,
                            width: `calc(${100 / laneCount}% - 8px)`,
                          }}
                          onClick={() => setSelectedEvent(event)}
                          title={`${event.summary || "Sin título"} · ${eventTimeLabel(
                            event
                          )}`}
                        >
                          <span>{formatEventTime(start)}</span>
                          <strong>{event.summary || "Sin título"}</strong>
                          {showLocation && event.location ? (
                            <small>{event.location}</small>
                          ) : null}
                        </button>
                      );
                    })}

                    {showNow ? (
                      <span
                        className="agenda-now"
                        style={{ top: `${nowTop}%` }}
                        aria-label="Hora actual"
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedEvent ? (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      ) : null}

      {calendar ? (
        <CalendarSheet
          open={calendarsOpen}
          onClose={() => setCalendarsOpen(false)}
          calendar={calendar}
          people={people}
        />
      ) : null}
    </section>
  );
}
