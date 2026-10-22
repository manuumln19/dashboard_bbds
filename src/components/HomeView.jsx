import { AgendaCard } from "./AgendaCard";
import { HeroCard } from "./HeroCard";
import { HomeEnergyCard } from "./HomeEnergyCard";
import { HomeTasks } from "./HomeTasks";
import { NextEventCard } from "./NextEventCard";

export function HomeView({
  now,
  weather,
  calendar,
  lists,
  onOpenAgenda,
  onOpenLists,
  onOpenEnergy,
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
        <div className="home-stack">
          <AgendaCard
            events={calendar.events}
            now={now}
            configured={calendar.configured}
            error={calendar.error}
            onOpen={onOpenAgenda}
          />
          <HomeEnergyCard now={now} onOpen={onOpenEnergy} />
        </div>
        <HomeTasks
          items={lists.items}
          now={now}
          people={lists.people}
          onToggle={lists.toggleItem}
          onOpen={onOpenLists}
        />
      </div>
    </section>
  );
}
