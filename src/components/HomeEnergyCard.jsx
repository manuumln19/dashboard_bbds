import { ArrowUpRight, RefreshCw, Zap } from "lucide-react";
import { DEMO_MODE } from "../config";
import { useApplianceSettings } from "../hooks/useApplianceSettings";
import { useElectricity } from "../hooks/useElectricity";
import {
  applianceWindows,
  bandForPrice,
  classifyPriceBands,
  currentPriceState,
  formatPrice,
  formatUpdatedStamp,
  formatWindow,
} from "../lib/energy";
import {
  APPLIANCE_SHORT_NAMES,
  ApplianceIcon,
} from "./ApplianceIcon";

function priceLabel(state) {
  if (!state) return "Sin precio";
  if (state.status === "current") return "Ahora";
  if (state.status === "upcoming") return "Próxima hora";
  if (state.status === "ended") return "Última hora";
  return "Sin precio de hoy";
}

export function HomeEnergyCard({ now, onOpen }) {
  const electricity = useElectricity();
  const settings = useApplianceSettings();
  const data = electricity.data;
  const state = data ? currentPriceState(data, now) : null;
  const bands = state && state.day ? classifyPriceBands(state.day) : null;

  let slot = state && state.slot ? state.slot : null;
  if (
    state &&
    state.status === "ended" &&
    state.day &&
    state.day.hours.length
  ) {
    slot = state.day.hours[state.day.hours.length - 1];
  }

  const band =
    slot && Number.isFinite(Number(slot.price))
      ? bandForPrice(slot.price, bands)
      : null;
  const previews = data ? applianceWindows(data, now, settings.configs) : [];
  const isDemo =
    DEMO_MODE || Boolean(data && (data.demo || (data.source && data.source.demo)));
  const outdated = Boolean(
    data &&
      (electricity.stale ||
        electricity.error ||
        !state ||
        state.status !== "current")
  );
  const label = priceLabel(state);
  const windowLabel = slot ? formatWindow(slot.start, 1) : null;

  return (
    <article className="card home-energy">
      <header className="home-energy__head">
        <div className="home-energy__title">
          <span className="energy-kicker">
            <Zap size={11} strokeWidth={2} aria-hidden="true" />
            Energía · PVPC
          </span>
          <h2>La luz, ahora</h2>
        </div>

        <div className="home-energy__tools">
          {isDemo ? (
            <span className="energy-flag energy-flag--demo">Demo</span>
          ) : null}
          {outdated ? (
            <span className="energy-flag energy-flag--warn">Sin confirmar</span>
          ) : null}
          <button type="button" className="text-button" onClick={onOpen}>
            Abrir Energía
            <ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </header>

      {!data ? (
        <div className="home-energy__empty">
          <span className="home-energy__empty-icon" aria-hidden="true">
            <Zap size={18} strokeWidth={1.7} />
          </span>
          <div>
            <strong>
              {electricity.loading
                ? "Consultando precios PVPC…"
                : "Sin precios disponibles"}
            </strong>
            <span>
              {electricity.loading
                ? "El detalle completo está en Energía."
                : "No se pudo actualizar. Se reintentará solo."}
            </span>
          </div>
          {!electricity.loading ? (
            <button
              type="button"
              className="energy-button"
              onClick={() => electricity.refresh(false)}
              disabled={electricity.refreshing}
            >
              <RefreshCw
                size={11}
                strokeWidth={2}
                className={electricity.refreshing ? "is-spinning" : ""}
                aria-hidden="true"
              />
              Reintentar
            </button>
          ) : null}
        </div>
      ) : (
        <div className="home-energy__body">
          <div className="home-energy__now">
            <span className="home-energy__now-label">
              {label}
              {windowLabel ? ` · ${windowLabel}` : ""}
            </span>
            <strong
              className={slot ? "" : "is-empty"}
              title={
                data.updatedAt
                  ? `Precio publicado: ${formatUpdatedStamp(data.updatedAt)}`
                  : undefined
              }
            >
              {slot ? formatPrice(slot.price) : "—"}
              <small>€/kWh</small>
            </strong>
            <div className="home-energy__now-meta">
              {band ? (
                <span className={`energy-band energy-band--${band.id}`}>
                  {band.label}
                </span>
              ) : null}
              {bands ? (
                <span>Media hoy {formatPrice(bands.avg)}</span>
              ) : (
                <span>Fuente REE/ESIOS</span>
              )}
            </div>
          </div>

          <ul className="home-energy__apps" aria-label="Mejor franja por aparato">
            {previews.map(({ appliance, day, best }) => (
              <li
                key={appliance.id}
                title={
                  best
                    ? `${appliance.name}: ${formatWindow(
                        best.start,
                        best.durationHours
                      )}${day === "tomorrow" ? " (mañana)" : ""}`
                    : `${appliance.name}: sin franja completa`
                }
              >
                <ApplianceIcon
                  id={appliance.icon}
                  size={13}
                  strokeWidth={1.8}
                />
                <span className="home-energy__app-name">
                  {APPLIANCE_SHORT_NAMES[appliance.id] || appliance.name}
                </span>
                {best ? (
                  <span className="home-energy__app-when">
                    {day === "tomorrow" ? <small>mañana</small> : null}
                    <span>{formatWindow(best.start, best.durationHours)}</span>
                  </span>
                ) : (
                  <span className="home-energy__app-when is-empty">—</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
