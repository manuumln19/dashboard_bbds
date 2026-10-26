import { ArrowUpRight, CalendarDays, ListChecks, SprayCan } from "lucide-react";
import { useRecentlyDone } from "../hooks/useRecentlyDone";
import { timelineDays } from "../lib/today";
import { CheckMark } from "./CheckMark";

const KIND_ICONS = { event: CalendarDays, task: ListChecks, cleaning: SprayCan };

// Hoy y mañana en una lista por orden de hora. Las tareas y la limpieza se
// marcan aquí mismo; los eventos abren la agenda.
export function TodayTimeline({ now, events, lists, cleaning, onOpenAgenda, onOpenLists }) {
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
        <h2 id="today-timeline-title">Hoy y mañana</h2>
        <button type="button" className="today-link" onClick={onOpenAgenda}>
          Agenda
          <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      <div className="today-timeline__days">
        {days.map((day) => (
          <section key={day.key} className="today-day" aria-label={day.label}>
            <h3>{day.label}</h3>
            {day.entries.length ? (
              <ul>
                {day.entries.map((entry) => {
                  const Icon = KIND_ICONS[entry.kind];
                  const checkable = entry.kind !== "event";
                  return (
                    <li key={entry.id}>
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
                  );
                })}
              </ul>
            ) : (
              <p className="today-day__empty">
                {day.label === "Hoy" ? "Nada más por hoy." : "Nada apuntado."}
              </p>
            )}
          </section>
        ))}
      </div>

      {undated ? (
        <button type="button" className="today-timeline__more" onClick={onOpenLists}>
          <ListChecks size={15} strokeWidth={1.9} aria-hidden="true" />
          {undated} {undated === 1 ? "tarea sin fecha" : "tareas sin fecha"} en Listas
        </button>
      ) : null}
    </article>
  );
}
