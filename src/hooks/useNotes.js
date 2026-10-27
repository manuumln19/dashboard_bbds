import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequest } from "../lib/api";
import { loadDemoNotes, saveDemoNotes } from "../lib/localStore";
import { tellYoshi } from "../lib/yoshiTalk";

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

  async function addNote({ text, personId, color, shape, x, y, rot }) {
    const clean = String(text || "").replace(/\s+/g, " ").trim().slice(0, 160);
    if (!clean) return;
    const draft = {
      id: `note-${Date.now()}`,
      text: clean,
      personId: personId || null,
      color: color || "amber",
      shape: shape || "square",
      x: Number.isFinite(x) ? x : null,
      y: Number.isFinite(y) ? y : null,
      w: null,
      h: null,
      rot: Number.isFinite(rot) ? rot : 0,
      createdAt: new Date().toISOString(),
    };
    setNotes((current) => [draft, ...current]);
    tellYoshi("note");
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

  // Las notas de Hoy llaman aquí al soltar un pósit: sitio, tamaño, giro, forma o
  // color. Se aplica ya y, si falla, vuelve a donde estaba.
  async function updateNote(id, patch) {
    const previous = notes;
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, ...patch } : note)));
    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const data = await apiRequest(`/api/notes/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch,
      });
      pending.current -= 1;
      apply(data.notes);
    } catch (caught) {
      pending.current -= 1;
      setNotes(previous);
      setError(caught instanceof Error ? caught.message : "No se pudo mover la nota");
    }
  }

  return { notes, error, addNote, removeNote, updateNote };
}
