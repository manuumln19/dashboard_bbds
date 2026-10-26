import { useElectricity } from "../hooks/useElectricity";
import { TodayNext } from "./TodayNext";
import { TodayNow } from "./TodayNow";
import { TodayPower } from "./TodayPower";
import { TodayShopping } from "./TodayShopping";
import { TodayTimeline } from "./TodayTimeline";

// Hoy responde, en este orden: qué hora y qué tiempo hace, qué es lo
// siguiente que hay que saber y qué pasa hoy en casa.
export function HomeView({
  now,
  weather,
  calendar,
  lists,
  cleaning,
  onOpenAgenda,
  onOpenLists,
  onOpenEnergy,
  onOpenWeather,
}) {
  const electricity = useElectricity();

  return (
    <section className="view home-view" aria-label="Resumen de hoy">
      <div className="today-board">
        <TodayNow now={now} weather={weather.weather} onOpenWeather={onOpenWeather} />
        <TodayNext
          now={now}
          events={calendar.events}
          weather={weather.weather}
          electricity={electricity}
          cleaning={cleaning}
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
          <TodayShopping lists={lists} onOpenLists={onOpenLists} />
          <TodayPower electricity={electricity} now={now} onOpenEnergy={onOpenEnergy} />
        </div>
      </div>
    </section>
  );
}
