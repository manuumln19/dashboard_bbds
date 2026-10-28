import { useEffect, useMemo, useRef, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequest } from "../lib/api";
import { loadDemoMenu, saveDemoMenu } from "../lib/localStore";
import { useStableFns } from "./useStableFns";
import { onPollingResume, pollingPaused, pollInterval } from "../lib/polling";

const EMPTY = Array.from({ length: 7 }, () => ({ dish: "", ingredients: [] }));

// Menú de la semana (lunes = 0). Solo se carga si `enabled`.
export function useMenu(enabled) {
  const [days, setDays] = useState(() => (enabled && DEMO_MODE ? loadDemoMenu() || EMPTY : EMPTY));
  const [error, setError] = useState(null);
  const pending = useRef(0);

  useEffect(() => {
    if (!enabled || DEMO_MODE) return undefined;
    let cancelled = false;
    async function load() {
      if (pending.current > 0) return;
      try {
        const data = await apiRequest("/api/menu");
        if (!cancelled) setDays(data.days || EMPTY);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "No se pudo cargar el menú");
      }
    }
    load();
    // Sin sondeos con el salvapantallas abierto; al cerrarlo, uno al momento.
    const tick = load;
    const timer = setInterval(() => {
      if (!pollingPaused()) tick();
    }, pollInterval(5 * 60 * 1000));
    const stopResume = onPollingResume(tick);
    return () => {
      cancelled = true;
      clearInterval(timer);
      stopResume();
    };
  }, [enabled]);

  async function saveMenu(next) {
    const previous = days;
    setDays(next);
    setError(null);
    if (DEMO_MODE) {
      saveDemoMenu(next);
      return;
    }
    pending.current += 1;
    try {
      const data = await apiRequest("/api/menu", { method: "PUT", body: { days: next } });
      setDays(data.days);
    } catch (caught) {
      setDays(previous);
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el menú");
      throw caught;
    } finally {
      pending.current -= 1;
    }
  }

  const actions = useStableFns({ saveMenu });
  return useMemo(() => ({ days, error, saveMenu: actions.saveMenu }), [days, error, actions]);
}
