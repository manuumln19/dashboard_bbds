import { Info, Minus, Plug, Plus, Sun } from "lucide-react";
import {
  APPLIANCES,
  FLEXIBILITY_OPTIONS,
  computeRecommendations,
  consumptionKwh,
  findDay,
  formatMoney,
  formatPercent,
  formatPrice,
  formatWindow,
  madridDateKey,
  addDaysKey,
  taxBreakdown,
} from "../lib/energy";
import {
  APPLIANCE_SHORT_NAMES,
  ApplianceIcon,
} from "./ApplianceIcon";

function numberText(value) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 1,
  }).format(Number(value));
}

function Stepper({ label, value, min, max, step, suffix, onChange }) {
  const decrease = Math.max(min, Math.round((value - step) * 10) / 10);
  const increase = Math.min(max, Math.round((value + step) * 10) / 10);
  return (
    <div className="energy-stepper" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(decrease)}
        disabled={value <= min}
        aria-label={`Reducir ${label}`}
      >
        <Minus size={11} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <strong>
        {numberText(value)}
        <small>{suffix}</small>
      </strong>
      <button
        type="button"
        onClick={() => onChange(increase)}
        disabled={value >= max}
        aria-label={`Aumentar ${label}`}
      >
        <Plus size={11} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ApplianceCard({
  data,
  now,
  settings,
  stale,
  onOpenDetails,
  onRefresh,
  refreshing,
}) {
  const { appliance, config, selectAppliance, updateConfig } = settings;

  if (!data) {
    return (
      <article className="energy-card appliance-card">
        <header className="energy-card__head">
          <div>
            <span className="energy-kicker">
              <Plug size={12} strokeWidth={2} aria-hidden="true" />
              Recomendaciones
            </span>
            <h2>Cuándo ponerlo</h2>
          </div>
        </header>
        <div className="energy-empty">
          <span className="energy-empty__icon" aria-hidden="true">
            <Plug size={25} strokeWidth={1.6} />
          </span>
          <strong>Faltan los precios</strong>
          <span>En cuanto haya datos PVPC se calcularán las mejores franjas.</span>
          <button
            type="button"
            className="energy-button"
            onClick={() => onRefresh(false)}
            disabled={refreshing}
          >
            Reintentar
          </button>
        </div>
      </article>
    );
  }

  const todayKey = madridDateKey(now);
  const tomorrowKey = addDaysKey(todayKey, 1);
  const today = findDay(data, todayKey);
  const tomorrow = findDay(data, tomorrowKey);
  const recommendations = computeRecommendations({
    day: today,
    now,
    appliance,
    config,
  });
  const tomorrowResult = tomorrow
    ? computeRecommendations({
        day: tomorrow,
        now: new Date(tomorrow.hours[0].start),
        appliance,
        config,
        fromStart: true,
      })
    : null;

  const best = recommendations.best;
  const immediate = recommendations.immediate;
  const tax = best ? taxBreakdown(best.cost, data.source) : null;
  // «Lo antes posible» ya se muestra en la comparación; repetirlo como
  // alternativa solo añade ruido y parece una opción distinta.
  const alternativeOptions = recommendations.options
    .slice(1)
    .filter((option) => !immediate || option.start !== immediate.start)
    .slice(0, 2);
  const totalKwh = consumptionKwh(appliance, config);
  const bestDiffers = Boolean(
    best && immediate && best.start !== immediate.start
  );
  const hasSavings =
    bestDiffers &&
    recommendations.savings !== null &&
    recommendations.savings > 0.0005;

  return (
    <article className="energy-card appliance-card">
      <header className="energy-card__head">
        <div className="energy-card__title">
          <span className="energy-kicker">
            <Plug size={12} strokeWidth={2} aria-hidden="true" />
            Recomendaciones
          </span>
          <h2>Cuándo ponerlo</h2>
        </div>
        <div className="energy-card__tools">
          {stale ? (
            <span className="energy-flag energy-flag--warn">Sin confirmar</span>
          ) : null}
          <button
            type="button"
            className="energy-icon-button"
            onClick={() => onOpenDetails()}
            aria-label="Ver cómo se calcula la recomendación"
            title="Cómo se calcula"
          >
            <Info size={15} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="appliance-tabs" role="tablist" aria-label="Electrodoméstico">
        {APPLIANCES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={entry.id === appliance.id}
            className={entry.id === appliance.id ? "is-active" : ""}
            onClick={() => selectAppliance(entry.id)}
            title={entry.hint}
          >
            <ApplianceIcon id={entry.icon} />
            <span>{APPLIANCE_SHORT_NAMES[entry.id] || entry.name}</span>
          </button>
        ))}
      </div>

      {recommendations.available ? (
        <section className="appliance-best" aria-label="Mejor franja de hoy">
          <div className="appliance-best__head">
            <span>Mejor franja restante de hoy</span>
            {hasSavings ? (
              <span className="appliance-saving">
                {formatMoney(recommendations.savings)} menos
              </span>
            ) : bestDiffers ? (
              <span className="appliance-saving is-neutral">
                Casi el mismo coste
              </span>
            ) : (
              <span className="appliance-saving is-neutral">La mejor opción</span>
            )}
          </div>

          <strong className="appliance-best__window">
            {formatWindow(best.start, best.durationHours)}
          </strong>

          <div className="appliance-best__numbers">
            <div>
              <span>{formatPrice(best.averagePrice)} €/kWh de media</span>
              <strong>{formatMoney(best.cost)}</strong>
              <small>coste de la energía</small>
            </div>
            <div className="appliance-best__tax">
              {tax && tax.available ? (
                <>
                  <span>Con impuestos estimados</span>
                  <strong>{formatMoney(tax.total)}</strong>
                  <small>IEE + IVA; sin término de potencia</small>
                </>
              ) : (
                <>
                  <span>Impuestos</span>
                  <strong>—</strong>
                  <small>No se pueden estimar con esta fuente</small>
                </>
              )}
            </div>
          </div>

          {immediate ? (
            <div className="appliance-compare">
              <span>
                {recommendations.immediateIsNow
                  ? "Si empiezas en esta hora"
                  : "Lo antes posible"}
                : {formatWindow(immediate.start, immediate.durationHours)} ·{" "}
                {formatMoney(immediate.cost)}
              </span>
              {hasSavings ? (
                <strong>
                  Ahorras {formatMoney(recommendations.savings)} (
                  {formatPercent(recommendations.savingsPct)})
                </strong>
              ) : bestDiffers ? (
                <strong>Casi el mismo coste</strong>
              ) : (
                <strong>Ya es la franja más barata disponible</strong>
              )}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="appliance-unavailable" role="status">
          <strong>Hoy no hay una franja completa</strong>
          <span>{recommendations.reason}</span>
          {tomorrowResult && tomorrowResult.available ? (
            <span className="appliance-unavailable__hint">
              Mañana sí hay una opción:{" "}
              {formatWindow(
                tomorrowResult.best.start,
                tomorrowResult.best.durationHours
              )}{" "}
              por {formatMoney(tomorrowResult.best.cost)}.
            </span>
          ) : null}
        </section>
      )}

      <div className="appliance-config" aria-label="Ajustes del programa">
        <div className="appliance-config__row">
          <span className="appliance-config__label">Duración</span>
          <Stepper
            label="duración"
            value={config.durationHours}
            min={appliance.minHours}
            max={appliance.maxHours}
            step={1}
            suffix=" h"
            onChange={(value) => updateConfig({ durationHours: value })}
          />
          <span className="appliance-config__hint">
            El programa completo, no solo una hora
          </span>
        </div>

        <div className="appliance-config__row">
          <span className="appliance-config__label">
            {appliance.mode === "hourly" ? "Consumo por hora" : "Consumo"}
          </span>
          <Stepper
            label="consumo"
            value={config.consumption}
            min={appliance.minConsumption}
            max={appliance.maxConsumption}
            step={0.1}
            suffix={appliance.mode === "hourly" ? " kWh/h" : " kWh"}
            onChange={(value) => updateConfig({ consumption: value })}
          />
          <span className="appliance-config__hint">
            Total estimado: {numberText(totalKwh)} kWh
          </span>
        </div>

        <div className="appliance-config__flex">
          <span className="appliance-config__label">Margen para moverlo</span>
          <div className="appliance-flex" role="group" aria-label="Margen de maniobra">
            {FLEXIBILITY_OPTIONS.map((option) => (
              <button
                key={option.hours}
                type="button"
                className={
                  config.flexibilityHours === option.hours ? "is-active" : ""
                }
                onClick={() =>
                  updateConfig({ flexibilityHours: option.hours })
                }
                title={
                  option.hours === 0
                    ? "Solo la primera franja viable"
                    : `La franja puede empezar dentro de las próximas ${option.hours} h`
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {alternativeOptions.length ? (
        <div className="appliance-alts">
          <span className="appliance-section-title">Otras franjas sin solaparse</span>
          <ol>
            {alternativeOptions.map((option) => (
              <li key={option.start}>
                <span>{formatWindow(option.start, option.durationHours)}</span>
                <small>{formatPrice(option.averagePrice)} €/kWh</small>
                <strong>{formatMoney(option.cost)}</strong>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="appliance-tomorrow">
        <span className="appliance-section-title">
          <Sun size={12} strokeWidth={1.9} aria-hidden="true" />
          Mañana
        </span>
        {tomorrowResult && tomorrowResult.available ? (
          <div className="appliance-tomorrow__best">
            <strong>
              {formatWindow(
                tomorrowResult.best.start,
                tomorrowResult.best.durationHours
              )}
            </strong>
            <span>{formatMoney(tomorrowResult.best.cost)}</span>
            <small>
              {formatPrice(tomorrowResult.best.averagePrice)} €/kWh
            </small>
          </div>
        ) : tomorrow ? (
          <p>{tomorrowResult ? tomorrowResult.reason : "Sin horas suficientes."}</p>
        ) : (
          <p>
            Precios aún no publicados. REE suele publicarlos a partir de las
            20:15.
          </p>
        )}
      </div>

      <p className="appliance-note">
        Estimación con el consumo repartido por igual durante el programa.
        Coste de energía con peajes y cargos; no incluye el término de
        potencia. Los impuestos son una estimación (IEE 5,11 % + IVA 21 %) y
        pueden cambiar.
      </p>
    </article>
  );
}
