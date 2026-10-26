import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CLIMATE_ENABLED,
  DEMO_MODE,
  IDLE_RETURN_MINUTES,
  NIGHTLY_RELOAD_HOUR,
  SCREENSAVER_IDLE_MS,
} from "./config";
import { formatClock } from "./lib/date";
import { timeZoneMismatch } from "./lib/timezone";
import {
  getDemoControls,
  setDemoOffline,
  setForceStale,
  subscribeDemoControls,
} from "./lib/demoControls";
import { useCalendar } from "./hooks/useCalendar";
import { useCleaning } from "./hooks/useCleaning";
import { useDataHealth } from "./hooks/useFreshness";
import { useIdle } from "./hooks/useIdle";
import {
  useDemoGestures,
  useIdleReturn,
  useNightlyReload,
} from "./hooks/useKiosk";
import { useLists } from "./hooks/useLists";
import { useNightMode } from "./hooks/useNightMode";
import { useNow } from "./hooks/useNow";
import { usePhotos } from "./hooks/usePhotos";
import { useSensors } from "./hooks/useSensors";
import { useWakeLock } from "./hooks/useWakeLock";
import { useWeather } from "./hooks/useWeather";
import { DemoPanel, Diagnostics } from "./components/DemoPanel";
import { Rail } from "./components/Rail";
import { HomeView } from "./components/HomeView";
import { Screensaver } from "./components/Screensaver";
import { StatusBanner } from "./components/StatusBanner";

// Las vistas que no se usan al arrancar se descargan aparte y se precargan
// cuando el arranque ya ha terminado (ver PRELOAD_DELAY_MS).
const loadAgenda = () => import("./components/AgendaView");
const loadLists = () => import("./components/ListsView");
const loadCleaning = () => import("./components/CleaningView");
const loadWeather = () => import("./components/WeatherView");
const loadClimate = () => import("./components/ClimateView");
const loadEnergy = () => import("./components/EnergyView");

const AgendaView = lazy(() =>
  loadAgenda().then((module) => ({ default: module.AgendaView }))
);
const ListsView = lazy(() =>
  loadLists().then((module) => ({ default: module.ListsView }))
);
const CleaningView = lazy(() =>
  loadCleaning().then((module) => ({ default: module.CleaningView }))
);
const WeatherView = lazy(() =>
  loadWeather().then((module) => ({ default: module.WeatherView }))
);
const ClimateView = lazy(() =>
  loadClimate().then((module) => ({ default: module.ClimateView }))
);
const EnergyView = lazy(() =>
  loadEnergy().then((module) => ({ default: module.EnergyView }))
);

// En el marco, descargar y compilar una vista al tocarla añade cientos de ms.
const PRELOAD_DELAY_MS = 8000;
const PRELOADERS = [
  loadAgenda,
  loadLists,
  loadCleaning,
  loadWeather,
  loadEnergy,
  ...(CLIMATE_ENABLED ? [loadClimate] : []),
];

const VALID_VIEWS = new Set([
  "home",
  "agenda",
  "lists",
  "cleaning",
  "weather",
  "energy",
  ...(CLIMATE_ENABLED ? ["climate"] : []),
]);

function readViewFromHash() {
  if (typeof window === "undefined") return "home";
  const hash = window.location.hash.replace("#", "");
  return VALID_VIEWS.has(hash) ? hash : "home";
}

function readQueryFlag(name) {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has(name);
}

export default function App() {
  const [view, setViewState] = useState(readViewFromHash);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [timeOffset, setTimeOffset] = useState(0);
  const [idleMs, setIdleMs] = useState(SCREENSAVER_IDLE_MS);
  const [demoOpen, setDemoOpen] = useState(
    () => DEMO_MODE && readQueryFlag("demo")
  );
  const [diagOpen, setDiagOpen] = useState(() => readQueryFlag("diag"));
  const demoControls = useSyncExternalStore(
    subscribeDemoControls,
    getDemoControls,
    getDemoControls
  );
  const effectiveOnline = online && !demoControls.offline;
  const now = useNow(60000, timeOffset);
  const weather = useWeather();
  const calendar = useCalendar();
  const sensors = useSensors(CLIMATE_ENABLED);
  const lists = useLists();
  const cleaning = useCleaning(now);
  const { idle, reset: resetIdle } = useIdle(idleMs);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { isNight, toggleNight } = useNightMode(now);
  const dataHealth = useDataHealth(effectiveOnline, now, {
    climateEnabled: CLIMATE_ENABLED,
  });
  const zoneIssue = DEMO_MODE ? null : timeZoneMismatch(now);
  const health = zoneIssue
    ? {
        ...dataHealth,
        issues: [
          ...dataHealth.issues,
          {
            id: "timezone",
            label: "Hora del aparato",
            detail: `Está en ${zoneIssue.device || "otra zona"} y no en ${
              zoneIssue.expected
            }: la hora y la agenda salen desplazadas. Cámbialo en Ajustes de Android → Fecha y hora.`,
          },
        ],
      }
    : dataHealth;

  const setView = useCallback((nextView) => {
    if (!VALID_VIEWS.has(nextView)) return;
    setViewState(nextView);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${nextView}`);
    }
  }, []);

  const goHome = useCallback(() => setView("home"), [setView]);

  useWakeLock();
  useNightlyReload(NIGHTLY_RELOAD_HOUR);
  useIdleReturn(view, goHome, IDLE_RETURN_MINUTES);

  const openDemo = useCallback(() => {
    setDiagOpen(false);
    setDemoOpen(true);
  }, []);

  const openDiagnostics = useCallback(() => {
    setDemoOpen(false);
    setDiagOpen(true);
  }, []);

  // Fuera de la demo, el gesto del reloj abre el diagnóstico: el panel de
  // pruebas (hora simulada, sin conexión…) solo confunde en la pantalla real.
  useDemoGestures({
    onOpen: DEMO_MODE ? openDemo : openDiagnostics,
    onDiagnostics: openDiagnostics,
  });

  const clock = formatClock(now);
  const screensaverOpen = galleryOpen || idle;
  const photos = usePhotos(screensaverOpen);

  const closeScreensaver = useCallback(() => {
    setGalleryOpen(false);
    resetIdle();
    goHome();
  }, [resetIdle, goHome]);

  const openGallery = useCallback(() => {
    resetIdle();
    setGalleryOpen(true);
  }, [resetIdle]);

  useEffect(() => {
    document.title = `${clock} · BBDS`;
  }, [clock]);

  // En el kiosco del marco, el modo noche baja también el brillo real de la
  // pantalla; con el salvapantallas nocturno (solo hora) aún más.
  useEffect(() => {
    const kiosk = window.BBDSKiosk;
    if (!kiosk || typeof kiosk.setBrightness !== "function") return;
    kiosk.setBrightness(!isNight ? -1 : screensaverOpen ? 0.03 : 0.12);
  }, [isNight, screensaverOpen]);

  // Una vista por tarea para no bloquear la pantalla mientras se compila.
  useEffect(() => {
    let cancelled = false;
    let timer = window.setTimeout(function next(index = 0) {
      if (cancelled || index >= PRELOADERS.length) return;
      PRELOADERS[index]()
        .catch(() => {})
        .then(() => {
          timer = window.setTimeout(() => next(index + 1), 400);
        });
    }, PRELOAD_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // `?demo` y `?diag` abren una vez; la URL vuelve a quedar limpia para que
  // una recarga nocturna no vuelva a abrir los controles.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("demo") && !params.has("diag")) return;
    params.delete("demo");
    params.delete("diag");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${
        window.location.hash
      }`
    );
  }, []);

  useEffect(() => {
    function goOnline() {
      setOnline(true);
    }
    function goOffline() {
      setOnline(false);
    }
    function syncViewFromHash() {
      const nextView = readViewFromHash();
      setViewState(nextView);
      if (window.location.hash !== `#${nextView}`) {
        window.history.replaceState(null, "", `#${nextView}`);
      }
    }
    syncViewFromHash();
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("hashchange", syncViewFromHash);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("hashchange", syncViewFromHash);
    };
  }, []);

  const relevantError =
    sensors.error ||
    lists.error ||
    cleaning.error ||
    (calendar.error && calendar.configured ? calendar.error : null) ||
    weather.error ||
    null;
  const loading = sensors.loading || lists.loading || cleaning.loading;

  let status;
  if (DEMO_MODE) {
    status = {
      tone: "demo",
      label: "Demo",
      title: "Datos de ejemplo; los controles se guardan en este navegador",
    };
  } else if (!effectiveOnline || relevantError) {
    status = {
      tone: "bad",
      label: effectiveOnline ? "Revisar" : "Sin conexión",
      title:
        relevantError ||
        (!effectiveOnline
          ? "El dispositivo no tiene conexión"
          : "Hay datos que no se han podido actualizar"),
    };
  } else if (loading) {
    status = { tone: "good", label: "Sincronizando" };
  } else {
    status = { tone: "good", label: "En línea" };
  }

  return (
    <div
      className={`app app--${view}${isNight ? " is-night" : ""}`}
      data-view={view}
    >
      <div className="ambient" aria-hidden="true">
        <span className="ambient__grain" />
      </div>

      <Rail
        now={now}
        view={view}
        onChange={setView}
        isNight={isNight}
        onToggleNight={toggleNight}
        onOpenGallery={openGallery}
        status={status}
      />

      <StatusBanner
        online={effectiveOnline}
        health={health}
        onOpenDiagnostics={openDiagnostics}
      />

      <main className="app-main">
        <Suspense
          fallback={
            <div className="view-loading" role="status">
              Abriendo la página…
            </div>
          }
        >
          {view === "home" ? (
            <HomeView
              now={now}
              weather={weather}
              calendar={calendar}
              lists={lists}
              cleaning={cleaning}
              onOpenAgenda={() => setView("agenda")}
              onOpenLists={() => setView("lists")}
              onOpenEnergy={() => setView("energy")}
              onOpenWeather={() => setView("weather")}
            />
          ) : null}

          {view === "agenda" ? (
            <AgendaView
              events={calendar.events}
              now={now}
              configured={calendar.configured}
              error={calendar.error}
              calendar={calendar}
              people={lists.people}
            />
          ) : null}

          {view === "lists" ? <ListsView lists={lists} now={now} /> : null}

          {view === "cleaning" ? (
            <CleaningView now={now} cleaning={cleaning} />
          ) : null}

          {view === "weather" ? (
            <WeatherView
              now={now}
              weather={weather.weather}
              error={weather.error}
              loading={weather.loading}
            />
          ) : null}

          {view === "energy" ? <EnergyView now={now} /> : null}

          {CLIMATE_ENABLED && view === "climate" ? (
            <ClimateView
              latest={sensors.latest}
              history24={sensors.history24}
              history7={sensors.history7}
              weather={weather.weather}
              now={now}
              error={sensors.error}
            />
          ) : null}
        </Suspense>
      </main>

      <div className="screen-dim" aria-hidden="true" />

      {screensaverOpen ? (
        <Screensaver
          now={now}
          onClose={closeScreensaver}
          isNight={isNight}
          photos={photos}
        />
      ) : null}

      <DemoPanel
        open={DEMO_MODE && demoOpen}
        onClose={() => setDemoOpen(false)}
        timeOffset={timeOffset}
        onTimeOffset={setTimeOffset}
        idleMs={idleMs}
        defaultIdleMs={SCREENSAVER_IDLE_MS}
        onIdleMs={setIdleMs}
        demoOffline={demoControls.offline}
        onDemoOffline={setDemoOffline}
        forceStale={demoControls.forceStale}
        onForceStale={setForceStale}
        onOpenDiagnostics={openDiagnostics}
      />

      <Diagnostics
        open={diagOpen}
        onClose={() => setDiagOpen(false)}
        data={{
          online: effectiveOnline,
          demoOffline: demoControls.offline,
          view,
          now,
          freshness: dataHealth.freshness,
        }}
        onOpenDemo={openDemo}
      />
    </div>
  );
}
