import { useCallback, useEffect, useRef, useState } from "react";

// Sin `touchstart`: en pantalla táctil ya llega `pointerdown` y se reiniciaba
// dos veces por toque.
const WAKE_EVENTS = ["pointerdown", "keydown", "wheel"];

// Devuelve `idle` y una función para reiniciar el contador desde fuera.
// No escucha `pointermove` a propósito: en una pantalla de pared el roce de
// una manga no debería cerrar el salvapantallas.
export function useIdle(timeoutMs) {
  const [idle, setIdle] = useState(false);
  const idleRef = useRef(false);
  const timer = useRef(null);

  // Solo se toca el estado si de verdad cambia: cada setState, aunque sea al
  // mismo valor, podía volver a ejecutar App entera tras un toque.
  const reset = useCallback(() => {
    if (idleRef.current) {
      idleRef.current = false;
      setIdle(false);
    }
    window.clearTimeout(timer.current);
    if (timeoutMs > 0) {
      timer.current = window.setTimeout(() => {
        idleRef.current = true;
        setIdle(true);
      }, timeoutMs);
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
