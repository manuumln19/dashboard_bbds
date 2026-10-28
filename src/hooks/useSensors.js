import { useCallback, useEffect, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequestWithMeta } from "../lib/api";
import { createDemoSensorSnapshot } from "../lib/demo";
import { reportFailure, reportSync } from "../lib/freshness";
import { onPollingResume, pollingPaused, pollInterval } from "../lib/polling";

const REFRESH_MS = 60 * 1000;

const EMPTY = {
  latest: [],
  history24: {},
  history7: {},
  updatedAt: null,
};

function groupHistory(readings) {
  const grouped = {};
  (readings || []).forEach((point) => {
    if (!grouped[point.roomId]) grouped[point.roomId] = [];
    grouped[point.roomId].push(point);
  });
  return grouped;
}

export function useSensors(enabled = true) {
  const [snapshot, setSnapshot] = useState(() =>
    enabled && DEMO_MODE ? createDemoSensorSnapshot() : EMPTY
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled && !DEMO_MODE);

  const refresh = useCallback(
    async (silent = false) => {
      if (!enabled) {
        setSnapshot(EMPTY);
        setError(null);
        setLoading(false);
        return;
      }

      if (DEMO_MODE) {
        const at = new Date().toISOString();
        setSnapshot({ ...createDemoSensorSnapshot(), updatedAt: at });
        setError(null);
        setLoading(false);
        reportSync("sensors", { at });
        return;
      }

      if (!silent) setLoading(true);
      try {
        const [latestResult, dayResult, weekResult] = await Promise.all([
          apiRequestWithMeta("/api/sensors/latest"),
          apiRequestWithMeta("/api/sensors/history?hours=24&bucket=900"),
          apiRequestWithMeta("/api/sensors/history?hours=168&bucket=3600"),
        ]);
        const latestPayload = latestResult.data;
        const dayPayload = dayResult.data;
        const weekPayload = weekResult.data;
        const at =
          latestResult.meta.cachedAt ||
          new Date().toISOString();

        setSnapshot({
          latest: Array.isArray(latestPayload.readings)
            ? latestPayload.readings
            : [],
          history24: groupHistory(
            dayPayload && dayPayload.readings ? dayPayload.readings : []
          ),
          history7: groupHistory(
            weekPayload && weekPayload.readings ? weekPayload.readings : []
          ),
          updatedAt: at,
        });
        setError(null);
        reportSync("sensors", {
          at,
          cachedAt: latestResult.meta.offline ? at : null,
          detail: latestResult.meta.offline
            ? "Mostrando la última copia guardada"
            : null,
        });
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "No se pudieron leer los sensores";
        setError(message);
        reportFailure("sensors", message);
      } finally {
        setLoading(false);
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) {
      setSnapshot(EMPTY);
      setError(null);
      setLoading(false);
      return undefined;
    }

    refresh(false);
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
  }, [refresh, enabled]);

  return { ...snapshot, error, loading, refresh };
}
