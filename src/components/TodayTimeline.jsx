import { Fragment, memo } from "react";
import { ArrowUpRight, BellRing, Cake, CalendarDays, ListChecks, Receipt, ShoppingBasket, Sparkles, SprayCan, StickyNote, Trophy, Umbrella, UtensilsCrossed } from "lucide-react";
import { useRecentlyDone } from "../hooks/useRecentlyDone";
import { timelineDays } from "../lib/today";
import { CheckMark } from "./CheckMark";
import { SeasonMark } from "./SeasonDecor";

const KIND_ICONS = { event: CalendarDays, task: ListChecks, cleaning: SprayCan };
const ALERT_ICONS = { rain: Umbrella, bill: Receipt, reminder: BellRing, birthday: Cake, trophy: Trophy, menu: UtensilsCrossed };
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
export const TodayTimeline = memo(function TodayTimeline({
  now,
  events,
  lists,
  cleaning,
  alerts = [],
  onOpenAgenda,
  onOpenLists,
  onOpenShopping,
  onOpenBills,
  onWriteNote,
}) {
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
  const toBuy = lists.items.filter((item) => item.listId === "shopping" && !item.done).length;

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
          Hoy
          <SeasonMark />
        </h2>
        {onWriteNote ? (
          <button type="button" className="today-link today-link--note" onClick={onWriteNote}>
            <StickyNote size={15} strokeWidth={2} aria-hidden="true" />
            Nota
          </button>
        ) : null}
        {onOpenShopping ? (
          <button type="button" className="today-link" onClick={onOpenShopping}>
            <ShoppingBasket size={15} strokeWidth={2} aria-hidden="true" />
            {toBuy ? `Compra · ${toBuy}` : "Compra"}
          </button>
        ) : null}
        <button type="button" className="today-link" onClick={onOpenAgenda}>
          Agenda
          <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      {alerts.length ? (
        <ul className="today-alerts" aria-label="Avisos de hoy">
          {alerts.slice(0, 3).map((item) => {
            const Icon = ALERT_ICONS[item.kind] || Sparkles;
            const content = (
              <>
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
                <strong>{item.title}</strong>
                {item.kind === "bill" ? <small>{item.kicker}</small> : item.detail ? <small>{item.detail}</small> : null}
              </>
            );
            return (
              <li key={item.id} className={`today-alert tone-${item.tone || "amber"}`}>
                {item.kind === "bill" && onOpenBills ? (
                  <button type="button" onClick={onOpenBills}>
                    {content}
                  </button>
                ) : (
                  <span>{content}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="today-timeline__days">
        {days.map((day) => {
          const isToday = day.label === "Hoy";
          const mark = isToday ? splitAtNow(day.entries, nowKey).index : -1;
          // Mañana, en una línea: lo de hoy manda; el detalle está en la Agenda.
          if (!isToday) {
            const first = day.entries.find((entry) => !entry.done);
            return (
              <button key={day.key} type="button" className="today-day__tomorrow" onClick={onOpenAgenda}>
                <strong>Mañana</strong>
                {first ? (
                  <span>
                    {first.time ? `${first.time} · ` : ""}
                    {first.title}
                    {day.entries.length > 1 ? ` y ${day.entries.length - 1} más` : ""}
                  </span>
                ) : (
                  <span>Nada apuntado</span>
                )}
              </button>
            );
          }
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
                        {/* Sin hora, la columna queda vacía; la limpieza lleva su icono. */}
                        <span className="today-entry__time">
                          {entry.time || (entry.kind === "cleaning" ? <SprayCan size={16} strokeWidth={1.8} aria-label="Limpieza" /> : null)}
                        </span>
                        <span className="today-entry__mark" aria-hidden="true">
                          {checkable ? (
                            <CheckMark checked={Boolean(entry.done)} small />
                          ) : (
                            <Icon size={15} strokeWidth={1.9} />
                          )}
                        </span>
                        <span className="today-entry__title">{entry.title}</span>
                        {entry.meta ? (
                          <span className={`today-entry__meta${entry.kind === "event" ? " is-place" : ""}`}>{entry.meta}</span>
                        ) : null}
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
          {undated} {undated === 1 ? "tarea sin fecha" : "tareas sin fecha"} en Tareas
        </button>
      ) : null}
    </article>
  );
});
