import { useCallback, useEffect, useState } from "react";
import { CALENDAR_DAYS, DEMO_MODE } from "../config";
import { apiRequest } from "../lib/api";
import { createDemoEvents } from "../lib/demo";

const REFRESH_MS = 5 * 60 * 1000;

export function useCalendar() {
  const [events, setEvents] = useState(() =>
    DEMO_MODE ? createDemoEvents() : []
  );
  const [error, setError] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(!DEMO_MODE);

  const refresh = useCallback(async (silent = false) => {
    if (DEMO_MODE) {
      setEvents(createDemoEvents());
      setError(null);
      setConfigured(true);
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    try {
      const payload = await apiRequest(
        `/api/calendar?days=${encodeURIComponent(CALENDAR_DAYS)}`
      );
      setEvents(Array.isArray(payload.events) ? payload.events : []);
      setConfigured(true);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo cargar el calendario"
      );
      if (caught && caught.status === 503) setConfigured(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(false);
    if (DEMO_MODE) return undefined;

    const timer = setInterval(() => refresh(true), REFRESH_MS);
    function handleVisibility() {
      if (document.visibilityState === "visible") refresh(true);
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  return { events, error, configured, loading, refresh };
}
