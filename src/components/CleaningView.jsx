import { useState } from "react";
import { CalendarDays, Cloud, DoorOpen, Flame, Pencil, RotateCcw } from "lucide-react";
import { DEMO_MODE } from "../config";
import { weekDays, weekRangeLabel, weekdayLong } from "../lib/cleaning";
import { isSameDay } from "../lib/date";
import { formatFreshnessTime } from "../lib/freshness";
import { CheckMark } from "./CheckMark";
import { CleaningEditor } from "./CleaningEditor";

// Cómo va cada persona esta semana: lo hecho de lo que tiene asignado.
function tallies(cleaning) {
  return cleaning.people.map((person) => {
    const mine = cleaning.tasks.filter((task) => task.personId === person.id);
    return { person, done: mine.filter((task) => task.done).length, total: mine.length };
  });
}

// Limpieza responde a «¿qué toca hoy?»: el día en grande a la izquierda (hoy,
// o el que se toque en la tira), la semana en una tira de puntos y, debajo,
// el marcador. Papel y un solo acento; cada persona es un punto de color.
export function CleaningView({ now, cleaning }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const days = weekDays(now);
  const todayIndex = days.findIndex((date) => isSameDay(date, now));
  const [picked, setPicked] = useState(null);
  const selected = picked === null ? Math.max(0, todayIndex) : picked;
  const selectedDate = days[selected];
  const selectedOff = !cleaning.days.includes(selected);
  const selectedTasks = cleaning.tasks.filter((task) => task.day === selected);
  const total = cleaning.totalCount || cleaning.tasks.length;
  const done = cleaning.doneCount;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const scores = tallies(cleaning);
  const ranked = [...scores].sort((a, b) => b.done - a.done);
  const leader = ranked.length > 1 && ranked[0].done > ranked[1].done ? ranked[0] : null;
  const isToday = selected === todayIndex;

  return (
    <section className="view cleaning-view" aria-labelledby="cleaning-title">
      <header className="cleaning-head">
        <div>
          <span className="eyebrow">Rutina compartida · semana</span>
          <h1 id="cleaning-title">Limpieza</h1>
          <p>
            <CalendarDays size={14} strokeWidth={1.9} aria-hidden="true" />
            {weekRangeLabel(now)}
          </p>
        </div>

        <div className="cleaning-actions">
          <button
            type="button"
            className="cleaning-reset"
            onClick={cleaning.resetWeek}
            disabled={done === 0}
            title="Desmarcar todas las tareas de esta semana"
          >
            <RotateCcw size={14} strokeWidth={1.9} aria-hidden="true" />
            Reiniciar semana
          </button>
          <button
            type="button"
            className="cleaning-reset cleaning-edit"
            onClick={() => setEditorOpen(true)}
            title="Editar el cuadrante y las personas"
          >
            <Pencil size={14} strokeWidth={1.9} aria-hidden="true" />
            Editar
          </button>
        </div>
      </header>

      {cleaning.error ? (
        <div className="inline-alert" role="status">
          No se pudo sincronizar la limpieza: {cleaning.error}. Se reintentará
          solo.
        </div>
      ) : null}

      <div className="cleaning-layout">
        <section className="card cleaning-focus" aria-live="polite">
          <header className="cleaning-focus__head">
            <span className={isToday ? "is-today" : undefined}>
              {isToday ? "Hoy" : selected < todayIndex ? "Ya pasó" : "Más adelante"}
            </span>
            <h2>
              {weekdayLong(selectedDate)} {selectedDate.getDate()}
            </h2>
            {!isToday && todayIndex >= 0 ? (
              <button type="button" className="today-link" onClick={() => setPicked(null)}>
                Volver a hoy
              </button>
            ) : null}
          </header>

          {selectedOff ? (
            <p className="cleaning-focus__off">Día libre: hoy no se limpia.</p>
          ) : (
            <ul className="cleaning-focus__tasks">
              {selectedTasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    className={`cleaning-focus__task tone-${task.person.tone}${task.done ? " is-done" : ""}`}
                    onClick={() => cleaning.toggleTask(task.id)}
                    aria-pressed={task.done}
                    aria-label={`${task.done ? "Desmarcar" : "Marcar"} ${task.title} de ${task.area}, asignada a ${task.person.name}`}
                  >
                    <CheckMark checked={task.done} />
                    <span className="cleaning-focus__copy">
                      <strong>{task.title}</strong>
                      <span>
                        <DoorOpen size={15} strokeWidth={1.9} aria-hidden="true" />
                        {task.area}
                        <i className="person-dot" aria-hidden="true" />
                        {task.person.name}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <nav className="card cleaning-strip" aria-label="La semana">
          {days.map((date, dayIndex) => {
            const dayTasks = cleaning.tasks.filter((task) => task.day === dayIndex);
            const off = !cleaning.days.includes(dayIndex);
            const classes = ["cleaning-strip__day"];
            if (dayIndex === todayIndex) classes.push("is-today");
            if (dayIndex === selected) classes.push("is-selected");
            if (off) classes.push("is-off");
            return (
              <button
                type="button"
                key={date.toISOString()}
                className={classes.join(" ")}
                onClick={() => setPicked(dayIndex)}
                aria-pressed={dayIndex === selected}
                aria-label={`${weekdayLong(date)} ${date.getDate()}`}
              >
                <span>{weekdayLong(date).slice(0, 3)}</span>
                <strong>{date.getDate()}</strong>
                <span className="cleaning-strip__dots" aria-hidden="true">
                  {off
                    ? "—"
                    : dayTasks.map((task) => (
                        <i key={task.id} className={`tone-${task.person.tone}${task.done ? " is-done" : ""}`} />
                      ))}
                </span>
              </button>
            );
          })}
        </nav>

        <section className="card cleaning-score" aria-label="Marcador">
          <div className="cleaning-score__people">
            {scores.map(({ person, done: mine, total: theirs }) => (
              <div key={person.id} className={`cleaning-score__person tone-${person.tone}`}>
                <i className="person-dot" aria-hidden="true" />
                <span>{person.name}</span>
                <strong>
                  {mine}
                  <small>/{theirs}</small>
                </strong>
              </div>
            ))}
          </div>
          <div className="cleaning-score__bar" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="cleaning-score__note">
            {cleaning.weekComplete
              ? "¡Semana completa!"
              : leader
                ? `Va ganando ${leader.person.name}`
                : done
                  ? "Vais empatados"
                  : "Aún no hay nada hecho"}
            {cleaning.streak ? (
              <span>
                <Flame size={14} strokeWidth={2} aria-hidden="true" />
                {cleaning.streak} {cleaning.streak === 1 ? "semana" : "semanas"} de racha
              </span>
            ) : null}
          </p>
        </section>
      </div>

      <footer className="cleaning-foot">
        <span>
          <Cloud size={14} strokeWidth={1.8} aria-hidden="true" />
          {DEMO_MODE
            ? "Guardado en este navegador."
            : "Guardado en la nube para Manu y Paco."}
        </span>
        <span>
          {cleaning.lastUpdated
            ? `Actualizado a las ${formatFreshnessTime(cleaning.lastUpdated)}.`
            : "La semana se reinicia sola el lunes."}
        </span>
      </footer>

      <CleaningEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        cleaning={cleaning}
      />
    </section>
  );
}
