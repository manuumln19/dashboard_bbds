import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import {
  eventStartDate,
  eventTimeLabel,
  relativeDayLabel,
} from "../lib/date";
import { eventTone, formatCountdown, getNextEvent } from "../lib/agenda";

export function NextEventCard({ events, now, onOpen }) {
  const event = getNextEvent(events, now);

  if (!event) {
    return (
      <button
        type="button"
        className="next-event next-event--empty"
        onClick={onOpen}
      >
        <span className="eyebrow">Próximo</span>
        <CalendarDays size={37} strokeWidth={1.2} aria-hidden="true" />
        <strong>La agenda está despejada</strong>
        <span>Toca para ver los próximos días.</span>
      </button>
    );
  }

  const start = eventStartDate(event);
  const tone = eventTone(event);
  const countdown = formatCountdown(event, now);
  const isNow = countdown === "Ahora" || countdown === "Todo el día";

  return (
    <button
      type="button"
      className={`next-event next-event--${tone}${isNow ? " is-now" : ""}`}
      onClick={onOpen}
      aria-label={`Próximo evento: ${event.summary || "Sin título"}. Abrir agenda.`}
    >
      <span className="next-event__top">
        <span className="eyebrow">Próximo</span>
        <span className="next-event__day">{relativeDayLabel(start, now)}</span>
      </span>

      <span className="next-event__time">{eventTimeLabel(event)}</span>
      <strong className="next-event__title">{event.summary || "Sin título"}</strong>

      <span className="next-event__countdown">{countdown}</span>

      <span className="next-event__foot">
        {event.location ? (
          <span>
            <MapPin size={13} strokeWidth={1.9} aria-hidden="true" />
            {event.location}
          </span>
        ) : (
          <span>Agenda compartida</span>
        )}
        <ArrowUpRight size={18} strokeWidth={1.9} aria-hidden="true" />
      </span>
    </button>
  );
}
