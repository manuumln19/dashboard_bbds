import { useState } from "react";
import {
  ChevronRight,
  Clock,
  Info,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  addDaysKey,
  bandCounts,
  bandForPrice,
  classifyPriceBands,
  currentPriceState,
  dayLabel,
  findDay,
  formatDayShort,
  formatHour,
  formatPrice,
  formatUpdatedAge,
  formatUpdatedStamp,
  formatWindow,
  isPastSlot,
  latestDay,
  madridDateKey,
  priceTypeLabel,
  sourceNote,
} from "../lib/energy";

function bandClass(band) {
  return band ? ` is-${band.id}` : "";
}

function EmptyCard({ loading, error, onRefresh, refreshing }) {
  return (
    <article className="energy-card electricity-card">
      <header className="energy-card__head">
        <div>
          <span className="energy-kicker">
            <Zap size={12} strokeWidth={2} aria-hidden="true" />
            Precio de la luz
          </span>
          <h2>PVPC hora a hora</h2>
        </div>
      </header>
      <div className="energy-empty">
        <span className="energy-empty__icon" aria-hidden="true">
          <Zap size={25} strokeWidth={1.6} />
        </span>
        {loading ? (
          <>
            <strong>Consultando los precios PVPC…</strong>
            <span>Puede tardar unos segundos.</span>
          </>
        ) : (
          <>
            <strong>No hay precios disponibles</strong>
            <span>
              {error ||
                "La fuente todavía no ha publicado datos para hoy. Se reintentará solo."}
            </span>
            <button
              type="button"
              className="energy-button"
              onClick={() => onRefresh(false)}
              disabled={refreshing}
            >
              <RefreshCw
                size={12}
                strokeWidth={2}
                className={refreshing ? "is-spinning" : ""}
                aria-hidden="true"
              />
              Reintentar
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export function ElectricityCard({
  data,
  now,
  stale,
  loading,
  error,
  onOpenDetails,
  onRefresh,
  refreshing,
}) {
  const [selected, setSelected] = useState("today");

  if (!data) {
    return (
      <EmptyCard
        loading={loading}
        error={error}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    );
  }

  const source = data.source || null;
  const todayKey = madridDateKey(now);
  const tomorrowKey = addDaysKey(todayKey, 1);
  const today = findDay(data, todayKey);
  const tomorrow = findDay(data, tomorrowKey);
  const latest = latestDay(data);
  const priceState = currentPriceState(data, now);

  let active = selected;
  if (active === "tomorrow" && !tomorrow) active = today ? "today" : "latest";
  if (active === "today" && !today) active = tomorrow ? "tomorrow" : "latest";
  const day = active === "tomorrow" ? tomorrow : active === "today" ? today : latest;

  if (!day || !day.hours || !day.hours.length) {
    return (
      <EmptyCard
        loading={loading}
        error={error}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    );
  }

  const bands = classifyPriceBands(day);
  const counts = bandCounts(day, bands);
  const todayBands = today ? classifyPriceBands(today) : bands;

  let focusSlot = null;
  let focusLabel = "Precio actual";
  if (priceState.status === "current") {
    focusSlot = priceState.slot;
    focusLabel = "Ahora";
  } else if (priceState.status === "upcoming") {
    focusSlot = priceState.slot;
    focusLabel = "Próxima hora";
  } else if (today && today.hours.length) {
    focusSlot = today.hours[today.hours.length - 1];
    focusLabel = "Última hora de hoy";
  } else if (latest && latest.hours.length) {
    focusSlot = latest.hours[latest.hours.length - 1];
    focusLabel = "Último dato";
  }

  const focusBand = focusSlot
    ? bandForPrice(focusSlot.price, todayBands)
    : null;
  const focusWindow = focusSlot ? formatWindow(focusSlot.start, 1) : "—";
  const isCurrent = priceState.status === "current";
  const outdated =
    stale || Boolean(error) || !isCurrent;

  const avgRatio =
    bands && !bands.degenerate && bands.max > bands.min
      ? (bands.avg - bands.min) / (bands.max - bands.min)
      : 0.5;
  const chartLabel = `Gráfico de precios de ${dayLabel(
    day.date,
    now
  )}: mínimo ${formatPrice(bands ? bands.min : 0)} y máximo ${formatPrice(
    bands ? bands.max : 0
  )} euros por kilovatio hora.`;

  return (
    <article className="energy-card electricity-card">
      <header className="energy-card__head">
        <div className="energy-card__title">
          <span className="energy-kicker">
            <Zap size={12} strokeWidth={2} aria-hidden="true" />
            Precio de la luz
          </span>
          <h2>PVPC hora a hora</h2>
          <p className="energy-source" title={sourceNote(source)}>
            {priceTypeLabel(source)}
            {source && source.demo ? " · demo local" : " · precio regulado"}
          </p>
        </div>
        <div className="energy-card__tools">
          {outdated ? (
            <span className="energy-flag energy-flag--warn">Sin confirmar</span>
          ) : (
            <span className="energy-flag energy-flag--live">
              <i aria-hidden="true" />
              Vigente
            </span>
          )}
          <button
            type="button"
            className="energy-icon-button"
            onClick={() => onOpenDetails(priceState, focusSlot)}
            aria-label="Ver fuente, impuestos y método de cálculo"
            title="Fuente, impuestos y método"
          >
            <Info size={15} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="elec-now">
        <div className="elec-now__price">
          <span className="elec-now__label">
            {focusLabel}
            {focusSlot ? ` · ${focusWindow}` : ""}
          </span>
          <strong>
            {focusSlot ? formatPrice(focusSlot.price) : "—"}
            <small>€/kWh</small>
          </strong>
          <div className="elec-now__meta">
            {focusBand ? (
              <span className={`energy-band energy-band--${focusBand.id}`}>
                {focusBand.label}
              </span>
            ) : null}
            {!isCurrent && focusSlot ? (
              <span className="elec-now__stamp">
                {dayLabel(day.date, now)} · {formatHour(focusSlot.start)}
              </span>
            ) : null}
          </div>
        </div>

        <dl className="elec-metrics">
          <div>
            <dt>Mínimo</dt>
            <dd>{formatPrice(bands ? bands.min : null)}</dd>
            <span>{bands ? formatHour(bands.minHour.start) : "—"}</span>
          </div>
          <div>
            <dt>Máximo</dt>
            <dd>{formatPrice(bands ? bands.max : null)}</dd>
            <span>{bands ? formatHour(bands.maxHour.start) : "—"}</span>
          </div>
          <div>
            <dt>Media</dt>
            <dd>{formatPrice(bands ? bands.avg : null)}</dd>
            <span>{bands ? bands.count : 0} h publicadas</span>
          </div>
        </dl>
      </div>

      <div className="elec-chart-block">
        <div className="elec-chart-head">
          <span className="elec-chart-title">
            {dayLabel(day.date, now)}
            <small>{formatDayShort(day.date)}</small>
          </span>
          <div className="elec-tabs" role="tablist" aria-label="Día de precios">
            <button
              type="button"
              role="tab"
              aria-selected={active === "today"}
              className={active === "today" ? "is-active" : ""}
              onClick={() => setSelected("today")}
              disabled={!today}
            >
              Hoy
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={active === "tomorrow"}
              className={active === "tomorrow" ? "is-active" : ""}
              onClick={() => setSelected("tomorrow")}
              disabled={!tomorrow}
              title={
                tomorrow
                  ? "Precios de mañana"
                  : "El precio de mañana suele publicarse a partir de las 20:15"
              }
            >
              Mañana
            </button>
          </div>
        </div>

        <div
          className="elec-chart"
          role="img"
          aria-label={chartLabel}
        >
          <span
            className="elec-chart__avg"
            style={{ bottom: `${8 + avgRatio * 86}%` }}
            aria-hidden="true"
          />
          <div className="elec-chart__bars" aria-hidden="true">
            {day.hours.map((slot) => {
              const band = bandForPrice(slot.price, bands);
              const ratio =
                bands && !bands.degenerate && bands.max > bands.min
                  ? (slot.price - bands.min) / (bands.max - bands.min)
                  : 0.5;
              const past =
                day.date === todayKey && isPastSlot(slot, now);
              const nowSlot =
                priceState.status === "current" &&
                priceState.slot &&
                slot.start === priceState.slot.start;
              return (
                <span
                  key={slot.start}
                  className={`elec-bar${bandClass(band)}${
                    past ? " is-past" : ""
                  }${nowSlot ? " is-now" : ""}`}
                  style={{ height: `${8 + Math.max(0, Math.min(1, ratio)) * 86}%` }}
                  title={`${formatHour(slot.start)} · ${formatPrice(
                    slot.price
                  )} €/kWh · ${band.label}`}
                />
              );
            })}
          </div>
          <div className="elec-chart__axis" aria-hidden="true">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>24</span>
          </div>
        </div>

        <div className="elec-legend">
          <span className="elec-legend__item is-cheap">
            <i aria-hidden="true" />
            Barata <strong>{counts.cheap} h</strong>
          </span>
          <span className="elec-legend__item is-mid">
            <i aria-hidden="true" />
            Media <strong>{counts.mid} h</strong>
          </span>
          <span className="elec-legend__item is-high">
            <i aria-hidden="true" />
            Cara <strong>{counts.high} h</strong>
          </span>
          <span className="elec-legend__note">Altura relativa al día</span>
        </div>
      </div>

      <footer className="elec-foot">
        <span title={formatUpdatedStamp(source ? data.updatedAt : null)}>
          <Clock size={12} strokeWidth={1.9} aria-hidden="true" />
          {data.updatedAt
            ? `Publicado ${formatUpdatedAge(data.updatedAt, now)}`
            : "Sin fecha de publicación"}
          <small>{formatUpdatedStamp(data.updatedAt)}</small>
        </span>
        <button
          type="button"
          className="text-button"
          onClick={() => onOpenDetails(priceState, focusSlot)}
        >
          Fuente y cálculo
          <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}
