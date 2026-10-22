import { useCallback, useState } from "react";
import { FlaskConical, Info, RefreshCw } from "lucide-react";
import { DEMO_MODE } from "../config";
import { useApplianceSettings } from "../hooks/useApplianceSettings";
import { useElectricity } from "../hooks/useElectricity";
import {
  currentPriceState,
  dayLabel,
  formatUpdatedAge,
  formatUpdatedStamp,
} from "../lib/energy";
import { ApplianceCard } from "./ApplianceCard";
import { ElectricityCard } from "./ElectricityCard";
import { EnergySheet } from "./EnergySheet";

export function EnergyView({ now }) {
  const electricity = useElectricity();
  const settings = useApplianceSettings();
  const [sheet, setSheet] = useState({
    open: false,
    focusSlot: null,
    priceState: null,
  });

  const openDetails = useCallback(
    (state, slot) => {
      let resolvedState = state;
      let resolvedSlot = slot;
      if (!resolvedState) {
        resolvedState = electricity.data
          ? currentPriceState(electricity.data, now)
          : null;
        resolvedSlot =
          resolvedState && resolvedState.slot ? resolvedState.slot : null;
      }
      setSheet({
        open: true,
        focusSlot: resolvedSlot || null,
        priceState: resolvedState || null,
      });
    },
    [electricity.data, now]
  );

  const closeDetails = useCallback(() => {
    setSheet((current) => ({ ...current, open: false }));
  }, []);

  const data = electricity.data;
  const priceState = data ? currentPriceState(data, now) : null;
  const isDemo = DEMO_MODE || Boolean(data && data.demo);
  const coverageIssue =
    data && priceState && priceState.status !== "current"
      ? priceState.status === "missing"
        ? priceState.latest
          ? `No hay precios de hoy. Se muestra la última copia de ${dayLabel(
              priceState.latest.date,
              now
            ).toLowerCase()}.`
          : "No hay precios disponibles para hoy."
        : priceState.status === "upcoming"
          ? "El precio de esta hora aún no está publicado. Se muestra la próxima hora disponible."
          : "No quedan horas de precio para hoy. Se muestra el último dato publicado."
      : null;

  const updatedText = data
    ? `${electricity.stale ? "Copia de" : "Consultado"} ${formatUpdatedAge(
        data.fetchedAt,
        now
      )}`
    : electricity.loading
      ? "Consultando la fuente…"
      : "Sin datos";

  return (
    <section className="view energy-view" aria-labelledby="energy-title">
      <header className="view-heading energy-head">
        <div>
          <span className="eyebrow">Casa · consumo</span>
          <h1 id="energy-title">Energía</h1>
          <p>
            PVPC hora a hora y las mejores franjas para lo que más consume.
          </p>
        </div>

        <div className="energy-head__aside">
          {isDemo ? (
            <span className="energy-demo">
              <FlaskConical size={11} strokeWidth={1.9} aria-hidden="true" />
              Demo · precios simulados
            </span>
          ) : null}
          <span
            className="energy-updated"
            title={
              data
                ? `Consultado: ${formatUpdatedStamp(data.fetchedAt)} · Publicado: ${formatUpdatedStamp(
                    data.updatedAt
                  )}`
                : undefined
            }
          >
            <i aria-hidden="true" />
            {updatedText}
          </span>
          <div className="energy-head__actions">
            <button
              type="button"
              className="energy-button"
              onClick={() => electricity.refresh(false)}
              disabled={electricity.refreshing}
            >
              <RefreshCw
                size={12}
                strokeWidth={2}
                className={electricity.refreshing ? "is-spinning" : ""}
                aria-hidden="true"
              />
              Actualizar
            </button>
            <button
              type="button"
              className="energy-button energy-button--quiet"
              onClick={() => openDetails()}
            >
              <Info size={12} strokeWidth={2} aria-hidden="true" />
              Fuente y cálculo
            </button>
          </div>
        </div>
      </header>

      {electricity.error ? (
        <div className="inline-alert" role="status">
          No se pudo actualizar el precio: {electricity.error}.
          {data ? " Se mantiene la última información disponible." : ""}
        </div>
      ) : null}

      {!electricity.error && electricity.warning ? (
        <div className="energy-notice" role="status">
          {electricity.warning}
        </div>
      ) : null}

      {!electricity.error && !electricity.warning && coverageIssue ? (
        <div className="energy-notice energy-notice--warn" role="status">
          {coverageIssue}
        </div>
      ) : null}

      <div className="energy-layout">
        <ElectricityCard
          data={data}
          now={now}
          stale={electricity.stale}
          loading={electricity.loading}
          error={electricity.error}
          onOpenDetails={openDetails}
          onRefresh={electricity.refresh}
          refreshing={electricity.refreshing}
        />
        <ApplianceCard
          data={data}
          now={now}
          settings={settings}
          stale={electricity.stale}
          onOpenDetails={openDetails}
          onRefresh={electricity.refresh}
          refreshing={electricity.refreshing}
        />
      </div>

      <EnergySheet
        open={sheet.open}
        onClose={closeDetails}
        data={data}
        now={now}
        focusSlot={sheet.focusSlot}
        priceState={sheet.priceState}
        stale={electricity.stale}
        appliance={settings.appliance}
        config={settings.config}
      />
    </section>
  );
}
