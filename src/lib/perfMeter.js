// Medidor de fluidez para el diagnóstico: cuánto bloquea la app y cuánto
// tarda en atender un toque, medido en el propio marco. Solo escucha; no
// pinta nada ni pide fotogramas hasta que se pulsa «Medir».

const WINDOW_MS = 5 * 60 * 1000;
const MAX_TAPS = 30;

const longTasks = [];
const tapDelays = [];
let started = false;

function prune(now) {
  while (longTasks.length && now - longTasks[0].at > WINDOW_MS) longTasks.shift();
}

export function startPerfMeter() {
  if (started || typeof window === "undefined") return;
  started = true;

  // Tareas de más de 50 ms: mientras duran, la pantalla no responde.
  try {
    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          longTasks.push({ at: performance.now(), ms: entry.duration });
        });
        prune(performance.now());
      });
      observer.observe({ entryTypes: ["longtask"] });
    }
  } catch {
    // Sin Long Tasks API: el diagnóstico lo dice.
  }

  // Retraso al tocar: desde que el dedo toca hasta que la app lo atiende.
  window.addEventListener(
    "pointerdown",
    (event) => {
      const delay = performance.now() - event.timeStamp;
      if (delay >= 0 && delay < 10000) {
        tapDelays.push(delay);
        if (tapDelays.length > MAX_TAPS) tapDelays.shift();
      }
    },
    { capture: true, passive: true }
  );
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function perfSnapshot() {
  prune(performance.now());
  return {
    longTaskSupported: typeof window !== "undefined" && "PerformanceObserver" in window,
    longTasks: longTasks.length,
    longTaskWorst: longTasks.reduce((max, task) => Math.max(max, task.ms), 0),
    longTaskTotal: longTasks.reduce((sum, task) => sum + task.ms, 0),
    taps: tapDelays.length,
    tapMedian: median(tapDelays),
    tapWorst: tapDelays.reduce((max, ms) => Math.max(max, ms), 0),
  };
}

// Fotogramas por segundo durante `ms`: mide lo que da de sí el marco.
export function measureFps(ms = 3000) {
  return new Promise((resolve) => {
    let frames = 0;
    let worst = 0;
    let last = performance.now();
    const start = last;
    function tick(at) {
      frames += 1;
      worst = Math.max(worst, at - last);
      last = at;
      if (at - start < ms) window.requestAnimationFrame(tick);
      else resolve({ fps: Math.round((frames * 1000) / (at - start)), worstFrame: Math.round(worst) });
    }
    window.requestAnimationFrame(tick);
  });
}
