import { useEffect, useMemo, useState } from "react";
import {
  Cake,
  Check,
  LoaderCircle,
  Plus,
  Save,
  SprayCan,
  Trash2,
  Users,
  X,
} from "lucide-react";

const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const TONES = [
  { id: "pink", label: "Rosa" },
  { id: "mint", label: "Menta" },
  { id: "amber", label: "Ámbar" },
  { id: "lilac", label: "Lila" },
  { id: "ink", label: "Tinta" },
];

function draftFromTask(task) {
  return {
    day: String(task.day),
    personId: task.personId || "",
    area: task.area || "",
    title: task.title || "",
  };
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Cumpleaños como MM-DD con dos desplegables: en el kiosco es más cómodo que
// teclear una fecha.
function BirthdayPicker({ name, value, onChange }) {
  const [month = "", day = ""] = value ? value.split("-") : [];
  function update(nextMonth, nextDay) {
    onChange(nextMonth && nextDay ? `${nextMonth}-${nextDay}` : "");
  }
  const pad = (number) => String(number).padStart(2, "0");
  return (
    <span className="birthday-picker" title={`Cumpleaños de ${name}`}>
      <Cake size={15} strokeWidth={1.9} aria-hidden="true" />
      <select
        aria-label={`Día del cumpleaños de ${name}`}
        value={day}
        onChange={(event) => update(month || "01", event.target.value)}
      >
        <option value="">—</option>
        {Array.from({ length: 31 }, (_, index) => (
          <option key={index} value={pad(index + 1)}>
            {index + 1}
          </option>
        ))}
      </select>
      <select
        aria-label={`Mes del cumpleaños de ${name}`}
        value={month}
        onChange={(event) => update(event.target.value, day || "01")}
      >
        <option value="">—</option>
        {MONTHS.map((label, index) => (
          <option key={label} value={pad(index + 1)}>
            {label}
          </option>
        ))}
      </select>
    </span>
  );
}

export function CleaningEditor({ open, onClose, cleaning }) {
  const { people, addTask, updateTask, removeTask, updatePerson, days, setDays } =
    cleaning;
  const tasks = cleaning.allTasks || cleaning.tasks;
  const [drafts, setDrafts] = useState({});
  const [personDrafts, setPersonDrafts] = useState({});
  const [newTask, setNewTask] = useState({
    day: "0",
    personId: "",
    area: "",
    title: "",
  });
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);
  const [localError, setLocalError] = useState(null);

  const grouped = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      const key = Number(task.day);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    });
    return map;
  }, [tasks]);

  useEffect(() => {
    if (!open) return;
    setDrafts(
      Object.fromEntries(tasks.map((task) => [task.id, draftFromTask(task)]))
    );
    setPersonDrafts(
      Object.fromEntries(
        people.map((person) => [
          person.id,
          { name: person.name, tone: person.tone },
        ])
      )
    );
    setNewTask({
      day: "0",
      personId: people[0] ? people[0].id : "",
      area: "",
      title: "",
    });
    setLocalError(null);
    // Solo al abrir: no pisar lo que se está editando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Si el editor se abrió antes de que llegaran los datos, se rellena en
  // cuanto están disponibles sin pisar ediciones ya empezadas.
  useEffect(() => {
    if (!open || !tasks.length) return;
    setDrafts((current) => {
      if (Object.keys(current).length) return current;
      return Object.fromEntries(
        tasks.map((task) => [task.id, draftFromTask(task)])
      );
    });
    setPersonDrafts((current) => {
      if (Object.keys(current).length || !people.length) return current;
      return Object.fromEntries(
        people.map((person) => [
          person.id,
          { name: person.name, tone: person.tone },
        ])
      );
    });
    setNewTask((current) =>
      current.personId || !people.length
        ? current
        : { ...current, personId: people[0].id }
    );
  }, [open, tasks, people]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function patchDraft(id, patch) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  function flashSaved(id) {
    setSaved(id);
    window.setTimeout(() => setSaved(null), 1600);
  }

  async function saveTask(task) {
    const draft = drafts[task.id];
    if (!draft) return;
    if (!draft.area.trim() || !draft.title.trim()) {
      setLocalError("Cada tarea necesita zona y nombre.");
      return;
    }
    setLocalError(null);
    setSaving(task.id);
    try {
      await updateTask(task.id, {
        day: Number(draft.day),
        personId: draft.personId,
        area: draft.area.trim(),
        title: draft.title.trim(),
      });
      flashSaved(task.id);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "No se pudo guardar"
      );
    } finally {
      setSaving(null);
    }
  }

  async function remove(task) {
    if (
      !window.confirm(
        `¿Borrar "${task.title}" del ${DAYS[task.day]}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setLocalError(null);
    setSaving(task.id);
    try {
      await removeTask(task.id);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "No se pudo borrar"
      );
    } finally {
      setSaving(null);
    }
  }

  async function add() {
    if (!newTask.area.trim() || !newTask.title.trim() || !newTask.personId) {
      setLocalError("Para añadir una tarea, completa zona, nombre y persona.");
      return;
    }
    setLocalError(null);
    setSaving("new");
    try {
      await addTask({
        day: Number(newTask.day),
        personId: newTask.personId,
        area: newTask.area.trim(),
        title: newTask.title.trim(),
      });
      setNewTask((current) => ({
        ...current,
        area: "",
        title: "",
      }));
      flashSaved("new");
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "No se pudo añadir"
      );
    } finally {
      setSaving(null);
    }
  }

  async function savePerson(person) {
    const draft = personDrafts[person.id];
    if (!draft || !draft.name.trim()) return;
    setLocalError(null);
    setSaving(`person-${person.id}`);
    try {
      await updatePerson(person.id, {
        name: draft.name.trim(),
        tone: draft.tone,
        birthday: draft.birthday || null,
      });
      flashSaved(`person-${person.id}`);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "No se pudo guardar"
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <div
      className="ink-overlay feature-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="ink-sheet card cleaning-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cleaning-editor-title"
      >
        <header className="ink-head">
          <span className="ink-head__icon" aria-hidden="true">
            <SprayCan size={23} strokeWidth={1.7} />
          </span>
          <div>
            <span className="eyebrow">Cuadrante de casa</span>
            <h2 id="cleaning-editor-title">Editar limpieza</h2>
            <p>
              Los cambios se guardan en la nube y los ven Manu y Paco. Las
              tareas de cada día se pueden reordenar cambiando el día o la
              persona.
            </p>
          </div>
          <button
            type="button"
            className="icon-button ink-close"
            onClick={onClose}
            aria-label="Cerrar el editor de limpieza"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        {cleaning.error || localError ? (
          <p className="feature-alert" role="alert">
            {localError || cleaning.error}
          </p>
        ) : null}

        <div className="cleaning-editor__body">
          <section className="feature-section">
            <div className="feature-section__head">
              <h3>
                <Users size={16} strokeWidth={1.9} aria-hidden="true" />
                Personas
              </h3>
              <span>Nombre, color y cumpleaños</span>
            </div>
            <div className="people-editor">
              {people.map((person) => {
                const draft = personDrafts[person.id] || person;
                return (
                  <div
                    className={`people-editor__row tone-${person.tone}`}
                    key={person.id}
                  >
                    <span className="person-dot" aria-hidden="true">
                      {(draft.name || person.name).charAt(0).toUpperCase()}
                    </span>
                    <label>
                      <span className="sr-only">Nombre de {person.name}</span>
                      <input
                        type="text"
                        maxLength={40}
                        value={draft.name}
                        onChange={(event) =>
                          setPersonDrafts((current) => ({
                            ...current,
                            [person.id]: {
                              ...draft,
                              name: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span className="sr-only">Color de {person.name}</span>
                      <select
                        value={draft.tone}
                        onChange={(event) =>
                          setPersonDrafts((current) => ({
                            ...current,
                            [person.id]: {
                              ...draft,
                              tone: event.target.value,
                            },
                          }))
                        }
                      >
                        {TONES.map((tone) => (
                          <option key={tone.id} value={tone.id}>
                            {tone.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <BirthdayPicker
                      name={person.name}
                      value={draft.birthday || ""}
                      onChange={(birthday) =>
                        setPersonDrafts((current) => ({
                          ...current,
                          [person.id]: { ...draft, birthday },
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="feature-mini-button"
                      onClick={() => savePerson(person)}
                      disabled={saving === `person-${person.id}`}
                    >
                      {saving === `person-${person.id}` ? (
                        <LoaderCircle
                          className="feature-spin"
                          size={15}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      ) : saved === `person-${person.id}` ? (
                        <Check size={15} strokeWidth={2} aria-hidden="true" />
                      ) : (
                        <Save size={15} strokeWidth={1.9} aria-hidden="true" />
                      )}
                      Guardar
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="feature-section">
            <div className="feature-section__head">
              <h3>Días de limpieza</h3>
              <span>Los demás días no cuentan para la racha</span>
            </div>
            <div className="cleaning-days-picker">
              {DAYS.map((dayLabel, dayIndex) => {
                const on = days.includes(dayIndex);
                return (
                  <button
                    type="button"
                    key={dayLabel}
                    className={on ? "is-on" : ""}
                    aria-pressed={on}
                    disabled={on && days.length === 1}
                    onClick={() =>
                      setDays(
                        on ? days.filter((day) => day !== dayIndex) : [...days, dayIndex]
                      ).catch(() => {})
                    }
                  >
                    {dayLabel}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="feature-section">
            <div className="feature-section__head">
              <h3>Cuadrante semanal</h3>
              <span>{tasks.length} tareas</span>
            </div>

            <div className="cleaning-editor__days">
              {DAYS.map((dayLabel, dayIndex) => {
                const dayTasks = grouped.get(dayIndex) || [];
                return (
                  <div className="cleaning-editor__day" key={dayLabel}>
                    <h4>
                      {dayLabel}
                      <span>{dayTasks.length}</span>
                    </h4>
                    {dayTasks.length ? (
                      dayTasks.map((task) => {
                        const draft = drafts[task.id] || draftFromTask(task);
                        return (
                          <div className="cleaning-edit-row" key={task.id}>
                            <select
                              aria-label={`Día de ${task.title}`}
                              value={draft.day}
                              onChange={(event) =>
                                patchDraft(task.id, {
                                  day: event.target.value,
                                })
                              }
                            >
                              {DAYS.map((label, index) => (
                                <option key={label} value={String(index)}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <select
                              aria-label={`Persona de ${task.title}`}
                              value={draft.personId}
                              onChange={(event) =>
                                patchDraft(task.id, {
                                  personId: event.target.value,
                                })
                              }
                            >
                              {people.map((person) => (
                                <option key={person.id} value={person.id}>
                                  {person.name}
                                </option>
                              ))}
                            </select>
                            <input
                              aria-label={`Zona de ${task.title}`}
                              type="text"
                              maxLength={40}
                              placeholder="Zona"
                              value={draft.area}
                              onChange={(event) =>
                                patchDraft(task.id, {
                                  area: event.target.value,
                                })
                              }
                            />
                            <input
                              aria-label={`Nombre de ${task.title}`}
                              type="text"
                              maxLength={80}
                              placeholder="Tarea"
                              value={draft.title}
                              onChange={(event) =>
                                patchDraft(task.id, {
                                  title: event.target.value,
                                })
                              }
                            />
                            <button
                              type="button"
                              className="feature-icon-button"
                              onClick={() => saveTask(task)}
                              disabled={saving === task.id}
                              aria-label={`Guardar ${task.title}`}
                            >
                              {saving === task.id ? (
                                <LoaderCircle
                                  className="feature-spin"
                                  size={16}
                                  strokeWidth={2}
                                  aria-hidden="true"
                                />
                              ) : saved === task.id ? (
                                <Check
                                  size={16}
                                  strokeWidth={2}
                                  aria-hidden="true"
                                />
                              ) : (
                                <Save
                                  size={16}
                                  strokeWidth={1.9}
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                            <button
                              type="button"
                              className="feature-icon-button feature-icon-button--danger"
                              onClick={() => remove(task)}
                              disabled={saving === task.id}
                              aria-label={`Borrar ${task.title}`}
                            >
                              <Trash2
                                size={16}
                                strokeWidth={1.9}
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="cleaning-editor__empty">
                        Sin tareas este día.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="feature-section feature-section--new">
            <div className="feature-section__head">
              <h3>
                <Plus size={16} strokeWidth={1.9} aria-hidden="true" />
                Añadir tarea
              </h3>
              <span>Se coloca al final del día</span>
            </div>
            <div className="cleaning-add-row">
              <select
                aria-label="Día de la nueva tarea"
                value={newTask.day}
                onChange={(event) =>
                  setNewTask((current) => ({
                    ...current,
                    day: event.target.value,
                  }))
                }
              >
                {DAYS.map((label, index) => (
                  <option key={label} value={String(index)}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Persona de la nueva tarea"
                value={newTask.personId}
                onChange={(event) =>
                  setNewTask((current) => ({
                    ...current,
                    personId: event.target.value,
                  }))
                }
              >
                <option value="">Persona…</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <input
                aria-label="Zona de la nueva tarea"
                type="text"
                maxLength={40}
                placeholder="Zona (Cocina, Baño…)"
                value={newTask.area}
                onChange={(event) =>
                  setNewTask((current) => ({
                    ...current,
                    area: event.target.value,
                  }))
                }
              />
              <input
                aria-label="Nombre de la nueva tarea"
                type="text"
                maxLength={80}
                placeholder="Qué hay que hacer"
                value={newTask.title}
                onChange={(event) =>
                  setNewTask((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                className="feature-button"
                onClick={add}
                disabled={saving === "new"}
              >
                {saving === "new" ? (
                  <LoaderCircle
                    className="feature-spin"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                ) : (
                  <Plus size={16} strokeWidth={2} aria-hidden="true" />
                )}
                Añadir
              </button>
            </div>
          </section>
        </div>

        <footer className="cleaning-editor__foot">
          <span>
            <SprayCan size={14} strokeWidth={1.8} aria-hidden="true" />
            Los checks de la semana no se borran al editar el cuadrante.
          </span>
          <button type="button" className="feature-button" onClick={onClose}>
            Listo
          </button>
        </footer>
      </section>
    </div>
  );
}
