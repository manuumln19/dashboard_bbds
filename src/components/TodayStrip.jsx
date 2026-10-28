import { memo } from "react";
import { Flame, ShoppingBasket, SprayCan, Trophy, Zap } from "lucide-react";
import {
  bandForPrice,
  classifyPriceBands,
  currentPriceState,
  formatPrice,
} from "../lib/energy";
import { weeklyScores } from "../lib/points";
import { cheapPower, cleaningDayIndex } from "../lib/today";
import { EggAvatar } from "./EggAvatar";

// «Casa» en una línea, a todo lo ancho de Hoy: limpieza de hoy, el equipo con
// sus puntos y rachas, lo que falta por comprar y la luz. Se lee de un
// vistazo desde lejos; cada bloque lleva a su vista.
export const TodayStrip = memo(function TodayStrip({
  now,
  cleaning,
  lists,
  electricity,
  onOpenCleaning,
  onOpenSummary,
  onOpenLists,
  onOpenEnergy,
}) {
  const today = cleaningDayIndex(now);
  const todayTasks = cleaning.tasks.filter((task) => task.day === today);
  const todayDone = todayTasks.filter((task) => task.done).length;
  const { scores, mvp } = weeklyScores({ cleaning, lists, now });
  const toBuy = lists.items.filter((item) => item.listId === "shopping" && !item.done).length;

  const data = electricity.data;
  const state = data ? currentPriceState(data, now) : null;
  const slot = state && state.status === "current" ? state.slot : null;
  const band = slot && state.day ? bandForPrice(slot.price, classifyPriceBands(state.day)) : null;
  const cheap = cheapPower(electricity, now);

  return (
    <nav className="card today-strip" aria-label="Casa">
      <button type="button" className="today-strip__item" onClick={onOpenCleaning}>
        <SprayCan size={18} strokeWidth={1.8} aria-hidden="true" />
        <span className="today-strip__text">
          <strong>
            {todayTasks.length ? (todayDone === todayTasks.length ? "Hecha" : `${todayDone}/${todayTasks.length}`) : "Libre"}
          </strong>
          <small>
            Limpieza hoy · {cleaning.doneCount}/{cleaning.totalCount} semana
          </small>
        </span>
      </button>

      <button type="button" className="today-strip__item today-strip__team" onClick={onOpenSummary}>
        <span className="today-strip__text">
          <span className="today-strip__people">
            {scores.map((entry) => (
              <span
                key={entry.person.id}
                className={`today-strip__person${mvp && mvp.person.id === entry.person.id ? " is-mvp" : ""}`}
              >
                <EggAvatar person={entry.person} size={24} cracked={entry.ownWeek} level={entry.level.index} />
                <strong>{entry.points}</strong>
                {entry.streak ? (
                  <small className="today-strip__flame">
                    <Flame size={12} strokeWidth={2.2} aria-hidden="true" />
                    {entry.streak}
                  </small>
                ) : null}
              </span>
            ))}
          </span>
          <small>{mvp ? `Va ganando ${mvp.person.name}` : "Puntos de la semana"}</small>
        </span>
        <Trophy className="today-strip__trophy" size={16} strokeWidth={1.9} aria-label="Resumen de la semana" />
      </button>

      <button type="button" className="today-strip__item" onClick={onOpenLists}>
        <ShoppingBasket size={18} strokeWidth={1.8} aria-hidden="true" />
        <span className="today-strip__text">
          <strong>{toBuy || "Nada"}</strong>
          <small>{toBuy ? "por comprar" : "que comprar"}</small>
        </span>
      </button>

      <button type="button" className="today-strip__item" onClick={onOpenEnergy}>
        <Zap size={18} strokeWidth={1.8} aria-hidden="true" />
        <span className="today-strip__text">
          <strong>
            {slot ? formatPrice(slot.price) : electricity.loading ? "…" : "—"}
            <em> €/kWh</em>
            {band ? <span className={`energy-band energy-band--${band.id}`}>{band.label}</span> : null}
          </strong>
          <small>{cheap ? cheap.label : "Luz ahora"}</small>
        </span>
      </button>
    </nav>
  );
});
