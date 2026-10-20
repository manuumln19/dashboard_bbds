import { useCallback, useEffect, useRef, useState } from "react";

const WAKE_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];

// Devuelve `idle` y una función para reiniciar el contador desde fuera.
// No escucha `pointermove` a propósito: en una pantalla de pared el roce de
// una manga no debería cerrar el salvapantallas.
export function useIdle(timeoutMs) {
  const [idle, setIdle] = useState(false);
  const timer = useRef(null);

  const reset = useCallback(() => {
    setIdle(false);
    window.clearTimeout(timer.current);
    if (timeoutMs > 0) {
      timer.current = window.setTimeout(() => setIdle(true), timeoutMs);
    }
  }, [timeoutMs]);

  useEffect(() => {
    reset();
    function wake() {
      reset();
    }
    WAKE_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, wake, { passive: true })
    );
    function handleVisibility() {
      if (document.visibilityState === "visible") reset();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearTimeout(timer.current);
      WAKE_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, wake)
      );
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [reset]);

  return { idle, reset };
}
