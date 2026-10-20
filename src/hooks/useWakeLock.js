import { useEffect } from "react";

export function useWakeLock() {
  useEffect(() => {
    let sentinel = null;
    let disposed = false;

    async function requestWakeLock() {
      if (disposed || !("wakeLock" in navigator)) return;
      if (document.visibilityState !== "visible") return;
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // Algunos WebViews no permiten Wake Lock. La app kiosco debe mantener
        // la pantalla encendida por su cuenta.
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") requestWakeLock();
    }

    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (sentinel) sentinel.release().catch(() => {});
    };
  }, []);
}
