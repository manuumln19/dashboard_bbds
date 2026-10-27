import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequest } from "../lib/api";
import { loadDemoNotes, saveDemoNotes } from "../lib/localStore";

const REFRESH_MS = 60 * 1000;

// Notas de nevera: mensajes cortos entre vosotros que se ven en Hoy.
// Igual que las listas, `pending` evita que el sondeo pise una escritura.
export function useNotes() {
  const [notes, setNotes] = useState(() => (DEMO_MODE ? loadDemoNotes() : []));
  const [error, setError] = useState(null);
  const pending = useRef(0);
  const lastKey = useRef("");

  const apply = useCallback((next) => {
    const list = Array.isArray(next) ? next : [];
    const key = JSON.stringify(list);
    if (key === lastKey.current) return;
    lastKey.current = key;
    setNotes(list);
  }, []);

  const load = useCallback(async () => {
    if (DEMO_MODE || pending.current > 0) return;
    try {
      const data = await apiRequest("/api/notes");
      apply(data.notes);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar las notas");
    }
  }, [apply]);

  useEffect(() => {
    if (DEMO_MODE) return undefined;
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (DEMO_MODE) saveDemoNotes(notes);
  }, [notes]);

  async function addNote({ text, personId, color }) {
    const clean = String(text || "").replace(/\s+/g, " ").trim().slice(0, 160);
    if (!clean) return;
    const draft = {
      id: `note-${Date.now()}`,
      text: clean,
      personId: personId || null,
      color: color || "amber",
      createdAt: new Date().toISOString(),
    };
    setNotes((current) => [draft, ...current]);
    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const data = await apiRequest("/api/notes", { method: "POST", body: draft });
      pending.current -= 1;
      apply(data.notes);
    } catch (caught) {
      pending.current -= 1;
      setNotes((current) => current.filter((note) => note.id !== draft.id));
      setError(caught instanceof Error ? caught.message : "No se pudo guardar la nota");
      throw caught;
    }
  }

  async function removeNote(id) {
    const previous = notes;
    setNotes((current) => current.filter((note) => note.id !== id));
    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const data = await apiRequest(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
      pending.current -= 1;
      apply(data.notes);
    } catch (caught) {
      pending.current -= 1;
      setNotes(previous);
      setError(caught instanceof Error ? caught.message : "No se pudo quitar la nota");
    }
  }

  return { notes, error, addNote, removeNote };
}
