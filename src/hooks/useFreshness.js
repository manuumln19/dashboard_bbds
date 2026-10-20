import { useMemo, useSyncExternalStore } from "react";
import {
  freshnessAgeMinutes,
  getFreshnessSnapshot,
  subscribeFreshness,
} from "../lib/freshness";
import { subscribeDemoControls } from "../lib/demoControls";

function subscribe(listener) {
  const unsubscribeFreshness = subscribeFreshness(listener);
  const unsubscribeDemo = subscribeDemoControls(listener);
  return () => {
    unsubscribeFreshness();
    unsubscribeDemo();
  };
}

export function useFreshness() {
  return useSyncExternalStore(
    subscribe,
    getFreshnessSnapshot,
    getFreshnessSnapshot
  );
}

const THRESHOLDS = {
  weather: 60,
  calendar: 30,
  lists: 3,
  cleaning: 3,
  sensors: 6,
};

const LABELS = {
  weather: "El tiempo",
  calendar: "La agenda",
  lists: "Las listas",
  cleaning: "La limpieza",
  sensors: "Casa",
};

// Convierte los datos de frescura en avisos legibles para la pantalla.
export function useDataHealth(online, now, { climateEnabled = false } = {}) {
  const freshness = useFreshness();

  return useMemo(() => {
    const issues = [];
    const sources = freshness.sources || {};

    if (!online) {
      issues.push({
        id: "offline",
        label: "Sin conexión",
        detail: freshness.lastGoodAt
          ? "Mostrando la última copia guardada"
          : "Sin copia guardada todavía",
        at: freshness.lastGoodAt,
      });
    }

    Object.entries(sources).forEach(([id, source]) => {
      if (id === "sensors" && !climateEnabled) return;
      const threshold = THRESHOLDS[id];
      if (!threshold) return;
      const age = freshnessAgeMinutes(source.at);
      const stale = age > threshold;
      if (source.ok !== false && !stale) return;
      issues.push({
        id,
        label: LABELS[id] || id,
        detail:
          source.detail ||
          (source.ok === false
            ? "No se pudo actualizar"
            : `Última actualización ${age >= 60 ? `hace ${Math.floor(age / 60)} h` : `hace ${age} min`}`),
        at: source.at,
      });
    });

    // `now` entra en las dependencias para que la antigüedad se recalcule
    // aunque no llegue una respuesta nueva.
    void now;

    return {
      issues,
      freshness,
      lastGoodAt: freshness.lastGoodAt,
      hasIssues: issues.length > 0,
    };
  }, [freshness, online, now, climateEnabled]);
}
