import { useEffect, useState } from "react";

// Avanza justo al cambiar cada múltiplo de `interval` (con 60 s, al cambiar
// el minuto). Cada tic repinta toda la app, que en el marco cuesta ~150 ms,
// así que no conviene hacerlo más a menudo de lo que cambia el reloj.
export function useNow(interval = 1000, offsetMs = 0) {
  const [now, setNow] = useState(() => new Date(Date.now() + offsetMs));

  useEffect(() => {
    let timer = null;

    function tick() {
      const current = Date.now() + offsetMs;
      setNow(new Date(current));
      timer = window.setTimeout(tick, interval - (current % interval) + 50);
    }

    function handleVisibility() {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(timer);
      tick();
    }

    tick();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [interval, offsetMs]);

  return now;
}
