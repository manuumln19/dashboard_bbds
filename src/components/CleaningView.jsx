import { useState } from "react";
import {
  CalendarDays,
  Cloud,
  DoorOpen,
  Pencil,
  RotateCcw,
  SprayCan,
} from "lucide-react";
import { DEMO_MODE } from "../config";
import {
  monthShort,
  weekDays,
  weekRangeLabel,
  weekdayLong,
} from "../lib/cleaning";
import { isSameDay } from "../lib/date";
import { formatFreshnessTime } from "../lib/freshness";
import { CheckMark } from "./CheckMark";
import { CleaningEditor } from "./CleaningEditor";

// Racha de semanas completas y quién lleva más tareas hechas esta semana.
function CleaningStreak({ cleaning }) {
  const tally = cleaning.people
    .map((person) => ({
      person,
      done: cleaning.tasks.filter((task) => task.done && task.personId === person.id).length,
    }))
    .sort((a, b) => b.done - a.done);
  const leader =
    tally.length > 1 && tally[0].done > tally[1].done ? tally[0] : null;
  const weeks = cleaning.streak;

  return (
    <div className={`cleaning-streak${weeks ? " is-on" : ""}`}>
      <div className="cleaning-streak__top">
        <strong>{weeks}</strong>
        <span>
          {weeks === 1 ? "semana" : "semanas"}
          <br />
          {weeks ? "seguidas" : "sin racha"}
        </span>
      </div>
      <span className="cleaning-streak__leader">
        {cleaning.weekComplete
          ? "¡Semana completa!"
          : leader
            ? `Va ganando ${leader.person.name} · ${tally.map((entry) => entry.done).join(" a ")}`
            : tally.some((entry) => entry.done)
              ? `Empate a ${tally[0].done}`
              : "Aún no hay nada hecho"}
      </span>
    </div>
  );
}

export function CleaningView({ now, cleaning }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const days = weekDays(now);
  const total = cleaning.totalCount || cleaning.tasks.length;
  const done = cleaning.doneCount;
  const progress = total ? Math.round((done / total) * 100) : 0;

  return (
    <section className="view cleaning-view" aria-labelledby="cleaning-title">
      <header className="cleaning-head">
        <div>
          <span className="eyebrow">Rutina compartida · semana</span>
          <h1 id="cleaning-title">Limpieza</h1>
          <p>
            <CalendarDays size={14} strokeWidth={1.9} aria-hidden="true" />
            {weekRangeLabel(now)} · Toca una tarea para marcarla.
          </p>
        </div>

        <div className="cleaning-summary">
          <CleaningStreak cleaning={cleaning} />
          <div className="cleaning-progress">
            <div className="cleaning-progress__top">
              <strong>
                {done}
                <span>/{total}</span>
              </strong>
              <span>{done === 1 ? "tarea hecha" : "tareas hechas"}</span>
            </div>
            <div className="cleaning-progress__bar" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
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

      <div className="cleaning-board">
        {days.map((date, dayIndex) => {
          const dayTasks = cleaning.tasks.filter((task) => task.day === dayIndex);
          const dayDone = dayTasks.filter((task) => task.done).length;
          const today = isSameDay(date, now);
          const off = !cleaning.days.includes(dayIndex);

          if (off) {
            return (
              <section
                className={`cleaning-row is-off${today ? " is-today" : ""}`}
                key={date.toISOString()}
                aria-label={`${weekdayLong(date)} ${date.getDate()}, día libre`}
              >
                <header className="cleaning-row__day">
                  <div>
                    <span>{weekdayLong(date)}</span>
                    <small>{monthShort(date)}</small>
                  </div>
                  <strong>{date.getDate()}</strong>
                </header>
                <p className="cleaning-row__off">Día libre: hoy no se limpia.</p>
              </section>
            );
          }

          return (
            <section
              className={`cleaning-row${today ? " is-today" : ""}`}
              key={date.toISOString()}
              aria-label={`${weekdayLong(date)} ${date.getDate()}`}
            >
              <header className="cleaning-row__day">
                <div>
                  <span>{weekdayLong(date)}</span>
                  <small>{monthShort(date)}</small>
                </div>
                <strong>{date.getDate()}</strong>
                {today ? <em>Hoy</em> : null}
              </header>

              <div className="cleaning-row__tasks">
                {dayTasks.map((task) => (
                  <button
                    type="button"
                    className={`cleaning-task tone-${task.person.tone}${
                      task.done ? " is-done" : ""
                    }`}
                    key={task.id}
                    onClick={() => cleaning.toggleTask(task.id)}
                    aria-pressed={task.done}
                    aria-label={`${task.done ? "Desmarcar" : "Marcar"} ${
                      task.title
                    } de ${task.area}, asignada a ${task.person.name}`}
                  >
                    <CheckMark checked={task.done} small />
                    <span className="cleaning-task__copy">
                      <strong>{task.title}</strong>
                      <span className="cleaning-task__area">
                        <DoorOpen
                          size={12}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />
                        {task.area}
                      </span>
                    </span>
                    <span className="cleaning-task__person">
                      <i aria-hidden="true">
                        {task.person.name.charAt(0).toUpperCase()}
                      </i>
                      {task.person.name}
                    </span>
                  </button>
                ))}
              </div>

              <footer className="cleaning-row__foot">
                <strong>
                  {dayDone}/{dayTasks.length}
                </strong>
                <span>{dayDone === dayTasks.length ? "Listo" : "Pendiente"}</span>
              </footer>
            </section>
          );
        })}
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
