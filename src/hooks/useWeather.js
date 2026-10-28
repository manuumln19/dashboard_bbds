import { useCallback, useEffect, useMemo, useState } from "react";
import { DEMO_MODE, LOCATION } from "../config";
import { createDemoWeather } from "../lib/demo";
import { reportFailure, reportSync } from "../lib/freshness";
import { fetchWeather } from "../lib/weather";
import { onPollingResume, pollingPaused, pollInterval } from "../lib/polling";

const CACHE_KEY = `bbds.weather.v2:${LOCATION.latitude}:${LOCATION.longitude}`;
const REFRESH_MS = 15 * 60 * 1000;

function readCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(data) {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), data })
    );
  } catch {
    // Sin cache; se vuelve a pedir al abrir.
  }
}

export function useWeather() {
  // La caché (unos 28 KB de JSON) se lee una vez al montar, no en cada
  // render: en el marco eran varios ms por toque.
  const [cached] = useState(() => (DEMO_MODE ? null : readCache()));
  const [weather, setWeather] = useState(() =>
    DEMO_MODE ? createDemoWeather() : cached ? cached.data : null
  );
  const [lastUpdated, setLastUpdated] = useState(() =>
    DEMO_MODE
      ? new Date().toISOString()
      : cached
        ? new Date(cached.savedAt).toISOString()
        : null
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!weather);

  const refresh = useCallback(async (silent = false) => {
    if (DEMO_MODE) {
      const next = createDemoWeather();
      const at = new Date().toISOString();
      setWeather(next);
      setLastUpdated(at);
      setError(null);
      setLoading(false);
      reportSync("weather", { at });
      return;
    }
    if (!silent) setLoading(true);
    try {
      const { data, meta } = await fetchWeather();
      const at = meta.cachedAt || new Date().toISOString();
      setWeather(data);
      setLastUpdated(at);
      setError(null);
      saveCache(data);
      reportSync("weather", {
        at,
        cachedAt: meta.offline ? at : null,
        detail: meta.offline ? "Mostrando la última copia guardada" : null,
      });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "No se pudo cargar el tiempo";
      setError(message);
      reportFailure("weather", message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(Boolean(weather));
    // Sin sondeos con el salvapantallas abierto; al cerrarlo, uno al momento.
    const tick = () => refresh(true);
    const timer = setInterval(() => {
      if (!pollingPaused()) tick();
    }, pollInterval(REFRESH_MS));
    const stopResume = onPollingResume(tick);

    function handleVisibility() {
      if (document.visibilityState === "visible") refresh(true);
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      stopResume();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // El primer `weather` solo decide si el fetch inicial es silencioso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  // Mismo objeto mientras no cambie nada (las tarjetas de Hoy van memorizadas).
  return useMemo(
    () => ({ weather, error, loading, lastUpdated, refresh }),
    [weather, error, loading, lastUpdated, refresh]
  );
}
