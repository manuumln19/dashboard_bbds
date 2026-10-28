import { useMemo, useRef } from "react";

// Versiones estables de un grupo de funciones que siempre llaman a la última
// versión. Así los hooks pueden devolver el mismo objeto entre renders (y las
// tarjetas memorizadas no se repintan) sin envolver cada función a mano.
// Las claves de `fns` no deben cambiar entre renders.
export function useStableFns(fns) {
  const latest = useRef(fns);
  latest.current = fns;
  return useMemo(() => {
    const stable = {};
    Object.keys(latest.current).forEach((name) => {
      stable[name] = (...args) => latest.current[name](...args);
    });
    return stable;
  }, []);
}
