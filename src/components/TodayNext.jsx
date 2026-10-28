import { memo, useState } from "react";
import { BellRing, Cake, CalendarDays, Plus, Sparkles, SprayCan, Trophy, Umbrella, UtensilsCrossed, Zap } from "lucide-react";
import { getWeatherAdvice } from "../lib/weather";
import { nextItems } from "../lib/today";

const ICONS = {
  event: CalendarDays,
  rain: Umbrella,
  cleaning: SprayCan,
  power: Zap,
  reminder: BellRing,
  birthday: Cake,
  trophy: Trophy,
  menu: UtensilsCrossed,
};

const KIND_TONES = { rain: "lilac", cleaning: "mint", power: "amber", reminder: "amber", birthday: "pink", trophy: "amber", menu: "mint" };

// «Añadir a la compra» para avisos como el de las uvas.
function AddToShopping({ text, lists }) {
  const [added, setAdded] = useState(false);
  const texts = Array.isArray(text) ? text : [text];
  const open = lists ? lists.byList("shopping").filter((item) => !item.done).map((item) => item.text.toLowerCase()) : [];
  const missing = texts.filter((entry) => !open.includes(entry.toLowerCase()));
  const already = !missing.length;
  if (!lists || already || added) return <span className="today-next__added">En la compra</span>;
  return (
    <button
      type="button"
      className="today-next__add"
      onClick={(event) => {
        event.stopPropagation();
        setAdded(true);
        missing.forEach((entry) => lists.addItem("shopping", entry));
      }}
    >
      <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
      Añadir a la compra
    </button>
  );
}

// Una sola tarjeta de color: lo más importante ahora, y debajo lo demás.
export const TodayNext = memo(function TodayNext({ now, events, weather, electricity, cleaning, lists, menu, onOpenAgenda }) {
  const items = nextItems({ now, events, weather, electricity, cleaning, menu });
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
      {lead.addToShopping ? <AddToShopping text={lead.addToShopping} lists={lists} /> : null}

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
                  {item.kind === "birthday" ? ` · ${item.detail}` : ""}
                </span>
                {item.addToShopping ? <AddToShopping text={item.addToShopping} lists={lists} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </article>
  );
});
