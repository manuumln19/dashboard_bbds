import { Fragment, memo } from "react";
import { ArrowUpRight, CalendarDays, ListChecks, SprayCan } from "lucide-react";
import { useRecentlyDone } from "../hooks/useRecentlyDone";
import { timelineDays } from "../lib/today";
import { CheckMark } from "./CheckMark";
import { SeasonMark } from "./SeasonDecor";

const KIND_ICONS = { event: CalendarDays, task: ListChecks, cleaning: SprayCan };
const CLOCK = /^\d\d:\d\d$/;

function pad(value) {
  return String(value).padStart(2, "0");
}

// Dónde va la marca de «ahora» en la lista de hoy: antes de la primera
// entrada con hora que aún no ha llegado. Lo que tiene hora y ya pasó se
// atenúa; lo que no tiene hora (limpieza, tareas sin hora) no se toca.
function splitAtNow(entries, nowKey) {
  const index = entries.findIndex((entry) => CLOCK.test(entry.time) && entry.sort >= nowKey);
  const hasTimedBefore = entries.some((entry, i) => CLOCK.test(entry.time) && (index < 0 || i < index));
  return { index: index < 0 ? (hasTimedBefore ? entries.length : -1) : index };
}

// Hoy y mañana en una lista por orden de hora. Las tareas y la limpieza se
// marcan aquí mismo; los eventos abren la agenda.
export const TodayTimeline = memo(function TodayTimeline({ now, events, lists, cleaning, onOpenAgenda, onOpenLists }) {
  const recent = useRecentlyDone();
  const days = timelineDays({
    now,
    events,
    items: lists.items,
    cleaning,
    people: lists.people,
    keep: recent.ids,
  });
  const undated = lists.items.filter(
    (item) => item.listId === "tasks" && !item.done && !item.dueOn
  ).length;

  const nowKey = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  function activate(entry) {
    if (entry.kind === "task") {
      if (entry.item.done) recent.forget(entry.item.id);
      else recent.mark(entry.item.id);
      lists.toggleItem(entry.item);
    }
    else if (entry.kind === "cleaning") cleaning.toggleTask(entry.task.id);
    else onOpenAgenda();
  }

  return (
    <article className="card today-timeline" aria-labelledby="today-timeline-title">
      <header className="today-card__head">
        <h2 id="today-timeline-title">
          Hoy y mañana
          <SeasonMark />
        </h2>
        <button type="button" className="today-link" onClick={onOpenAgenda}>
          Agenda
          <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      <div className="today-timeline__days">
        {days.map((day) => {
          const isToday = day.label === "Hoy";
          const mark = isToday ? splitAtNow(day.entries, nowKey).index : -1;
          return (
          <section key={day.key} className="today-day" aria-label={day.label}>
            <h3>{day.label}</h3>
            {day.entries.length ? (
              <ul>
                {day.entries.map((entry, index) => {
                  const Icon = KIND_ICONS[entry.kind];
                  const checkable = entry.kind !== "event";
                  const past = isToday && CLOCK.test(entry.time) && entry.sort < nowKey;
                  return (
                    <Fragment key={entry.id}>
                    {index === mark ? (
                      <li className="today-now-mark" aria-label={`Ahora, ${nowKey}`}>
                        <span>Ahora · {nowKey}</span>
                      </li>
                    ) : null}
                    <li className={past ? "is-past" : undefined}>
                      <button
                        type="button"
                        className={`today-entry tone-${entry.tone}${entry.done ? " is-done" : ""}${
                          entry.overdue ? " is-overdue" : ""
                        }`}
                        onClick={() => activate(entry)}
                        aria-label={
                          checkable
                            ? `${entry.done ? "Desmarcar" : "Marcar como hecho"}: ${entry.title}`
                            : `${entry.title}. Abrir agenda`
                        }
                      >
                        <span className="today-entry__time">{entry.time}</span>
                        <span className="today-entry__mark" aria-hidden="true">
                          {checkable ? (
                            <CheckMark checked={Boolean(entry.done)} small />
                          ) : (
                            <Icon size={15} strokeWidth={1.9} />
                          )}
                        </span>
                        <span className="today-entry__title">{entry.title}</span>
                        {entry.meta ? <span className="today-entry__meta">{entry.meta}</span> : null}
                      </button>
                    </li>
                    {isToday && index === day.entries.length - 1 && mark === day.entries.length ? (
                      <li className="today-now-mark" aria-label={`Ahora, ${nowKey}`}>
                        <span>Ahora · {nowKey}</span>
                      </li>
                    ) : null}
                    </Fragment>
                  );
                })}
              </ul>
            ) : (
              <p className="today-day__empty">
                {day.label === "Hoy" ? "Nada más por hoy." : "Nada apuntado."}
              </p>
            )}
          </section>
          );
        })}
      </div>

      {undated ? (
        <button type="button" className="today-timeline__more" onClick={onOpenLists}>
          <ListChecks size={15} strokeWidth={1.9} aria-hidden="true" />
          {undated} {undated === 1 ? "tarea sin fecha" : "tareas sin fecha"} en Listas
        </button>
      ) : null}
    </article>
  );
});
