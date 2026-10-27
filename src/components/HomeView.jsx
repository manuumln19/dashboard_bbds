import { useEffect, useState } from "react";
import { useElectricity } from "../hooks/useElectricity";
import { useNotes } from "../hooks/useNotes";
import { TodayCrew } from "./TodayCrew";
import { TodayNotes } from "./TodayNotes";
import { TodayNext } from "./TodayNext";
import { TodayNow } from "./TodayNow";
import { TodayPower } from "./TodayPower";
import { TodayShopping } from "./TodayShopping";
import { TodayTimeline } from "./TodayTimeline";
import { summaryDue, WeeklySummary } from "./WeeklySummary";

// Hoy responde, en este orden: qué hora y qué tiempo hace, qué es lo
// siguiente que hay que saber y qué pasa hoy en casa.
export function HomeView({
  now,
  weather,
  calendar,
  lists,
  cleaning,
  season,
  menu,
  onOpenAgenda,
  onOpenLists,
  onOpenEnergy,
  onOpenWeather,
  onOpenCleaning,
}) {
  const electricity = useElectricity();
  const notes = useNotes();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const due = !cleaning.loading && summaryDue(now, cleaning.weekKey);

  useEffect(() => {
    if (due) setSummaryOpen(true);
  }, [due]);

  return (
    <section className="view home-view" aria-label="Resumen de hoy">
      <div className="today-board">
        <TodayNow
          now={now}
          weather={weather.weather}
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
          onOpenAgenda={onOpenAgenda}
        />
        <TodayTimeline
          now={now}
          events={calendar.events}
          lists={lists}
          cleaning={cleaning}
          onOpenAgenda={onOpenAgenda}
          onOpenLists={onOpenLists}
        />
        <div className="today-side">
          <TodayCrew
            now={now}
            cleaning={cleaning}
            lists={lists}
            onOpenCleaning={onOpenCleaning}
            onOpenSummary={() => setSummaryOpen(true)}
          />
          <TodayShopping lists={lists} onOpenLists={onOpenLists}>
            <TodayNotes notes={notes} people={cleaning.people} now={now} />
          </TodayShopping>
          <TodayPower electricity={electricity} now={now} onOpenEnergy={onOpenEnergy} />
        </div>
      </div>
      {summaryOpen ? (
        <WeeklySummary
          now={now}
          cleaning={cleaning}
          lists={lists}
          events={calendar.events}
          seasonId={season ? season.id : null}
          onClose={() => setSummaryOpen(false)}
        />
      ) : null}
    </section>
  );
}
