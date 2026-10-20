import { CalendarDays, Clock3, User, X } from "lucide-react";
import {
  addDays,
  capitalize,
  formatShortDay,
  startOfDay,
} from "../lib/date";

function parseDueDate(dueOn) {
  if (!dueOn) return null;
  const [year, month, day] = String(dueOn).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function dueDateLabel(dueOn, now = new Date()) {
  const date = parseDueDate(dueOn);
  if (!date) return "";
  const today = startOfDay(now);
  if (date.getTime() === today.getTime()) return "Hoy";
  if (date.getTime() === addDays(today, 1).getTime()) return "Mañana";
  if (date.getTime() === addDays(today, -1).getTime()) return "Ayer";
  return capitalize(formatShortDay(date));
}

export function isTodoOverdue(item, now = new Date()) {
  if (!item || item.done || !item.dueOn) return false;
  const date = parseDueDate(item.dueOn);
  if (!date) return false;
  if (item.dueAt) {
    const [hour, minute] = String(item.dueAt).split(":").map(Number);
    date.setHours(hour || 0, minute || 0, 0, 0);
  } else {
    date.setHours(23, 59, 59, 999);
  }
  return date.getTime() < now.getTime();
}

export function TodoMetaFields({
  dueOn,
  dueAt,
  personId,
  people = [],
  onChange,
  idPrefix = "todo",
}) {
  function update(patch) {
    onChange(patch);
  }

  return (
    <div className="todo-meta-fields">
      <label htmlFor={`${idPrefix}-date`}>
        <CalendarDays size={14} strokeWidth={1.9} aria-hidden="true" />
        <span className="sr-only">Fecha</span>
        <input
          id={`${idPrefix}-date`}
          type="date"
          value={dueOn || ""}
          onChange={(event) =>
            update({
              dueOn: event.target.value || null,
              ...(event.target.value ? {} : { dueAt: null }),
            })
          }
        />
      </label>
      <label htmlFor={`${idPrefix}-time`}>
        <Clock3 size={14} strokeWidth={1.9} aria-hidden="true" />
        <span className="sr-only">Hora</span>
        <input
          id={`${idPrefix}-time`}
          type="time"
          value={dueAt || ""}
          disabled={!dueOn}
          onChange={(event) =>
            update({ dueAt: event.target.value || null })
          }
        />
      </label>
      <label htmlFor={`${idPrefix}-person`}>
        <User size={14} strokeWidth={1.9} aria-hidden="true" />
        <span className="sr-only">Persona</span>
        <select
          id={`${idPrefix}-person`}
          value={personId || ""}
          onChange={(event) =>
            update({ personId: event.target.value || null })
          }
        >
          <option value="">Casa</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      {dueOn || personId ? (
        <button
          type="button"
          className="todo-meta-clear"
          onClick={() => update({ dueOn: null, dueAt: null, personId: null })}
          aria-label="Quitar fecha y persona"
        >
          <X size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export function TodoBadges({ item, now = new Date(), people = [] }) {
  if (!item) return null;
  const person =
    item.person ||
    (item.personId
      ? people.find((entry) => entry.id === item.personId) || null
      : null);
  const overdue = isTodoOverdue(item, now);
  if (!item.dueOn && !person) return null;

  return (
    <span className={`todo-badges${overdue ? " is-overdue" : ""}`}>
      {item.dueOn ? (
        <span className="todo-badge todo-badge--date">
          <CalendarDays size={12} strokeWidth={1.9} aria-hidden="true" />
          {dueDateLabel(item.dueOn, now)}
          {item.dueAt ? ` · ${item.dueAt}` : ""}
        </span>
      ) : null}
      {person ? (
        <span className={`todo-badge todo-badge--person tone-${person.tone}`}>
          <i aria-hidden="true">
            {(person.name || "?").charAt(0).toUpperCase()}
          </i>
          {person.name}
        </span>
      ) : null}
    </span>
  );
}
