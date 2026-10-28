import {
  lazy,
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CLIMATE_ENABLED,
  DEMO_MODE,
  IDLE_RETURN_MINUTES,
  MENU_ENABLED,
  NIGHTLY_RELOAD_HOUR,
  SCREENSAVER_IDLE_MS,
} from "./config";
import { dayPhase, formatClock } from "./lib/date";
import { seasonFor, seasonOverride } from "./lib/season";
import { timeZoneMismatch } from "./lib/timezone";
import {
  getDemoControls,
  setDemoOffline,
  setForceStale,
  subscribeDemoControls,
} from "./lib/demoControls";
import { useCalendar } from "./hooks/useCalendar";
import { useCleaning } from "./hooks/useCleaning";
import { useElectricity } from "./hooks/useElectricity";
import { useDataHealth } from "./hooks/useFreshness";
import { useIdle } from "./hooks/useIdle";
import {
  useDemoGestures,
  useIdleReturn,
  useNightlyReload,
} from "./hooks/useKiosk";
import { useLists } from "./hooks/useLists";
import { useMenu } from "./hooks/useMenu";
import { useNightMode } from "./hooks/useNightMode";
import { useNotes } from "./hooks/useNotes";
import { useNow } from "./hooks/useNow";
import { usePhotos } from "./hooks/usePhotos";
import { useSensors } from "./hooks/useSensors";
import { useWakeLock } from "./hooks/useWakeLock";
import { useWeather } from "./hooks/useWeather";
import { Rail } from "./components/Rail";
import { SeasonContext, SeasonDecor } from "./components/SeasonDecor";
import { HomeView } from "./components/HomeView";
import { StatusBanner } from "./components/StatusBanner";
import { Yoshi, YoshiStroll, yoshiMood } from "./components/Yoshi";
import { LITE_MODE } from "./lib/perf";
import { setPollingPaused } from "./lib/polling";
import { doneCount, houseLines } from "./lib/yoshiTalk";

// Las vistas que no se usan al arrancar se descargan aparte y se precargan
// cuando el arranque ya ha terminado (ver PRELOAD_DELAY_MS).
const loadAgenda = () => import("./components/AgendaView");
const loadLists = () => import("./components/ListsView");
const loadCleaning = () => import("./components/CleaningView");
const loadWeather = () => import("./components/WeatherView");
const loadClimate = () => import("./components/ClimateView");
const loadEnergy = () => import("./components/EnergyView");
const loadScreensaver = () => import("./components/Screensaver");
// Paneles de demo y diagnóstico: casi nunca se abren; fuera del arranque.
const loadDemoPanel = () => import("./components/DemoPanel");

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
const Screensaver = lazy(() =>
  loadScreensaver().then((module) => ({ default: module.Screensaver }))
);
const DemoPanel = lazy(() =>
  loadDemoPanel().then((module) => ({ default: module.DemoPanel }))
);
const Diagnostics = lazy(() =>
  loadDemoPanel().then((module) => ({ default: module.Diagnostics }))
);

// En el marco, descargar y compilar una vista al tocarla añade cientos de ms.
const PRELOAD_DELAY_MS = 8000;
const PRELOADERS = [
  loadAgenda,
  loadLists,
  loadCleaning,
  loadWeather,
  loadEnergy,
  loadScreensaver,
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
  // La pestaña marcada cambia al instante; la vista, como transición: React
  // mantiene la anterior mientras prepara la nueva (sin el «Abriendo…»).
  const [railView, setRailView] = useState(view);
  // Hoy se monta la primera vez que se visita y ya no se desmonta.
  const [homeMounted, setHomeMounted] = useState(view === "home");
  useEffect(() => {
    if (view === "home") setHomeMounted(true);
  }, [view]);
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
  const menu = useMenu(MENU_ENABLED);
  // Aquí y no en Hoy: al volver a Hoy no se vuelven a pedir ni a pintar dos veces.
  const electricity = useElectricity();
  const notes = useNotes();
  // Memorizados: objetos nuevos en cada render repintaban todo Hoy y la barra.
  const season = useMemo(() => seasonOverride() || seasonFor(now, cleaning.people), [now, cleaning.people]);
  const { idle, reset: resetIdle } = useIdle(idleMs);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { isNight, toggleNight } = useNightMode(now);
  const dataHealth = useDataHealth(effectiveOnline, now, {
    climateEnabled: CLIMATE_ENABLED,
  });
  const zoneIssue = useMemo(() => (DEMO_MODE ? null : timeZoneMismatch(now)), [now]);
  const health = useMemo(() => zoneIssue
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
    : dataHealth, [zoneIssue, dataHealth]);

  const setView = useCallback((nextView) => {
    if (!VALID_VIEWS.has(nextView)) return;
    setRailView(nextView);
    startTransition(() => setViewState(nextView));
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${nextView}`);
    }
  }, []);

  const goHome = useCallback(() => setView("home"), [setView]);
  const openAgenda = useCallback(() => setView("agenda"), [setView]);
  const openLists = useCallback(() => setView("lists"), [setView]);
  const openEnergy = useCallback(() => setView("energy"), [setView]);
  const openWeather = useCallback(() => setView("weather"), [setView]);
  const openCleaning = useCallback(() => setView("cleaning"), [setView]);

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

  // Con el salvapantallas abierto no se sondea (Hoy sigue montado debajo).
  useEffect(() => {
    setPollingPaused(screensaverOpen);
  }, [screensaverOpen]);

  // Yoshi: saluda al volver y, de día, sale de paseo cada 25–45 minutos. En
  // el marco (modo ligero) no pasea: cruzar la pantalla animado cuesta mucho.
  const [strolling, setStrolling] = useState(false);
  const [yoshiGreet, setYoshiGreet] = useState(0);
  const startStroll = useCallback(() => setStrolling(true), []);
  const endStroll = useCallback(() => {
    setStrolling(false);
    setYoshiGreet((count) => count + 1);
  }, []);

  useEffect(() => {
    if (LITE_MODE || isNight || strolling || screensaverOpen) return undefined;
    const timer = window.setTimeout(startStroll, (25 + Math.random() * 20) * 60000);
    return () => window.clearTimeout(timer);
  }, [isNight, strolling, screensaverOpen, startStroll]);

  const closeScreensaver = useCallback(() => {
    setGalleryOpen(false);
    resetIdle();
    goHome();
    setYoshiGreet((count) => count + 1);
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
      setRailView(nextView);
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

  const status = useMemo(() => {
    if (DEMO_MODE) {
      return {
        tone: "demo",
        label: "Demo",
        title: "Datos de ejemplo; los controles se guardan en este navegador",
      };
    }
    if (!effectiveOnline || relevantError) {
      return {
        tone: "bad",
        label: effectiveOnline ? "Revisar" : "Sin conexión",
        title:
          relevantError ||
          (!effectiveOnline
            ? "El dispositivo no tiene conexión"
            : "Hay datos que no se han podido actualizar"),
      };
    }
    if (loading) return { tone: "good", label: "Sincronizando" };
    return { tone: "good", label: "En línea" };
  }, [effectiveOnline, relevantError, loading]);

  // Yoshi vive en la tarjeta «Lo siguiente» de Hoy (en la barra tapaba el menú
  // en el marco). Elemento memorizado: uno nuevo en cada render repintaba Hoy.
  const yoshiMoodNow = yoshiMood({ now, weather: weather.weather, isNight });
  // Semana de limpieza completa: Yoshi luce el trofeo en Hoy hasta el lunes
  // (dormido, no: de noche duerme).
  const yoshiTrophy = cleaning.weekComplete && yoshiMoodNow !== "sleep";
  const yoshiCheer = cleaning.loading || lists.loading ? null : doneCount({ cleaning, lists });
  const yoshiHouse = useMemo(
    () => houseLines({ now, cleaning, events: calendar.events, lists }),
    [now, cleaning, calendar.events, lists]
  );
  const homeVisible = view === "home";
  const mascot = useMemo(
    () => (
      <Yoshi
        lively={homeVisible}
        mood={yoshiMoodNow}
        seasonId={season.id}
        holding={yoshiTrophy ? "trophy" : null}
        cheer={yoshiCheer}
        house={yoshiHouse}
        main
        greet={yoshiGreet}
        away={strolling}
        onWander={LITE_MODE ? undefined : startStroll}
        size={136}
      />
    ),
    [homeVisible, yoshiMoodNow, yoshiTrophy, season.id, yoshiCheer, yoshiHouse, yoshiGreet, strolling, startStroll]
  );

  return (
    <SeasonContext.Provider value={season.id}>
    <div
      className={`app app--${view} season-${season.id} phase-${dayPhase(now)}${isNight ? " is-night" : ""}`}
      data-view={view}
    >
      <div className="ambient" aria-hidden="true">
        <span className="ambient__grain" />
      </div>

      <SeasonDecor seasonId={season.id} />

      <Rail
        now={now}
        view={railView}
        onChange={setView}
        isNight={isNight}
        onToggleNight={toggleNight}
        onOpenGallery={openGallery}
        status={status}
        seasonId={season.id}
      />
      {strolling ? <YoshiStroll onDone={endStroll} /> : null}

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
          {/* Hoy no se desmonta al cambiar de vista: se oculta. Volver a Hoy es
              inmediato (antes se reconstruía entera, ~150–300 ms en el marco). */}
          {homeMounted ? (
            <HomeView
              hidden={view !== "home"}
              night={isNight}
              wake={yoshiGreet}
              now={now}
              weather={weather}
              calendar={calendar}
              lists={lists}
              cleaning={cleaning}
              electricity={electricity}
              notes={notes}
              season={season}
              menu={MENU_ENABLED ? menu : null}
              mascot={mascot}
              mascotMood={yoshiMoodNow}
              onOpenAgenda={openAgenda}
              onOpenLists={openLists}
              onOpenEnergy={openEnergy}
              onOpenWeather={openWeather}
              onOpenCleaning={openCleaning}
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

          {view === "lists" ? <ListsView lists={lists} menu={menu} now={now} /> : null}

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

      {screensaverOpen ? (
        <Suspense fallback={null}>
          <Screensaver
            now={now}
            onClose={closeScreensaver}
            isNight={isNight}
            photos={photos}
            weather={weather.weather}
            events={calendar.events}
          />
        </Suspense>
      ) : null}

      {DEMO_MODE && demoOpen ? (
        <Suspense fallback={null}>
          <DemoPanel
            open
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
        </Suspense>
      ) : null}

      {diagOpen ? (
        <Suspense fallback={null}>
          <Diagnostics
            open
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
        </Suspense>
      ) : null}
    </div>
    </SeasonContext.Provider>
  );
}
