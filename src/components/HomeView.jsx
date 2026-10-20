import { AgendaCard } from "./AgendaCard";
import { HeroCard } from "./HeroCard";
import { HomeTasks } from "./HomeTasks";
import { NextEventCard } from "./NextEventCard";

export function HomeView({
  now,
  weather,
  calendar,
  lists,
  onOpenAgenda,
  onOpenLists,
}) {
  return (
    <section className="view home-view" aria-label="Resumen de hoy">
      <div className="home-board">
        <HeroCard now={now} weather={weather.weather} />
        <NextEventCard
          events={calendar.events}
          now={now}
          onOpen={onOpenAgenda}
        />
        <AgendaCard
          events={calendar.events}
          now={now}
          configured={calendar.configured}
          error={calendar.error}
          onOpen={onOpenAgenda}
        />
        <HomeTasks
          items={lists.items}
          onToggle={lists.toggleItem}
          onOpen={onOpenLists}
        />
      </div>
    </section>
  );
}
