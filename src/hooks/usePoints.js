import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequest } from "../lib/api";
import { loadDemoPoints, loadDemoRedemptions, saveDemoPoints, saveDemoRedemptions } from "../lib/localStore";
import { onPollingResume, pollingPaused, pollInterval } from "../lib/polling";
import { useStableFns } from "./useStableFns";

const REFRESH_MS = 60 * 1000;

// Puntos a mano («hizo la cena») y recompensas canjeadas («elijo la peli»).
// Igual que las notas, `pending` evita que el sondeo pise una escritura.
export function usePoints() {
  const [events, setEvents] = useState(() => (DEMO_MODE ? loadDemoPoints() : []));
  const [redemptions, setRedemptions] = useState(() => (DEMO_MODE ? loadDemoRedemptions() : []));
  const [error, setError] = useState(null);
  const pending = useRef(0);
  const lastKey = useRef("");

  // El Worker devuelve las dos listas en cada respuesta.
  const apply = useCallback((data) => {
    const list = data && Array.isArray(data.events) ? data.events : [];
    const spent = data && Array.isArray(data.redemptions) ? data.redemptions : [];
    const key = JSON.stringify([list, spent]);
    if (key === lastKey.current) return;
    lastKey.current = key;
    setEvents(list);
    setRedemptions(spent);
  }, []);

  const load = useCallback(async () => {
    if (DEMO_MODE || pending.current > 0) return;
    try {
      const data = await apiRequest("/api/points");
      apply(data);
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

  useEffect(() => {
    if (DEMO_MODE) saveDemoRedemptions(redemptions);
  }, [redemptions]);

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
      apply(data);
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
      apply(data);
    } catch (caught) {
      pending.current -= 1;
      setEvents(previous);
      setError(caught instanceof Error ? caught.message : "No se pudieron quitar los puntos");
    }
  }

  async function redeem(personId, reward, cost) {
    const draft = {
      id: `rw-${Date.now()}`,
      personId,
      reward: String(reward || "").trim().slice(0, 60),
      cost,
      createdAt: new Date().toISOString(),
    };
    setRedemptions((current) => [draft, ...current]);
    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const data = await apiRequest("/api/points/redeem", { method: "POST", body: draft });
      pending.current -= 1;
      apply(data);
    } catch (caught) {
      pending.current -= 1;
      setRedemptions((current) => current.filter((entry) => entry.id !== draft.id));
      setError(caught instanceof Error ? caught.message : "No se pudo canjear");
    }
  }

  async function undoRedeem(id) {
    const previous = redemptions;
    setRedemptions((current) => current.filter((entry) => entry.id !== id));
    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const data = await apiRequest(`/api/points/redeem/${encodeURIComponent(id)}`, { method: "DELETE" });
      pending.current -= 1;
      apply(data);
    } catch (caught) {
      pending.current -= 1;
      setRedemptions(previous);
      setError(caught instanceof Error ? caught.message : "No se pudo deshacer el canje");
    }
  }

  const actions = useStableFns({ addPoints, removePoints, redeem, undoRedeem });
  return useMemo(() => ({ events, redemptions, error, ...actions }), [events, redemptions, error, actions]);
}
