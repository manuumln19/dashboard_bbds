import { useCallback, useMemo, useRef, useState } from "react";
import { NIGHT } from "../config";
import { minutesFromTime } from "../lib/date";

export function isNightTime(date, start = NIGHT.start, end = NIGHT.end) {
  const startMinutes = minutesFromTime(start);
  const endMinutes = minutesFromTime(end);
  if (startMinutes === null || endMinutes === null) return false;
  if (startMinutes === endMinutes) return false;

  const current = date.getHours() * 60 + date.getMinutes();
  if (startMinutes < endMinutes) {
    return current >= startMinutes && current < endMinutes;
  }
  return current >= startMinutes || current < endMinutes;
}

export function useNightMode(now) {
  const [override, setOverride] = useState(null);
  const automaticNight = useMemo(() => isNightTime(now), [now]);

  const activeOverride =
    override && override.expiresAt > now.getTime() ? override : null;
  const isNight = activeOverride ? activeOverride.value : automaticNight;

  // Estable para que la barra lateral (memorizada) no se repinte por ella.
  const nightRef = useRef(isNight);
  nightRef.current = isNight;
  const toggleNight = useCallback(() => {
    setOverride({
      value: !nightRef.current,
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    });
  }, []);

  return {
    isNight,
    automaticNight,
    hasOverride: Boolean(activeOverride),
    toggleNight,
  };
}
