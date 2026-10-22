import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequestWithMeta } from "../lib/api";
import { createDemoElectricity } from "../lib/demo";
import { reportFailure, reportSync } from "../lib/freshness";

const CACHE_KEY = "bbds.electricity.v1";
const REFRESH_MS = 30 * 60 * 1000;

function readCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !parsed.savedAt ||
      !parsed.data ||
      !parsed.data.source ||
      !Array.isArray(parsed.data.days) ||
      !parsed.data.days.length
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(data) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), data })
    );
  } catch {
    // Sin caché local; el Worker sigue siendo la fuente principal.
  }
}

function validPayload(payload) {
  return (
    payload &&
    payload.source &&
    Array.isArray(payload.days) &&
    payload.days.length > 0 &&
    payload.days.some((day) => day && Array.isArray(day.hours) && day.hours.length)
  );
}

export function useElectricity() {
  const cached = DEMO_MODE ? null : readCache();
  const [data, setData] = useState(() =>
    DEMO_MODE ? createDemoElectricity() : cached ? cached.data : null
  );
  const [savedAt, setSavedAt] = useState(() =>
    DEMO_MODE ? Date.now() : cached ? cached.savedAt : null
  );
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [loading, setLoading] = useState(!DEMO_MODE && !cached);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(Boolean(cached));
  const dataRef = useRef(data);

  const applyData = useCallback((payload) => {
    dataRef.current = payload;
    setData(payload);
  }, []);

  const refresh = useCallback(
    async (silent = false) => {
      if (DEMO_MODE) {
        const next = createDemoElectricity();
        applyData(next);
        setSavedAt(Date.now());
        setStale(false);
        setError(null);
        setWarning(null);
        setLoading(false);
        reportSync("electricity", { at: next.fetchedAt });
        return;
      }

      setRefreshing(true);
      if (!silent && !dataRef.current) setLoading(true);
      try {
        const { data: payload, meta } = await apiRequestWithMeta(
          "/api/electricity"
        );
        if (!validPayload(payload)) {
          throw new Error("La API no ha devuelto precios disponibles");
        }

        const offline = Boolean(meta && meta.offline);
        const staleNow = Boolean(payload.stale || offline);
        const warningText = payload.stale
          ? payload.warning || "No se ha podido confirmar el precio de ahora."
          : offline
            ? "Sin conexión: se muestra la última copia guardada del precio."
            : null;

        applyData(payload);
        if (!staleNow) {
          setSavedAt(Date.now());
          saveCache(payload);
        }
        setStale(staleNow);
        setWarning(warningText);
        setError(null);

        const at = payload.fetchedAt || new Date().toISOString();
        reportSync("electricity", {
          at,
          cachedAt: staleNow ? at : null,
          detail: warningText,
        });
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "No se pudo cargar el precio de la luz";
        setError(message);
        setWarning(null);
        if (dataRef.current) setStale(true);
        reportFailure("electricity", message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyData]
  );

  useEffect(() => {
    refresh(Boolean(dataRef.current));

    const timer = setInterval(() => refresh(true), REFRESH_MS);
    function handleVisibility() {
      if (document.visibilityState === "visible") refresh(true);
    }
    function handleOnline() {
      refresh(true);
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    };
  }, [refresh]);

  return {
    data,
    error,
    warning,
    loading,
    refreshing,
    stale,
    savedAt,
    lastUpdated: data ? data.fetchedAt : null,
    refresh,
  };
}
