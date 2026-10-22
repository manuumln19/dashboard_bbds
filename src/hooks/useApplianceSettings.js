import { useCallback, useEffect, useState } from "react";
import {
  APPLIANCES,
  applianceById,
  defaultConfigFor,
  normalizeApplianceConfig,
} from "../lib/energy";

const STORAGE_KEY = "bbds.energy.settings.v1";

function defaultState() {
  const configs = {};
  APPLIANCES.forEach((appliance) => {
    configs[appliance.id] = defaultConfigFor(appliance);
  });
  return { applianceId: APPLIANCES[0].id, configs };
}

function readState() {
  const fallback = defaultState();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;

    const appliance = applianceById(parsed.applianceId);
    const configs = {};
    APPLIANCES.forEach((entry) => {
      const stored =
        parsed.configs && typeof parsed.configs === "object"
          ? parsed.configs[entry.id]
          : null;
      configs[entry.id] = normalizeApplianceConfig(entry, stored);
    });
    return { applianceId: appliance.id, configs };
  } catch {
    return fallback;
  }
}

export function useApplianceSettings() {
  const [state, setState] = useState(readState);

  const appliance = applianceById(state.applianceId);
  const configs = {};
  APPLIANCES.forEach((entry) => {
    configs[entry.id] = normalizeApplianceConfig(
      entry,
      state.configs[entry.id] || defaultConfigFor(entry)
    );
  });
  const config = configs[appliance.id];

  const selectAppliance = useCallback((id) => {
    const next = applianceById(id);
    setState((current) => {
      if (current.applianceId === next.id) return current;
      return {
        ...current,
        applianceId: next.id,
        configs: {
          ...current.configs,
          [next.id]: normalizeApplianceConfig(
            next,
            current.configs[next.id] || defaultConfigFor(next)
          ),
        },
      };
    });
  }, []);

  const updateConfig = useCallback((patch) => {
    setState((current) => {
      const currentAppliance = applianceById(current.applianceId);
      const previous = normalizeApplianceConfig(
        currentAppliance,
        current.configs[currentAppliance.id] ||
          defaultConfigFor(currentAppliance)
      );
      return {
        ...current,
        configs: {
          ...current.configs,
          [currentAppliance.id]: normalizeApplianceConfig(currentAppliance, {
            ...previous,
            ...patch,
          }),
        },
      };
    });
  }, []);

  const resetConfig = useCallback(() => {
    setState((current) => {
      const currentAppliance = applianceById(current.applianceId);
      return {
        ...current,
        configs: {
          ...current.configs,
          [currentAppliance.id]: defaultConfigFor(currentAppliance),
        },
      };
    });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // La pantalla sigue funcionando con los valores de esta sesión.
    }
  }, [state]);

  return {
    appliance,
    config,
    configs,
    selectAppliance,
    updateConfig,
    resetConfig,
  };
}
