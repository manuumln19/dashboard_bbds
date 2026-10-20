import { useEffect } from "react";
import { DEMO_MODE } from "../config";

const NIGHTLY_KEY = "bbds.nightlyReload";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

// Una recarga al día mantiene el WebView fresco sin depender de que alguien
// toque la pantalla. Si el aparato estuvo suspendido, se recupera al volver.
export function useNightlyReload(hour = 3) {
  useEffect(() => {
    if (DEMO_MODE) return undefined;
    if (!Number.isFinite(hour)) return undefined;

    let timer = null;
    let next = null;

    function schedule() {
      const now = new Date();
      const target = new Date(now);
      target.setHours(hour, 0, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      next = target;
      const delay = Math.min(
        Math.max(0, target.getTime() - now.getTime()),
        2147483647
      );
      timer = window.setTimeout(() => {
        try {
          window.sessionStorage.setItem(NIGHTLY_KEY, todayKey());
        } catch {
          // Sin sessionStorage, se recarga igualmente.
        }
        window.location.reload();
      }, delay);
    }

    function handleVisibility() {
      if (document.visibilityState !== "visible" || !next) return;
      if (Date.now() < next.getTime()) return;
      let last = null;
      try {
        last = window.sessionStorage.getItem(NIGHTLY_KEY);
      } catch {
        last = null;
      }
      if (last === todayKey()) {
        window.clearTimeout(timer);
        schedule();
        return;
      }
      try {
        window.sessionStorage.setItem(NIGHTLY_KEY, todayKey());
      } catch {
        // Sin storage, se recarga una vez y se vuelve a programar.
      }
      window.location.reload();
    }

    schedule();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hour]);
}

// Tras un rato sin interacción, la pantalla vuelve a Hoy. El salvapantallas
// puede estar tapando la vista: al cerrarlo se encuentra ya en el resumen.
export function useIdleReturn(view, onHome, minutes = 10) {
  useEffect(() => {
    if (!minutes || minutes <= 0) return undefined;
    let timer = null;

    function arm() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (view !== "home") onHome();
      }, minutes * 60 * 1000);
    }

    const events = ["pointerdown", "keydown", "wheel", "touchstart"];
    events.forEach((name) =>
      window.addEventListener(name, arm, { passive: true })
    );
    arm();
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, arm));
    };
  }, [view, onHome, minutes]);
}

// Gestos discretos para la pantalla de pared: mantener pulsado el reloj o
// pulsar D abre el panel de pruebas. ?diag abre el diagnóstico directamente.
export function useDemoGestures({ onOpen, onDiagnostics }) {
  useEffect(() => {
    let holdTimer = null;

    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      const tag = target && target.tagName ? target.tagName : "";
      if (
        /^(INPUT|TEXTAREA|SELECT)$/.test(tag) ||
        (target && target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "d" || event.key === "D") {
        event.preventDefault();
        onOpen();
      }
      if (event.shiftKey && (event.key === "i" || event.key === "I")) {
        event.preventDefault();
        onDiagnostics();
      }
    }

    function onPointerDown(event) {
      const target = event.target;
      if (
        target &&
        target.closest &&
        target.closest(".rail__clock")
      ) {
        window.clearTimeout(holdTimer);
        holdTimer = window.setTimeout(onOpen, 1600);
      }
    }

    function onPointerUp() {
      window.clearTimeout(holdTimer);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);
    return () => {
      window.clearTimeout(holdTimer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
    };
  }, [onOpen, onDiagnostics]);
}
