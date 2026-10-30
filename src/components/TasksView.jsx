import { useEffect, useRef, useState } from "react";
import { Flame, Gift, Pencil, Plus, RotateCcw, Undo2, X } from "lucide-react";
import { weekDays, weekRangeLabel, weekdayLong } from "../lib/cleaning";
import { formatPoints, levelFor, weeklyScores } from "../lib/points";
import { cleaningDayIndex } from "../lib/today";
import { CheckMark } from "./CheckMark";
import { CleaningEditor } from "./CleaningEditor";
import { RewardsSheet } from "./RewardsSheet";

const UNDO_MS = 6000;
// En el marco un toque lento llega a veces dos veces: el segundo se ignora.
const DOUBLE_TAP_MS = 800;
const TASK_POINTS = [2.5, 5, 10, 20];
const MANUAL_POINTS = [2.5, 5, 10, 20, -5];
const REASONS = ["Hizo la cena", "Fregó", "Bajó la basura", "Hizo la compra", "Puso lavadoras"];

function dayKey(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Todo lo que hay que hacer en casa en una sola lista: la rutina de limpieza
// (se repite cada semana) y las tareas sueltas (una vez, con o sin dueño).
function buildEntries({ cleaning, lists, now }) {
  const today = cleaningDayIndex(now);
  const todayKey = dayKey(now);
  const weekEndKey = dayKey(weekDays(now)[6]);
  const routine = cleaning.tasks.map((task) => ({
    key: `c:${task.id}`,
    kind: "routine",
    task,
    title: task.title,
    meta: `${task.area} · cada ${weekdayLong(weekDays(now)[task.day]).toLowerCase()}`,
    person: task.person,
    points: task.points || 10,
    done: task.done,
    when: task.day === today ? "today" : task.day < today ? (task.done ? "past" : "late") : "week",
  }));
  const loose = lists.byList("tasks").map((item) => {
    let when = "someday";
    if (item.dueOn && item.dueOn < todayKey) when = item.done ? "past" : "late";
    else if (item.dueOn === todayKey) when = "today";
    else if (item.dueOn && item.dueOn <= weekEndKey) when = "week";
    else if (item.dueOn) when = "later";
    return {
      key: `l:${item.id}`,
      kind: "task",
      item,
      title: item.text,
      meta: item.dueOn
        ? item.dueOn === todayKey
          ? item.dueAt
            ? `hoy a las ${item.dueAt}`
            : "hoy"
          : item.dueOn === dayKey(addDays(now, 1))
            ? "mañana"
            : item.dueOn.slice(8, 10) + "/" + item.dueOn.slice(5, 7)
        : "cuando sea",
      person: item.person,
      points: item.points || 5,
      done: item.done,
      doneBy: item.doneBy,
      when,
    };
  });
  return [...routine, ...loose];
}

// Tareas: limpieza y tareas sueltas juntas, con puntos. A la izquierda, lo
// que toca (hoy, libres, esta semana, cuando sea); a la derecha, el marcador,
// los puntos a mano y apuntar una tarea nueva.
export function TasksView({ now, cleaning, lists, points }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [asking, setAsking] = useState(null);
  const [undo, setUndo] = useState(null);
  const lastTap = useRef({ key: "", at: 0 });
  const people = cleaning.people;
  const entries = buildEntries({ cleaning, lists, now });
  const { scores, mvp } = weeklyScores({
    cleaning,
    lists,
    now,
    pointEvents: points.events,
    redemptions: points.redemptions,
  });

  useEffect(() => {
    if (!undo) return undefined;
    const timer = window.setTimeout(() => setUndo(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [undo]);

  function apply(entry, doneBy = null) {
    if (entry.kind === "routine") cleaning.toggleTask(entry.task.id);
    else lists.toggleItem(entry.item, doneBy);
  }

  function tap(entry) {
    const at = Date.now();
    if (lastTap.current.key === entry.key && at - lastTap.current.at < DOUBLE_TAP_MS) return;
    lastTap.current = { key: entry.key, at };
    // Libre y sin hacer: primero, quién la ha hecho (se lleva los puntos).
    if (!entry.done && !entry.person) {
      setAsking(asking === entry.key ? null : entry.key);
      return;
    }
    apply(entry);
    setAsking(null);
    setUndo({ entry: { ...entry, done: !entry.done } });
  }

  function doneBy(entry, personId) {
    apply(entry, personId);
    setAsking(null);
    setUndo({ entry: { ...entry, done: true, doneBy: personId } });
  }

  function undoLast() {
    if (!undo) return;
    const { entry } = undo;
    // Volver a tocar deshace; con el estado de ahora, no con el de entonces.
    const live = buildEntries({ cleaning, lists, now }).find((candidate) => candidate.key === entry.key);
    if (live && live.done === entry.done) apply(live);
    setUndo(null);
  }

  const groups = [
    { id: "today", label: "Hoy", items: entries.filter((e) => e.person && e.when === "today") },
    { id: "free", label: "Libres · el primero que la haga se lleva los puntos", items: entries.filter((e) => !e.person && !e.done) },
    // Lo que se quedó sin hacer de días anteriores, aparte: no tapa lo de hoy.
    { id: "late", label: "Se quedó atrás", items: entries.filter((e) => e.person && e.when === "late") },
    { id: "week", label: "Esta semana", items: entries.filter((e) => e.person && e.when === "week" && !e.done) },
    { id: "someday", label: "Cuando sea", items: entries.filter((e) => e.person && (e.when === "someday" || e.when === "later") && !e.done) },
  ].filter((group) => group.items.length);
  const doneThisWeek = entries.filter((e) => e.done).length;

  function renderEntry(entry) {
    const who = entry.person || (entry.doneBy ? people.find((p) => p.id === entry.doneBy) : null);
    return (
      <li key={entry.key} className={`chore${entry.done ? " is-done" : ""}${entry.when === "late" && !entry.done ? " is-late" : ""}`}>
        <button
          type="button"
          className="chore__main"
          onClick={() => tap(entry)}
          aria-pressed={entry.done}
          aria-label={`${entry.done ? "Desmarcar" : "Marcar"}: ${entry.title}`}
        >
          <CheckMark checked={entry.done} />
          <span className={`who-dot${who ? ` tone-${who.tone}` : " is-free"}`} aria-hidden="true" />
          <span className="chore__copy">
            <strong>{entry.title}</strong>
            <span>
              {entry.when === "late" && !entry.done ? "Atrasada · " : ""}
              {entry.meta}
              {who ? ` · ${who.name}` : ""}
            </span>
          </span>
          <span className="chore__points">{formatPoints(entry.points)}</span>
        </button>
        {entry.kind === "task" ? (
          <button type="button" className="chore__remove" onClick={() => lists.removeItem(entry.item)} aria-label={`Borrar: ${entry.title}`}>
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
        {asking === entry.key ? (
          <div className="chore__who" role="group" aria-label="¿Quién la ha hecho?">
            <span>¿Quién la ha hecho?</span>
            {people.map((person) => (
              <button key={person.id} type="button" className={`tone-${person.tone}`} onClick={() => doneBy(entry, person.id)}>
                <span className="who-dot" aria-hidden="true" />
                {person.name}
              </button>
            ))}
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <section className="view tasks-view" aria-labelledby="tasks-title">
      <header className="cleaning-head">
        <div>
          <span className="eyebrow">Casa · semana</span>
          <h1 id="tasks-title">Tareas</h1>
          <p>{weekRangeLabel(now)} · limpieza y tareas, con puntos</p>
        </div>
        <div className="cleaning-actions">
          <button type="button" className="cleaning-reset" onClick={cleaning.resetWeek} disabled={!cleaning.doneCount}>
            <RotateCcw size={14} strokeWidth={1.9} aria-hidden="true" />
            Reiniciar limpieza
          </button>
          <button type="button" className="cleaning-reset cleaning-edit" onClick={() => setEditorOpen(true)}>
            <Pencil size={14} strokeWidth={1.9} aria-hidden="true" />
            Rutina semanal
          </button>
        </div>
      </header>

      {cleaning.error || lists.error || points.error ? (
        <div className="inline-alert" role="status">
          No se pudo sincronizar: {cleaning.error || lists.error || points.error}. Se reintentará solo.
        </div>
      ) : null}

      <div className="tasks-layout">
        <section className="card tasks-list" aria-label="Lo que toca">
          {groups.length ? (
            groups.map((group) => (
              <section key={group.id} className={`tasks-group tasks-group--${group.id}`}>
                <h2>{group.label}</h2>
                <ul>{group.items.map(renderEntry)}</ul>
              </section>
            ))
          ) : (
            <p className="tasks-empty">Nada pendiente. Casa en orden.</p>
          )}
          <p className="tasks-foot">
            {doneThisWeek} {doneThisWeek === 1 ? "hecha" : "hechas"} esta semana
            {lists.byList("tasks").some((item) => item.done) ? (
              <button type="button" className="today-link" onClick={() => lists.clearDone("tasks")}>
                Quitar las sueltas hechas
              </button>
            ) : null}
          </p>
        </section>

        <aside className="tasks-side">
          <Scoreboard scores={scores} mvp={mvp} onRewards={() => setRewardsOpen(true)} />
          <ManualPoints people={people} points={points} />
          <NewTask people={people} lists={lists} cleaning={cleaning} now={now} />
        </aside>
      </div>

      {undo ? (
        <div className="tasks-undo" role="status">
          <span>
            {undo.entry.done ? "Hecha" : "Desmarcada"}: {undo.entry.title}
          </span>
          <button type="button" onClick={undoLast}>
            <Undo2 size={16} strokeWidth={2} aria-hidden="true" />
            Deshacer
          </button>
        </div>
      ) : null}

      <CleaningEditor open={editorOpen} onClose={() => setEditorOpen(false)} cleaning={cleaning} />
      {rewardsOpen ? <RewardsSheet scores={scores} points={points} now={now} onClose={() => setRewardsOpen(false)} /> : null}
    </section>
  );
}

function Scoreboard({ scores, mvp, onRewards }) {
  const top = Math.max(1, ...scores.map((entry) => entry.points));
  return (
    <section className="card tasks-score" aria-label="Marcador de la semana">
      <div className="tasks-score__head">
        <h2>Marcador</h2>
        <button type="button" className="tasks-score__rewards" onClick={onRewards}>
          <Gift size={15} strokeWidth={1.9} aria-hidden="true" />
          Canjear
        </button>
      </div>
      {scores.map((entry) => (
        <div key={entry.person.id} className={`tasks-score__row tone-${entry.person.tone}`}>
          <span className="who-dot" aria-hidden="true" />
          <span className="tasks-score__name">{entry.person.name}</span>
          <span className="tasks-score__bar" aria-hidden="true">
            <i style={{ width: `${Math.max(0, Math.round((entry.points / top) * 100))}%` }} />
          </span>
          <strong>{formatPoints(entry.points)}</strong>
        </div>
      ))}
      <p className="tasks-score__note">
        {mvp ? `Va ganando ${mvp.person.name} · ${levelFor(mvp.points).label}` : "Vais empatados"}
        {scores.some((entry) => entry.streak) ? (
          <span>
            <Flame size={14} strokeWidth={2} aria-hidden="true" />
            racha {Math.max(...scores.map((entry) => entry.streak))}
          </span>
        ) : null}
      </p>
    </section>
  );
}

// Puntos a mano: persona, motivo (opcional) y cuánto. Lo último, con su
// cruz para quitarlo si fue un toque sin querer.
function ManualPoints({ people, points }) {
  const [personId, setPersonId] = useState(people[0] ? people[0].id : "");
  const [reason, setReason] = useState("");
  const recent = points.events.slice(0, 3);
  const nameOf = (id) => (people.find((person) => person.id === id) || { name: id }).name;

  return (
    <section className="card tasks-manual" aria-label="Puntos a mano">
      <h2>Puntos a mano</h2>
      <div className="tasks-chips" role="group" aria-label="Para quién">
        {people.map((person) => (
          <button
            key={person.id}
            type="button"
            className={`tasks-chip tone-${person.tone}${person.id === personId ? " is-on" : ""}`}
            aria-pressed={person.id === personId}
            onClick={() => setPersonId(person.id)}
          >
            <span className="who-dot" aria-hidden="true" />
            {person.name}
          </button>
        ))}
      </div>
      <div className="tasks-chips" role="group" aria-label="Por qué">
        {REASONS.map((text) => (
          <button
            key={text}
            type="button"
            className={`tasks-chip is-small${reason === text ? " is-on" : ""}`}
            aria-pressed={reason === text}
            onClick={() => setReason(reason === text ? "" : text)}
          >
            {text}
          </button>
        ))}
      </div>
      <div className="tasks-chips" role="group" aria-label="Cuántos">
        {MANUAL_POINTS.map((value) => (
          <button
            key={value}
            type="button"
            className="tasks-chip is-amount"
            disabled={!personId}
            onClick={() => {
              points.addPoints(personId, value, reason);
              setReason("");
            }}
          >
            {value > 0 ? `+${formatPoints(value)}` : `−${formatPoints(Math.abs(value))}`}
          </button>
        ))}
      </div>
      {recent.length ? (
        <ul className="tasks-manual__recent">
          {recent.map((event) => (
            <li key={event.id}>
              <span>
                {event.points > 0 ? `+${formatPoints(event.points)}` : `−${formatPoints(Math.abs(event.points))}`} {nameOf(event.personId)}
                {event.reason ? ` · ${event.reason}` : ""}
              </span>
              <button type="button" onClick={() => points.removePoints(event.id)} aria-label="Quitar estos puntos">
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

// Apuntar una tarea suelta: qué, quién (o libre), cuándo y cuánto vale.
// «Cada semana» la apunta en la rutina (como la limpieza), un día por cada
// día elegido; la rutina necesita dueño, así que ahí no vale «Libre».
function NewTask({ people, lists, cleaning, now }) {
  const inputRef = useRef(null);
  const [personId, setPersonId] = useState("");
  const [when, setWhen] = useState("today");
  const [days, setDays] = useState(() => [cleaningDayIndex(now)]);
  const [value, setValue] = useState(5);
  const weekly = when === "weekly";
  const needsOwner = weekly && !personId;

  function toggleDay(day) {
    setDays((current) => (current.includes(day) ? current.filter((entry) => entry !== day) : [...current, day].sort()));
  }

  function submit(event) {
    event.preventDefault();
    const text = inputRef.current ? inputRef.current.value.trim() : "";
    if (!text || needsOwner || (weekly && !days.length)) return;
    if (weekly) {
      days.forEach((day) => {
        cleaning.addTask({ day, personId, area: "Casa", title: text.slice(0, 80), points: value }).catch(() => {});
      });
    } else {
      const dueOn = when === "today" ? dayKey(now) : when === "tomorrow" ? dayKey(addDays(now, 1)) : null;
      lists.addItem("tasks", text, { personId: personId || null, dueOn, points: value });
    }
    inputRef.current.value = "";
  }

  return (
    <form className="card tasks-new" onSubmit={submit} aria-label="Nueva tarea">
      <div className="tasks-new__row">
        <input ref={inputRef} maxLength={weekly ? 80 : 160} placeholder="Nueva tarea…" aria-label="Nueva tarea" enterKeyHint="done" />
        <button type="submit" className="tasks-new__add" aria-label="Apuntar tarea">
          <Plus size={20} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
      <div className="tasks-chips" role="group" aria-label="Quién">
        {[{ id: "", name: "Libre", tone: "free" }, ...people].map((person) => (
          <button
            key={person.id || "free"}
            type="button"
            className={`tasks-chip is-small tone-${person.tone}${person.id === personId ? " is-on" : ""}`}
            aria-pressed={person.id === personId}
            onClick={() => setPersonId(person.id)}
          >
            {person.name}
          </button>
        ))}
        {[
          ["today", "Hoy"],
          ["tomorrow", "Mañana"],
          ["someday", "Cuando sea"],
          ["weekly", "Cada semana"],
        ].map(([id, label]) => (
          <button key={id} type="button" className={`tasks-chip is-small${when === id ? " is-on" : ""}`} aria-pressed={when === id} onClick={() => setWhen(id)}>
            {label}
          </button>
        ))}
        {weekly
          ? weekDays(now).map((date, day) => (
              <button
                key={day}
                type="button"
                className={`tasks-chip is-small is-day${days.includes(day) ? " is-on" : ""}`}
                aria-pressed={days.includes(day)}
                aria-label={weekdayLong(date)}
                onClick={() => toggleDay(day)}
              >
                {weekdayLong(date).slice(0, 2)}
              </button>
            ))
          : null}
        {TASK_POINTS.map((amount) => (
          <button key={amount} type="button" className={`tasks-chip is-small${value === amount ? " is-on" : ""}`} aria-pressed={value === amount} onClick={() => setValue(amount)}>
            {formatPoints(amount)} pts
          </button>
        ))}
      </div>
      {needsOwner ? <p className="tasks-new__hint">Las que se repiten necesitan dueño: elige Manu o Paco.</p> : null}
    </form>
  );
}
