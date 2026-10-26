import { ArrowUpRight, Zap } from "lucide-react";
import {
  bandForPrice,
  classifyPriceBands,
  currentPriceState,
  formatPrice,
} from "../lib/energy";

// El precio de la luz en una línea; el detalle sigue en Energía.
export function TodayPower({ electricity, now, onOpenEnergy }) {
  const data = electricity.data;
  const state = data ? currentPriceState(data, now) : null;
  const slot = state && state.status === "current" ? state.slot : null;
  const band = slot && state.day ? bandForPrice(slot.price, classifyPriceBands(state.day)) : null;

  return (
    <button type="button" className="card today-power" onClick={onOpenEnergy}>
      <Zap size={17} strokeWidth={1.9} aria-hidden="true" />
      <span className="today-power__label">Luz ahora</span>
      <strong>
        {slot ? formatPrice(slot.price) : electricity.loading ? "…" : "—"}
        <small> €/kWh</small>
      </strong>
      {band ? <span className={`energy-band energy-band--${band.id}`}>{band.label}</span> : null}
      <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
