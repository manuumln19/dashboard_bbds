import { useCallback, useEffect, useRef, useState } from "react";

const KEEP_MS = 4000;

// En Hoy, lo que se marca como hecho desaparece de la lista. Sin una pausa
// parecía que el toque no había funcionado: se deja a la vista, marcado y
// tachado, unos segundos antes de irse.
export function useRecentlyDone() {
  const [ids, setIds] = useState(() => new Set());
  const timers = useRef(new Map());

  const mark = useCallback((id) => {
    setIds((current) => new Set(current).add(id));
    window.clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      window.setTimeout(() => {
        timers.current.delete(id);
        setIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }, KEEP_MS)
    );
  }, []);

  const forget = useCallback((id) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return { ids, mark, forget };
}
