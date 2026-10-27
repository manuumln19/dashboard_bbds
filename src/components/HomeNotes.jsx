import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Minus, Plus, RotateCcw, RotateCw, StickyNote, X } from "lucide-react";
import { formatAge } from "../lib/date";

export const NOTE_COLORS = ["amber", "pink", "mint", "lilac"];
export const NOTE_SHAPES = [
  { id: "square", label: "Pósit" },
  { id: "round", label: "Redonda" },
  { id: "cloud", label: "Nube" },
  { id: "lined", label: "Rayada" },
  { id: "tag", label: "Etiqueta" },
];

// Tamaños en px de la pantalla de referencia (1280 x 800). Los mínimos y
// máximos son los mismos que valida el Worker.
const DEFAULT_W = 190;
const DEFAULT_H = 160;
const MIN_W = 120;
const MIN_H = 100;
const MAX_W = 520;
const MAX_H = 440;
const TAP_SLOP = 6;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sizeOf(note) {
  return { w: note.w || DEFAULT_W, h: note.h || DEFAULT_H };
}

// Sin sitio guardado, los pósits se apilan abajo a la derecha, donde vivía
// el pósit de la compra, un poco desplazados para que se vean todos.
function slotFor(index) {
  return { x: clamp(0.8 - index * 0.025, 0.4, 0.8), y: clamp(0.55 + index * 0.035, 0.1, 0.72) };
}

// El texto crece con el pósit: lo que quepa en el área, entre 14 y 46 px.
function noteFontSize(text, w, h) {
  const chars = Math.max(String(text || "").length, 10);
  return Math.round(clamp(Math.sqrt((w * h * 0.42) / (chars * 0.62)), 14, 46));
}

function authorName(people, id) {
  const person = (people || []).find((item) => item.id === id);
  return person ? person.name : "Alguien de casa";
}

// Un pósit pegado en Hoy. Mientras se arrastra o se estira solo cambia el
// `transform` o el tamaño del elemento (sin re-render); se guarda al soltar.
function HomeNote({ note, index, people, now, position, selected, layerRef, onSelect, onCommit }) {
  const ref = useRef(null);
  const textRef = useRef(null);
  const gesture = useRef(null);
  const { w, h } = sizeOf(note);
  const rot = note.rot || 0;
  const shape = note.shape || "square";

  function start(event, mode) {
    const layer = layerRef.current;
    if (!layer || !ref.current) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = layer.getBoundingClientRect();
    gesture.current = {
      mode,
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      layerW: rect.width,
      layerH: rect.height,
      left: position.x * rect.width,
      top: position.y * rect.height,
      w,
      h,
      dx: 0,
      dy: 0,
      moved: false,
      frame: 0,
    };
    ref.current.classList.add("is-dragging");
  }

  function paint() {
    const g = gesture.current;
    if (!g || !ref.current) return;
    g.frame = 0;
    if (g.mode === "move") {
      ref.current.style.transform = `translate(${g.dx}px, ${g.dy}px) rotate(${rot}deg)`;
    } else {
      const nextW = clamp(g.w + g.dx, MIN_W, MAX_W);
      const nextH = clamp(g.h + g.dy, MIN_H, MAX_H);
      ref.current.style.width = `${nextW}px`;
      ref.current.style.height = `${nextH}px`;
      if (textRef.current) textRef.current.style.fontSize = `${noteFontSize(note.text, nextW, nextH)}px`;
    }
  }

  function move(event) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    g.dx = event.clientX - g.startX;
    g.dy = event.clientY - g.startY;
    if (!g.moved && Math.abs(g.dx) + Math.abs(g.dy) > TAP_SLOP) g.moved = true;
    if (g.moved && !g.frame) g.frame = window.requestAnimationFrame(paint);
  }

  function end(event) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    if (g.frame) window.cancelAnimationFrame(g.frame);
    const el = ref.current;
    if (el) el.classList.remove("is-dragging");
    if (!g.moved) {
      onSelect(selected ? null : note.id);
      return;
    }
    if (g.mode === "move") {
      const left = clamp(g.left + g.dx, 0, Math.max(0, g.layerW - g.w));
      const top = clamp(g.top + g.dy, 0, Math.max(0, g.layerH - g.h));
      if (el) el.style.transform = `rotate(${rot}deg)`;
      onCommit(note.id, {
        x: Math.round((left / g.layerW) * 1000) / 1000,
        y: Math.round((top / g.layerH) * 1000) / 1000,
      });
    } else {
      onCommit(note.id, {
        w: Math.round(clamp(g.w + g.dx, MIN_W, MAX_W)),
        h: Math.round(clamp(g.h + g.dy, MIN_H, MAX_H)),
      });
    }
  }

  return (
    <figure
      ref={ref}
      className={`board-note postit postit--${note.color} board-note--${shape}${selected ? " is-selected" : ""}`}
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        width: `${w}px`,
        height: `${h}px`,
        transform: `rotate(${rot}deg)`,
        animationDelay: `${Math.min(index, 10) * 60}ms`,
      }}
      onPointerDown={(event) => start(event, "move")}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {shape === "tag" ? <span className="board-note__hole" aria-hidden="true" /> : null}
      {shape === "round" || shape === "cloud" ? (
        <span className={`board-note__pin board-note__pin--${note.color}`} aria-hidden="true" />
      ) : null}
      {shape === "square" || shape === "lined" ? <span className="postit__tape" aria-hidden="true" /> : null}
      <blockquote ref={textRef} style={{ fontSize: `${noteFontSize(note.text, w, h)}px` }}>
        {note.text}
      </blockquote>
      <figcaption>
        — {authorName(people, note.personId)} · {formatAge(note.createdAt, now).toLowerCase()}
      </figcaption>
      <span
        className="board-note__grip"
        aria-hidden="true"
        onPointerDown={(event) => start(event, "resize")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
    </figure>
  );
}

function NoteTools({ note, onChange, onRemove, onClose }) {
  const { w, h } = sizeOf(note);
  function scale(factor) {
    onChange({
      w: Math.round(clamp(w * factor, MIN_W, MAX_W)),
      h: Math.round(clamp(h * factor, MIN_H, MAX_H)),
    });
  }
  function turn(delta) {
    onChange({ rot: clamp(Math.round(((note.rot || 0) + delta) * 10) / 10, -12, 12) });
  }

  return (
    <div className="board-tools" role="toolbar" aria-label="Cambiar la nota">
      <div className="board-tools__group" role="group" aria-label="Color">
        {NOTE_COLORS.map((tone) => (
          <button
            type="button"
            key={tone}
            className={`postit-swatch postit--${tone}${note.color === tone ? " is-on" : ""}`}
            aria-pressed={note.color === tone}
            aria-label={`Pósit ${tone}`}
            onClick={() => onChange({ color: tone })}
          />
        ))}
      </div>
      <div className="board-tools__group" role="group" aria-label="Forma">
        {NOTE_SHAPES.map((shape) => (
          <button
            type="button"
            key={shape.id}
            className={`board-tools__shape${(note.shape || "square") === shape.id ? " is-on" : ""}`}
            aria-pressed={(note.shape || "square") === shape.id}
            onClick={() => onChange({ shape: shape.id })}
          >
            <span className={`board-shape-icon board-shape-icon--${shape.id}`} aria-hidden="true" />
            {shape.label}
          </button>
        ))}
      </div>
      <div className="board-tools__group" role="group" aria-label="Tamaño y giro">
        <button type="button" onClick={() => scale(0.85)} aria-label="Más pequeña">
          <Minus size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => scale(1.18)} aria-label="Más grande">
          <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => turn(-3)} aria-label="Girar a la izquierda">
          <RotateCcw size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => turn(3)} aria-label="Girar a la derecha">
          <RotateCw size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <button type="button" className="board-tools__done" onClick={() => onRemove(note.id)}>
        <Check size={18} strokeWidth={2.2} aria-hidden="true" />
        Visto
      </button>
      <button type="button" className="icon-button" onClick={onClose} aria-label="Dejar de editar">
        <X size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

// Escribir una nota: una hoja como las demás. La nota aparece en Hoy, en la
// zona libre de la derecha, y luego se mueve con el dedo.
export function NoteComposer({ notes, people, onClose }) {
  const [text, setText] = useState("");
  const [personId, setPersonId] = useState(people[0] ? people[0].id : "");
  const [color, setColor] = useState("amber");
  const [error, setError] = useState(null);
  const host = document.querySelector(".app") || document.body;

  async function submit(event) {
    event.preventDefault();
    if (!text.trim()) return;
    setError(null);
    try {
      await notes.addNote({
        text,
        personId,
        color,
        x: Math.round((0.62 + Math.random() * 0.18) * 1000) / 1000,
        y: Math.round((0.35 + Math.random() * 0.3) * 1000) / 1000,
        rot: Math.round((Math.random() * 8 - 4) * 10) / 10,
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar");
    }
  }

  return createPortal(
    <div
      className="ink-overlay feature-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="ink-sheet card note-composer" role="dialog" aria-modal="true" aria-labelledby="note-composer-title">
        <header className="ink-head">
          <span className="ink-head__icon" aria-hidden="true">
            <StickyNote size={22} strokeWidth={1.7} />
          </span>
          <div>
            <span className="eyebrow">La nevera</span>
            <h2 id="note-composer-title">Nota nueva</h2>
            <p>Sale en Hoy; luego la puedes mover, estirar o cambiar de color tocándola.</p>
          </div>
          <button type="button" className="ink-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </header>
        <form className="board-new" onSubmit={submit}>
          <textarea
            className={`postit--${color}`}
            value={text}
            maxLength={160}
            rows={3}
            autoFocus
            placeholder="Escribe una nota…"
            onChange={(event) => setText(event.target.value)}
          />
          <div className="board-new__row">
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
              {NOTE_COLORS.map((tone) => (
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
              Pegar en Hoy
            </button>
          </div>
          {error ? <p className="feature-alert">{error}</p> : null}
        </form>
      </section>
    </div>,
    host
  );
}

// La capa de pósits de Hoy: ocupa toda la vista pero solo los pósits y su
// barra reciben el dedo; lo demás sigue funcionando debajo.
export function HomeNotes({ notes, people, now }) {
  const layerRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const ordered = [...notes.notes].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const selected = ordered.find((note) => note.id === selectedId) || null;

  // Tocar fuera de la nota (y de su barra) la suelta.
  useEffect(() => {
    if (!selectedId) return undefined;
    function outside(event) {
      const target = event.target;
      if (target && target.closest && (target.closest(".board-note") || target.closest(".board-tools"))) return;
      setSelectedId(null);
    }
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [selectedId]);

  return (
    <div ref={layerRef} className="home-notes" aria-label="Notas de casa">
      {ordered.map((note, index) => (
        <HomeNote
          key={note.id}
          note={note}
          index={index}
          people={people}
          now={now}
          position={Number.isFinite(note.x) && Number.isFinite(note.y) ? { x: note.x, y: note.y } : slotFor(index)}
          selected={note.id === selectedId}
          layerRef={layerRef}
          onSelect={setSelectedId}
          onCommit={notes.updateNote}
        />
      ))}
      {selected ? (
        <NoteTools
          note={selected}
          onChange={(patch) => notes.updateNote(selected.id, patch)}
          onRemove={(id) => {
            setSelectedId(null);
            notes.removeNote(id);
          }}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}
