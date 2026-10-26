import { CalendarDays, Sparkles, SprayCan, Umbrella, Zap } from "lucide-react";
import { getWeatherAdvice } from "../lib/weather";
import { nextItems } from "../lib/today";

const ICONS = {
  event: CalendarDays,
  rain: Umbrella,
  cleaning: SprayCan,
  power: Zap,
};

const KIND_TONES = { rain: "lilac", cleaning: "mint", power: "amber" };

// Una sola tarjeta de color: lo más importante ahora, y debajo lo demás.
export function TodayNext({ now, events, weather, electricity, cleaning, onOpenAgenda }) {
  const items = nextItems({ now, events, weather, electricity, cleaning });
  const [lead, ...rest] = items;

  if (!lead) {
    const advice = getWeatherAdvice(weather, now);
    return (
      <article className="card today-next tone-mint" aria-label="Lo siguiente">
        <span className="today-next__kicker">Lo siguiente</span>
        <strong className="today-next__title">Todo tranquilo</strong>
        <span className="today-next__detail">
          <Sparkles size={15} strokeWidth={1.9} aria-hidden="true" />
          {advice.title}. {advice.detail}
        </span>
      </article>
    );
  }

  const LeadIcon = ICONS[lead.kind] || Sparkles;
  return (
    <article
      className={`card today-next tone-${lead.tone || KIND_TONES[lead.kind] || "ink"}`}
      aria-label="Lo siguiente"
    >
      <button type="button" className="today-next__lead" onClick={onOpenAgenda}>
        <span className="today-next__kicker">
          <LeadIcon size={14} strokeWidth={2} aria-hidden="true" />
          {lead.kicker}
        </span>
        <strong className="today-next__title">{lead.title}</strong>
        {lead.detail ? <span className="today-next__detail">{lead.detail}</span> : null}
      </button>

      {rest.length ? (
        <ul className="today-next__rest">
          {rest.slice(0, 3).map((item) => {
            const Icon = ICONS[item.kind] || Sparkles;
            return (
              <li key={item.id}>
                <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                <span>
                  <strong>{item.title}</strong>
                  {item.kind === "event" ? ` · ${item.kicker.replace(/^Próximo · /, "")}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </article>
  );
}
