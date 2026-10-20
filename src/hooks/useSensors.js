import { useCallback, useEffect, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequest } from "../lib/api";
import { createDemoSensorSnapshot } from "../lib/demo";

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
        setSnapshot(createDemoSensorSnapshot());
        setError(null);
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);
      try {
        const [latestPayload, dayPayload, weekPayload] = await Promise.all([
          apiRequest("/api/sensors/latest"),
          apiRequest("/api/sensors/history?hours=24&bucket=900"),
          apiRequest("/api/sensors/history?hours=168&bucket=3600"),
        ]);

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
          updatedAt: new Date().toISOString(),
        });
        setError(null);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No se pudieron leer los sensores"
        );
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
    const timer = setInterval(() => refresh(true), REFRESH_MS);

    function handleVisibility() {
      if (document.visibilityState === "visible") refresh(true);
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh, enabled]);

  return { ...snapshot, error, loading, refresh };
}
