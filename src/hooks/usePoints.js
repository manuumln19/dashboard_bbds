import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequest } from "../lib/api";
import { loadDemoPoints, saveDemoPoints } from "../lib/localStore";
import { onPollingResume, pollingPaused, pollInterval } from "../lib/polling";
import { useStableFns } from "./useStableFns";

const REFRESH_MS = 60 * 1000;

// Puntos a mano («hizo la cena»): lo que no estaba apuntado como tarea.
// Igual que las notas, `pending` evita que el sondeo pise una escritura.
export function usePoints() {
  const [events, setEvents] = useState(() => (DEMO_MODE ? loadDemoPoints() : []));
  const [error, setError] = useState(null);
  const pending = useRef(0);
  const lastKey = useRef("");

  const apply = useCallback((next) => {
    const list = Array.isArray(next) ? next : [];
    const key = JSON.stringify(list);
    if (key === lastKey.current) return;
    lastKey.current = key;
    setEvents(list);
  }, []);

  const load = useCallback(async () => {
    if (DEMO_MODE || pending.current > 0) return;
    try {
      const data = await apiRequest("/api/points");
      apply(data.events);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar los puntos");
    }
  }, [apply]);

  useEffect(() => {
    if (DEMO_MODE) return undefined;
    load();
    const timer = setInterval(() => {
      if (!pollingPaused()) load();
    }, pollInterval(REFRESH_MS));
    const stopResume = onPollingResume(load);
    return () => {
      clearInterval(timer);
      stopResume();
    };
  }, [load]);

  useEffect(() => {
    if (DEMO_MODE) saveDemoPoints(events);
  }, [events]);

  async function addPoints(personId, points, reason) {
    const draft = {
      id: `pt-${Date.now()}`,
      personId,
      points,
      reason: String(reason || "").trim().slice(0, 60) || null,
      createdAt: new Date().toISOString(),
    };
    setEvents((current) => [draft, ...current]);
    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const data = await apiRequest("/api/points", { method: "POST", body: draft });
      pending.current -= 1;
      apply(data.events);
    } catch (caught) {
      pending.current -= 1;
      setEvents((current) => current.filter((event) => event.id !== draft.id));
      setError(caught instanceof Error ? caught.message : "No se pudieron apuntar los puntos");
    }
  }

  async function removePoints(id) {
    const previous = events;
    setEvents((current) => current.filter((event) => event.id !== id));
    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const data = await apiRequest(`/api/points/${encodeURIComponent(id)}`, { method: "DELETE" });
      pending.current -= 1;
      apply(data.events);
    } catch (caught) {
      pending.current -= 1;
      setEvents(previous);
      setError(caught instanceof Error ? caught.message : "No se pudieron quitar los puntos");
    }
  }

  const actions = useStableFns({ addPoints, removePoints });
  return useMemo(() => ({ events, error, ...actions }), [events, error, actions]);
}
