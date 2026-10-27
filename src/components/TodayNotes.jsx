import { useState } from "react";
import { Check, PenLine } from "lucide-react";
import { formatAge } from "../lib/date";
import { NoteBoard } from "./NoteBoard";

function authorOf(people, id) {
  return (people || []).find((person) => person.id === id) || null;
}

// Un pósit: el texto grande, quién lo dejó y cuándo.
function PostIt({ note, people, now, onRemove, onWrite, compact = false }) {
  const author = authorOf(people, note.personId);
  return (
    <figure className={`postit postit--${note.color}${compact ? " postit--compact" : ""}`}>
      <span className="postit__tape" aria-hidden="true" />
      <blockquote>{note.text}</blockquote>
      <figcaption>
        <span className="postit__by">
          <strong>{author ? `— ${author.name}` : "— Alguien de casa"}</strong>
          <small>{formatAge(note.createdAt, now).toLowerCase()}</small>
        </span>
        <span className="postit__actions">
          {onWrite ? (
            <button type="button" onClick={onWrite} aria-label="Escribir otra nota">
              <PenLine size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
          {onRemove ? (
            <button type="button" onClick={() => onRemove(note.id)} aria-label="Quitar la nota">
              <Check size={15} strokeWidth={2.2} aria-hidden="true" />
              <span className="postit__label">Visto</span>
            </button>
          ) : null}
        </span>
      </figcaption>
    </figure>
  );
}

// En Hoy, pegado en la esquina de la tarjeta de Compra: la nota más reciente
// y, si hay más, otra asomando detrás. Sin notas, un pósit en blanco.
export function TodayNotes({ notes, people, now }) {
  const [open, setOpen] = useState(false);
  const [latest, second] = notes.notes;

  return (
    <div className="today-notes">
      {latest ? (
        <>
          {second ? (
            <button
              type="button"
              className={`postit postit--${second.color} postit--behind`}
              onClick={() => setOpen(true)}
              aria-label={`Ver las ${notes.notes.length} notas`}
            >
              <span>+{notes.notes.length - 1}</span>
            </button>
          ) : null}
          <PostIt
            note={latest}
            people={people}
            now={now}
            onRemove={notes.removeNote}
            onWrite={() => setOpen(true)}
          />
        </>
      ) : (
        <button type="button" className="postit postit--blank" onClick={() => setOpen(true)}>
          <span className="postit__tape" aria-hidden="true" />
          <PenLine size={18} strokeWidth={1.8} aria-hidden="true" />
          Deja una nota
        </button>
      )}
      {open ? <NoteBoard notes={notes} people={people} now={now} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
