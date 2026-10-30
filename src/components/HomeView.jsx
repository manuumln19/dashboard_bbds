import { lazy, memo, Suspense, useCallback, useEffect, useState } from "react";
import { HomeNotes, NoteComposer } from "./HomeNotes";
import { markMorningBrief, MorningBrief, morningBriefDue } from "./MorningBrief";
import { dismissMorning, isMorningTime, MorningHome, morningDismissed } from "./MorningHome";
import { NightHome } from "./NightHome";
import { TodayNext } from "./TodayNext";
import { TodayNow } from "./TodayNow";
import { TodayShopping } from "./TodayShopping";
import { TodayStrip } from "./TodayStrip";
import { TodayTimeline } from "./TodayTimeline";
import { YoshiWindow } from "./YoshiWindow";
import { summaryDue } from "../lib/summary";

const HIDDEN = { display: "none" };

// El resumen se abre poco: se descarga al abrirlo, no al arrancar.
const WeeklySummary = lazy(() =>
  import("./WeeklySummary").then((module) => ({ default: module.WeeklySummary }))
);

// Hoy responde, en este orden: qué hora y qué tiempo hace, qué es lo
// siguiente que hay que saber y qué pasa hoy en casa.
export const HomeView = memo(function HomeView({
  now,
  weather,
  calendar,
  lists,
  cleaning,
  electricity,
  notes,
  pointEvents,
  season,
  menu,
  bills,
  mascot,
  mascotMood,
  onOpenAgenda,
  onOpenLists,
  onOpenEnergy,
  onOpenWeather,
  onOpenCleaning,
  onOpenBills,
  hidden = false,
  night = false,
  onWakeNight,
  wake = 0,
}) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [writing, setWriting] = useState(false);
  // Estables: las tarjetas van memorizadas y una función nueva las repintaba.
  const openSummary = useCallback(() => setSummaryOpen(true), []);
  const closeSummary = useCallback(() => setSummaryOpen(false), []);
  const openWriting = useCallback(() => setWriting(true), []);
  const closeWriting = useCallback(() => setWriting(false), []);
  // Tres momentos: la mañana (salir de casa), el día (el panel de siempre) y
  // la noche (NightHome). «Ver todo el día» quita la mañana hasta mañana.
  const [morningOff, setMorningOff] = useState(() => morningDismissed(new Date()));
  const morningTime = isMorningTime(now);
  const morning = !night && morningTime && !morningOff;
  const showDay = useCallback(() => {
    dismissMorning(new Date());
    setMorningOff(true);
  }, []);
  useEffect(() => {
    if (!morningTime && morningOff) setMorningOff(false);
  }, [morningTime, morningOff]);
  // Solo con Hoy a la vista: oculta, no debe abrirse encima de otra vista.
  const due = !hidden && !cleaning.loading && summaryDue(now, cleaning.weekKey);

  useEffect(() => {
    if (due) setSummaryOpen(true);
  }, [due]);

  // «Buenos días» de Yoshi: al arrancar o al despertar la pantalla, una vez
  // al día por la mañana y con Hoy a la vista.
  const [briefOpen, setBriefOpen] = useState(false);
  const closeBrief = useCallback(() => setBriefOpen(false), []);
  useEffect(() => {
    const at = new Date();
    if (hidden || night || !morningBriefDue(at)) return;
    markMorningBrief(at);
    // La pantalla de mañana ya cuenta el día: sin hoja encima.
    if (!morning) setBriefOpen(true);
  }, [wake, hidden, night, morning]);

  return (
    <section
      className="view home-view"
      aria-label="Resumen de hoy"
      aria-hidden={hidden || undefined}
      style={hidden ? HIDDEN : undefined}
    >
      {night ? (
        <NightHome
          now={now}
          weather={weather.weather}
          events={calendar.events}
          cleaning={cleaning}
          mascot={mascot}
          onWake={onWakeNight}
        />
      ) : morning ? (
        <MorningHome
          now={now}
          weather={weather.weather}
          events={calendar.events}
          lists={lists}
          cleaning={cleaning}
          season={season}
          onShowDay={showDay}
        />
      ) : (
        <div className="today-board">
          <TodayNow
            now={now}
            weather={weather.weather}
            events={calendar.events}
            season={season}
            lists={lists}
            cleaning={cleaning}
            onOpenWeather={onOpenWeather}
          />
          <TodayNext
            now={now}
            events={calendar.events}
            weather={weather.weather}
            electricity={electricity}
            cleaning={cleaning}
            lists={lists}
            menu={menu}
            bills={bills}
            onOpenAgenda={onOpenAgenda}
            onOpenBills={onOpenBills}
          />
          <YoshiWindow now={now} weather={weather.weather} mood={mascotMood} mascot={mascot} season={season} />
          <TodayTimeline
            now={now}
            events={calendar.events}
            lists={lists}
            cleaning={cleaning}
            onOpenAgenda={onOpenAgenda}
            onOpenLists={onOpenCleaning}
          />
          <div className="today-side">
            <TodayShopping lists={lists} onOpenLists={onOpenLists} onWriteNote={openWriting} />
          </div>
          <TodayStrip
            now={now}
            cleaning={cleaning}
            lists={lists}
            electricity={electricity}
            pointEvents={pointEvents}
            onOpenCleaning={onOpenCleaning}
            onOpenSummary={openSummary}
            onOpenEnergy={onOpenEnergy}
          />
        </div>
      )}
      {/* De noche y de mañana, sin pósits: la pantalla tranquila. */}
      {night || morning ? null : <HomeNotes notes={notes} people={cleaning.people} now={now} />}
      {writing ? <NoteComposer notes={notes} people={cleaning.people} onClose={closeWriting} /> : null}
      {briefOpen ? (
        <MorningBrief
          now={now}
          weather={weather.weather}
          events={calendar.events}
          cleaning={cleaning}
          electricity={electricity}
          onClose={closeBrief}
        />
      ) : null}
      {summaryOpen ? (
        <Suspense fallback={null}>
          <WeeklySummary
            now={now}
            cleaning={cleaning}
            lists={lists}
            events={calendar.events}
            pointEvents={pointEvents}
            seasonId={season ? season.id : null}
            onClose={closeSummary}
          />
        </Suspense>
      ) : null}
    </section>
  );
});
