import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Link2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  User,
  X,
} from "lucide-react";
import { formatFreshnessTime } from "../lib/freshness";

const TONES = [
  { id: "pink", label: "Rosa", person: "Manu" },
  { id: "mint", label: "Menta", person: "Paco" },
  { id: "amber", label: "Ámbar", person: "Casa" },
  { id: "lilac", label: "Lila", person: "Compartido" },
  { id: "ink", label: "Tinta", person: "Neutro" },
];

const FALLBACK_PEOPLE = [
  { id: "manu", name: "Manu", tone: "pink" },
  { id: "paco", name: "Paco", tone: "mint" },
];

function draftFromCalendar(calendar) {
  return {
    name: calendar.name || "",
    url: calendar.url || "",
    color: calendar.color || "lilac",
    personId: calendar.personId || "",
    active: calendar.active !== false,
  };
}

export function CalendarSheet({ open, onClose, calendar, people }) {
  const {
    calendars,
    feeds,
    calendarsLoading,
    calendarsError,
    refreshCalendars,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    syncCalendar,
  } = calendar;
  const peopleList = people && people.length ? people : FALLBACK_PEOPLE;
  const eventCounts = new Map(
    (feeds || []).map((feed) => [feed.id, feed.eventCount || 0])
  );

  const [drafts, setDrafts] = useState({});
  const [newCalendar, setNewCalendar] = useState({
    name: "",
    url: "",
    color: "lilac",
    personId: "",
  });
  const [saving, setSaving] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [saved, setSaved] = useState(null);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!open) {
      setDrafts({});
      return;
    }
    refreshCalendars(false).catch(() => {});
    setNewCalendar({
      name: "",
      url: "",
      color: "lilac",
      personId: "",
    });
    setLocalError(null);
  }, [open, refreshCalendars]);

  useEffect(() => {
    if (!open) return;
    setDrafts((current) => {
      const next = { ...current };
      calendars.forEach((item) => {
        if (!next[item.id]) next[item.id] = draftFromCalendar(item);
      });
      return next;
    });
  }, [open, calendars]);

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

  async function saveCalendar(item) {
    const draft = drafts[item.id];
    if (!draft) return;
    if (!draft.name.trim() || !draft.url.trim()) {
      setLocalError("Cada calendario necesita nombre y dirección iCal.");
      return;
    }
    setLocalError(null);
    setSaving(item.id);
    try {
      await updateCalendar(item.id, {
        name: draft.name.trim(),
        url: draft.url.trim(),
        color: draft.color,
        personId: draft.personId || null,
        active: Boolean(draft.active),
      });
      flashSaved(item.id);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "No se pudo guardar"
      );
    } finally {
      setSaving(null);
    }
  }

  async function remove(item) {
    if (
      !window.confirm(
        `¿Quitar el calendario "${item.name}"? Dejarán de verse sus eventos en la agenda.`
      )
    ) {
      return;
    }
    setLocalError(null);
    setSaving(item.id);
    try {
      await deleteCalendar(item.id);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "No se pudo quitar"
      );
    } finally {
      setSaving(null);
    }
  }

  async function syncOne(item) {
    setLocalError(null);
    setSyncing(item.id);
    try {
      await syncCalendar(item.id);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "No se pudo sincronizar"
      );
    } finally {
      setSyncing(null);
    }
  }

  async function syncAll() {
    setLocalError(null);
    setSyncingAll(true);
    try {
      for (const item of calendars) {
        await syncCalendar(item.id);
      }
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "No se pudo sincronizar"
      );
    } finally {
      setSyncingAll(false);
    }
  }

  async function addCalendar() {
    if (!newCalendar.name.trim() || !newCalendar.url.trim()) {
      setLocalError("Para añadir un calendario, ponle nombre y dirección iCal.");
      return;
    }
    setLocalError(null);
    setSaving("new");
    try {
      await createCalendar({
        name: newCalendar.name.trim(),
        url: newCalendar.url.trim(),
        color: newCalendar.color,
        personId: newCalendar.personId || null,
      });
      setNewCalendar({
        name: "",
        url: "",
        color: "lilac",
        personId: "",
      });
      flashSaved("new");
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "No se pudo añadir"
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
        className="ink-sheet card calendar-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-sheet-title"
      >
        <header className="ink-head">
          <span className="ink-head__icon" aria-hidden="true">
            <CalendarDays size={23} strokeWidth={1.7} />
          </span>
          <div>
            <span className="eyebrow">Agenda compartida</span>
            <h2 id="calendar-sheet-title">Calendarios</h2>
            <p>
              Añade la dirección secreta de iCal de cada calendario. El color y
              la persona se usan para distinguirlos en la agenda.
            </p>
          </div>
          <button
            type="button"
            className="icon-button ink-close"
            onClick={onClose}
            aria-label="Cerrar los calendarios"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        {calendarsError || localError ? (
          <p className="feature-alert" role="alert">
            <AlertTriangle size={15} strokeWidth={1.9} aria-hidden="true" />
            {localError || calendarsError}
          </p>
        ) : null}

        <div className="calendar-sheet__body">
          <div className="feature-section__head calendar-sheet__tools">
            <h3>
              <Link2 size={16} strokeWidth={1.9} aria-hidden="true" />
              Conectados ({calendars.length})
            </h3>
            <button
              type="button"
              className="feature-mini-button"
              onClick={syncAll}
              disabled={syncingAll || !calendars.length}
            >
              {syncingAll ? (
                <LoaderCircle
                  className="feature-spin"
                  size={15}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              ) : (
                <RefreshCw
                  size={15}
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              )}
              Sincronizar todo
            </button>
          </div>

          {calendarsLoading && !calendars.length ? (
            <p className="calendar-sheet__empty">
              <LoaderCircle
                className="feature-spin"
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />
              Cargando calendarios…
            </p>
          ) : null}

          {!calendarsLoading && !calendars.length ? (
            <p className="calendar-sheet__empty">
              Todavía no hay ninguno. Añade el primero abajo.
            </p>
          ) : null}

          <div className="calendar-list">
            {calendars.map((item) => {
              const draft = drafts[item.id] || draftFromCalendar(item);
              return (
                <article
                  className={`calendar-card tone-${draft.color}${
                    item.lastError ? " has-error" : ""
                  }`}
                  key={item.id}
                >
                  <header className="calendar-card__head">
                    <span className="calendar-card__dot" aria-hidden="true" />
                    <div className="calendar-card__title">
                      <strong>{item.name}</strong>
                      <span>
                        {item.person ? item.person.name : "Casa"}
                        {item.lastSyncAt
                          ? ` · ${formatFreshnessTime(item.lastSyncAt)}`
                          : " · sin sincronizar"}
                      </span>
                    </div>
                    <span className="calendar-card__count">
                      {eventCounts.get(item.id) ?? item.eventCount ?? 0} eventos
                    </span>
                    <button
                      type="button"
                      className="feature-icon-button"
                      onClick={() => syncOne(item)}
                      disabled={syncing === item.id}
                      aria-label={`Sincronizar ${item.name}`}
                    >
                      {syncing === item.id ? (
                        <LoaderCircle
                          className="feature-spin"
                          size={16}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      ) : (
                        <RefreshCw
                          size={16}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </header>

                  {item.lastError ? (
                    <p className="calendar-card__error">
                      <AlertTriangle
                        size={14}
                        strokeWidth={1.9}
                        aria-hidden="true"
                      />
                      {item.lastError}
                    </p>
                  ) : null}

                  <div className="calendar-card__fields">
                    <label>
                      <span>Nombre</span>
                      <input
                        type="text"
                        maxLength={60}
                        value={draft.name}
                        onChange={(event) =>
                          patchDraft(item.id, { name: event.target.value })
                        }
                      />
                    </label>
                    <label className="calendar-card__url">
                      <span>Dirección iCal</span>
                      <input
                        type="text"
                        value={draft.url}
                        spellCheck="false"
                        onChange={(event) =>
                          patchDraft(item.id, { url: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Color</span>
                      <select
                        value={draft.color}
                        onChange={(event) =>
                          patchDraft(item.id, { color: event.target.value })
                        }
                      >
                        {TONES.map((tone) => (
                          <option key={tone.id} value={tone.id}>
                            {tone.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Persona</span>
                      <select
                        value={draft.personId}
                        onChange={(event) =>
                          patchDraft(item.id, { personId: event.target.value })
                        }
                      >
                        <option value="">Casa</option>
                        {peopleList.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <footer className="calendar-card__foot">
                    <label className="calendar-active">
                      <input
                        type="checkbox"
                        checked={Boolean(draft.active)}
                        onChange={(event) =>
                          patchDraft(item.id, {
                            active: event.target.checked,
                          })
                        }
                      />
                      Visible en la agenda
                    </label>
                    <div>
                      <button
                        type="button"
                        className="feature-icon-button feature-icon-button--danger"
                        onClick={() => remove(item)}
                        disabled={saving === item.id}
                        aria-label={`Quitar ${item.name}`}
                      >
                        <Trash2
                          size={16}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        className="feature-button"
                        onClick={() => saveCalendar(item)}
                        disabled={saving === item.id}
                      >
                        {saving === item.id ? (
                          <LoaderCircle
                            className="feature-spin"
                            size={16}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        ) : saved === item.id ? (
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
                        Guardar
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>

          <section className="feature-section feature-section--new">
            <div className="feature-section__head">
              <h3>
                <Plus size={16} strokeWidth={1.9} aria-hidden="true" />
                Añadir calendario
              </h3>
              <span>Dirección secreta .ics, no el enlace público</span>
            </div>
            <div className="calendar-add">
              <label>
                <span>Nombre</span>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="Manu, Paco, Casa…"
                  value={newCalendar.name}
                  onChange={(event) =>
                    setNewCalendar((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="calendar-add__url">
                <span>Dirección iCal</span>
                <input
                  type="text"
                  spellCheck="false"
                  placeholder="https://…/basic.ics"
                  value={newCalendar.url}
                  onChange={(event) =>
                    setNewCalendar((current) => ({
                      ...current,
                      url: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Color</span>
                <select
                  value={newCalendar.color}
                  onChange={(event) =>
                    setNewCalendar((current) => ({
                      ...current,
                      color: event.target.value,
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
              <label>
                <span>Persona</span>
                <select
                  value={newCalendar.personId}
                  onChange={(event) =>
                    setNewCalendar((current) => ({
                      ...current,
                      personId: event.target.value,
                    }))
                  }
                >
                  <option value="">Casa</option>
                  {peopleList.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="feature-button"
                onClick={addCalendar}
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
            <p className="feature-hint">
              <User size={14} strokeWidth={1.8} aria-hidden="true" />
              En Google Calendar: Ajustes → Integrar el calendario → Dirección
              secreta en formato iCal. En iCloud: Compartir calendario →
              Calendario público → copiar el enlace .ics.
            </p>
          </section>
        </div>

        <footer className="calendar-sheet__foot">
          <span>
            Los eventos siguen siendo de solo lectura: BBDS nunca escribe en tus
            calendarios.
          </span>
          <button type="button" className="feature-button" onClick={onClose}>
            Listo
          </button>
        </footer>
      </section>
    </div>
  );
}
