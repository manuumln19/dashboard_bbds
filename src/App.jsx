import { useCallback, useEffect, useState } from "react";
import {
  CLIMATE_ENABLED,
  DEMO_MODE,
  SCREENSAVER_IDLE_MS,
} from "./config";
import { formatClock } from "./lib/date";
import { useCalendar } from "./hooks/useCalendar";
import { useCleaning } from "./hooks/useCleaning";
import { useIdle } from "./hooks/useIdle";
import { useLists } from "./hooks/useLists";
import { useNightMode } from "./hooks/useNightMode";
import { useNow } from "./hooks/useNow";
import { useSensors } from "./hooks/useSensors";
import { useWakeLock } from "./hooks/useWakeLock";
import { useWeather } from "./hooks/useWeather";
import { Rail } from "./components/Rail";
import { HomeView } from "./components/HomeView";
import { AgendaView } from "./components/AgendaView";
import { ListsView } from "./components/ListsView";
import { CleaningView } from "./components/CleaningView";
import { WeatherView } from "./components/WeatherView";
import { ClimateView } from "./components/ClimateView";
import { Screensaver } from "./components/Screensaver";

const VALID_VIEWS = new Set([
  "home",
  "agenda",
  "lists",
  "cleaning",
  "weather",
  ...(CLIMATE_ENABLED ? ["climate"] : []),
]);

function readViewFromHash() {
  if (typeof window === "undefined") return "home";
  const hash = window.location.hash.replace("#", "");
  return VALID_VIEWS.has(hash) ? hash : "home";
}

export default function App() {
  const [view, setViewState] = useState(readViewFromHash);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const now = useNow(1000);
  const weather = useWeather();
  const calendar = useCalendar();
  const sensors = useSensors(CLIMATE_ENABLED);
  const lists = useLists();
  const cleaning = useCleaning(now);
  const { idle, reset: resetIdle } = useIdle(SCREENSAVER_IDLE_MS);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { isNight, toggleNight } = useNightMode(now);
  useWakeLock();

  const clock = formatClock(now);
  const screensaverOpen = galleryOpen || idle;

  const closeScreensaver = useCallback(() => {
    setGalleryOpen(false);
    resetIdle();
  }, [resetIdle]);

  const openGallery = useCallback(() => {
    resetIdle();
    setGalleryOpen(true);
  }, [resetIdle]);

  function setView(nextView) {
    if (!VALID_VIEWS.has(nextView)) return;
    setViewState(nextView);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${nextView}`);
    }
  }

  useEffect(() => {
    document.title = `${clock} · BBDS`;
  }, [clock]);

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
    (calendar.error && calendar.configured ? calendar.error : null) ||
    weather.error ||
    null;
  const loading = sensors.loading || lists.loading;

  let status;
  if (DEMO_MODE) {
    status = {
      tone: "demo",
      label: "Demo",
      title: "Datos de ejemplo; los controles se guardan en este navegador",
    };
  } else if (!online || relevantError) {
    status = {
      tone: "bad",
      label: "Sin conexión",
      title: relevantError || "El dispositivo no tiene conexión",
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
        <span className="aurora aurora--mint" />
        <span className="aurora aurora--violet" />
        <span className="aurora aurora--peach" />
        <span className="aurora aurora--blue" />
        <span className="ambient__grain" />
        <span className="ambient__rule" />
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

      <main className="app-main">
        {view === "home" ? (
          <HomeView
            now={now}
            weather={weather}
            calendar={calendar}
            lists={lists}
            onOpenAgenda={() => setView("agenda")}
            onOpenLists={() => setView("lists")}
          />
        ) : null}

        {view === "agenda" ? (
          <AgendaView
            events={calendar.events}
            now={now}
            configured={calendar.configured}
            error={calendar.error}
          />
        ) : null}

        {view === "lists" ? <ListsView lists={lists} /> : null}

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
      </main>

      <div className="screen-dim" aria-hidden="true" />

      {screensaverOpen ? (
        <Screensaver now={now} onClose={closeScreensaver} />
      ) : null}
    </div>
  );
}
