import { ArrowUpRight, CalendarDays, CalendarOff, MapPin } from "lucide-react";
import {
  addDays,
  capitalize,
  eventStartDate,
  formatEventTime,
  startOfDay,
} from "../lib/date";
import { eventTone, groupEventsByDay } from "../lib/agenda";

function dayCopy(date, now) {
  const today = startOfDay(now);
  if (date.getTime() === today.getTime()) return "Hoy";
  if (date.getTime() === addDays(today, 1).getTime()) return "Mañana";
  return capitalize(
    new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(date)
  );
}

function eventTime(event) {
  if (event.allDay) return "Todo el día";
  return formatEventTime(eventStartDate(event));
}

export function AgendaCard({ events, now, configured = true, error, onOpen }) {
  const days = [
    startOfDay(now),
    addDays(startOfDay(now), 1),
    addDays(startOfDay(now), 2),
  ];
  const today = startOfDay(now).getTime();
  const groups = groupEventsByDay(events, days)
    .map((group) => ({
      ...group,
      items: group.items
        .filter(({ allDay, end }) => {
          // «Lo que viene» no debe listar clases o comidas que ya han
          // terminado. Los eventos de todo el día siguen vigentes hasta
          // que acaba la jornada.
          if (group.day.getTime() !== today) return true;
          return allDay || end > now;
        })
        .slice(0, 2),
    }))
    .filter((group) => group.items.length)
    .slice(0, 3);
  const visibleCount = groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <article className="card agenda-preview">
      <header className="agenda-preview__head">
        <div>
          <span className="eyebrow">Agenda compartida</span>
          <h2>Lo que viene</h2>
        </div>
        <button type="button" className="text-button" onClick={onOpen}>
          Ver agenda
          <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      {!configured ? (
        <div className="empty-state empty-state--compact">
          <CalendarOff size={32} strokeWidth={1.3} aria-hidden="true" />
          <strong>Calendario sin conectar</strong>
          <span>Añade el enlace ICS de iCloud en el Worker.</span>
        </div>
      ) : visibleCount ? (
        <div className="agenda-preview__body">
          {groups.map((group) => (
            <section className="agenda-preview__group" key={group.day.toISOString()}>
              <div className="agenda-preview__day">
                <strong>{dayCopy(group.day, now)}</strong>
                <span>
                  {new Intl.DateTimeFormat("es-ES", { day: "numeric" }).format(
                    group.day
                  )}
                </span>
              </div>
              <ul>
                {group.items.map(({ event }) => (
                  <li className={`agenda-preview__row tone-${eventTone(event)}`} key={event.id}>
                    <span className="agenda-preview__bar" aria-hidden="true" />
                    <time>{eventTime(event)}</time>
                    <div>
                      <strong>{event.summary || "Sin título"}</strong>
                      {event.location ? (
                        <span>
                          <MapPin size={11} strokeWidth={1.9} aria-hidden="true" />
                          {event.location}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="agenda-preview__empty">
          <CalendarDays size={32} strokeWidth={1.25} aria-hidden="true" />
          <div>
            <strong>Nada a la vista</strong>
            <span>Los próximos días están despejados.</span>
          </div>
        </div>
      )}

      {error && configured ? (
        <p className="card-note">No se pudo actualizar la agenda. Se reintentará solo.</p>
      ) : null}
    </article>
  );
}
