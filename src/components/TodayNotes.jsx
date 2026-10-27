import { useState } from "react";
import { Check, PenLine, StickyNote, X } from "lucide-react";
import { formatAge } from "../lib/date";

const COLORS = ["amber", "pink", "mint", "lilac"];

function authorOf(people, id) {
  return (people || []).find((person) => person.id === id) || null;
}

// Un pósit en la nevera: el texto grande, quién lo dejó y cuándo.
function PostIt({ note, people, now, onRemove, compact = false }) {
  const author = authorOf(people, note.personId);
  return (
    <figure className={`postit postit--${note.color}${compact ? " postit--compact" : ""}`}>
      <span className="postit__tape" aria-hidden="true" />
      <blockquote>{note.text}</blockquote>
      <figcaption>
        <span>
          {author ? `— ${author.name}` : "— Alguien de casa"} · {formatAge(note.createdAt, now).toLowerCase()}
        </span>
        {onRemove ? (
          <button type="button" onClick={() => onRemove(note.id)} aria-label="Quitar la nota">
            <Check size={15} strokeWidth={2.2} aria-hidden="true" />
            Visto
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}

function NoteSheet({ notes, people, now, onClose }) {
  const [text, setText] = useState("");
  const [personId, setPersonId] = useState(people[0] ? people[0].id : "");
  const [color, setColor] = useState("amber");
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (!text.trim()) return;
    setError(null);
    try {
      await notes.addNote({ text, personId, color });
      setText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar");
    }
  }

  return (
    <div
      className="ink-overlay feature-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="ink-sheet card notes-sheet" role="dialog" aria-modal="true" aria-labelledby="notes-title">
        <header className="ink-head">
          <span className="ink-head__icon" aria-hidden="true">
            <StickyNote size={23} strokeWidth={1.7} />
          </span>
          <div>
            <span className="eyebrow">La nevera</span>
            <h2 id="notes-title">Notas de casa</h2>
            <p>Lo que dejéis aquí sale en Hoy hasta que alguien toque «Visto».</p>
          </div>
          <button type="button" className="icon-button ink-close" onClick={onClose} aria-label="Cerrar las notas">
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <form className="notes-sheet__form" onSubmit={submit}>
          <textarea
            value={text}
            maxLength={160}
            rows={3}
            placeholder="Escribe una nota…"
            onChange={(event) => setText(event.target.value)}
          />
          <div className="notes-sheet__row">
            <div className="notes-sheet__chips" role="group" aria-label="Quién la deja">
              {people.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  className={`tone-${person.tone}${personId === person.id ? " is-on" : ""}`}
                  aria-pressed={personId === person.id}
                  onClick={() => setPersonId(person.id)}
                >
                  {person.name}
                </button>
              ))}
            </div>
            <div className="notes-sheet__colors" role="group" aria-label="Color del pósit">
              {COLORS.map((tone) => (
                <button
                  type="button"
                  key={tone}
                  className={`postit-swatch postit--${tone}${color === tone ? " is-on" : ""}`}
                  aria-pressed={color === tone}
                  aria-label={`Pósit ${tone}`}
                  onClick={() => setColor(tone)}
                />
              ))}
            </div>
            <span className="notes-sheet__count">{text.length}/160</span>
            <button type="submit" className="notes-sheet__submit" disabled={!text.trim()}>
              Pegar en la nevera
            </button>
          </div>
          {error || notes.error ? <p className="feature-alert">{error || notes.error}</p> : null}
        </form>

        <div className="notes-sheet__wall">
          {notes.notes.length ? (
            notes.notes.map((note) => (
              <PostIt key={note.id} note={note} people={people} now={now} onRemove={notes.removeNote} compact />
            ))
          ) : (
            <p className="notes-sheet__empty">La nevera está vacía.</p>
          )}
        </div>
      </section>
    </div>
  );
}

// En Hoy: la nota más reciente y, si hay más, cuántas.
export function TodayNotes({ notes, people, now }) {
  const [open, setOpen] = useState(false);
  const [latest, ...others] = notes.notes;

  return (
    <>
      {latest ? (
        <div className="today-notes">
          <PostIt note={latest} people={people} now={now} onRemove={notes.removeNote} />
          <button type="button" className="today-notes__more" onClick={() => setOpen(true)}>
            <PenLine size={14} strokeWidth={2} aria-hidden="true" />
            {others.length ? `${others.length} ${others.length === 1 ? "nota más" : "notas más"} · escribir` : "Escribir otra"}
          </button>
        </div>
      ) : (
        <button type="button" className="today-notes__empty" onClick={() => setOpen(true)}>
          <StickyNote size={16} strokeWidth={1.9} aria-hidden="true" />
          Dejar una nota en la nevera
        </button>
      )}
      {open ? <NoteSheet notes={notes} people={people} now={now} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
