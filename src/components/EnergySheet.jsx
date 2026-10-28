import { useEffect } from "react";
import { Info, X, Zap } from "lucide-react";
import {
  dayLabel,
  formatMoney,
  formatPrice,
  formatUpdatedAge,
  formatUpdatedStamp,
  priceTypeLabel,
  sourceNote,
  taxBreakdown,
} from "../lib/energy";
import { numberFormat } from "../lib/intl";
import { sheetPortal } from "../lib/sheetPortal";

function numberText(value) {
  return numberFormat({
    maximumFractionDigits: 1,
  }).format(Number(value));
}

function rateText(value) {
  return `${numberFormat({
    maximumFractionDigits: 2,
  }).format(Number(value) * 100)} %`;
}

function PercentRow({ label, rate, amount }) {
  return (
    <div className="energy-tax__row">
      <span>
        {label} <small>{rate}</small>
      </span>
      <strong>{formatMoney(amount)}</strong>
    </div>
  );
}

export function EnergySheet({
  open,
  onClose,
  data,
  now,
  focusSlot,
  priceState,
  stale,
  appliance,
  config,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const source = data && data.source ? data.source : null;
  const days = data && Array.isArray(data.days) ? data.days : [];
  const price = focusSlot ? Number(focusSlot.price) : null;
  const tax = taxBreakdown(price, source);
  const isDemo = Boolean(source && source.demo) || Boolean(data && data.demo);
  const outdated = stale || !data || Boolean(data.stale);

  return sheetPortal(
    <div
      className="ink-overlay feature-overlay energy-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="ink-sheet card energy-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="energy-sheet-title"
      >
        <header className="ink-head">
          <span className="ink-head__icon" aria-hidden="true">
            <Zap size={23} strokeWidth={1.7} />
          </span>
          <div>
            <span className="eyebrow">Energía · método y fuente</span>
            <h2 id="energy-sheet-title">Cómo se calcula</h2>
            <p>
              Precio regulado PVPC, coste de cada programa y límites de la
              estimación. Sin mezclar tarifas ni presentar una copia antigua
              como si fuera el precio de ahora.
            </p>
          </div>
          <button
            type="button"
            className="ink-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </header>

        <div className="energy-sheet__body">
          <section className="energy-sheet__section">
            <div className="energy-sheet__head">
              <h3>Fuente y vigencia</h3>
              <span className="energy-sheet__badges">
                {isDemo ? (
                  <span className="energy-flag energy-flag--demo">Demo</span>
                ) : null}
                {outdated ? (
                  <span className="energy-flag energy-flag--warn">
                    Sin confirmar
                  </span>
                ) : (
                  <span className="energy-flag energy-flag--live">
                    <i aria-hidden="true" />
                    Datos recientes
                  </span>
                )}
              </span>
            </div>

            <dl className="energy-sheet__grid">
              <div>
                <dt>Tarifa</dt>
                <dd>{priceTypeLabel(source)}</dd>
              </div>
              <div>
                <dt>Fuente</dt>
                <dd>{source ? source.label : "Sin identificar"}</dd>
              </div>
              <div>
                <dt>Publicado</dt>
                <dd>{formatUpdatedStamp(data ? data.updatedAt : null)}</dd>
              </div>
              <div>
                <dt>Consultado</dt>
                <dd>
                  {formatUpdatedStamp(data ? data.fetchedAt : null)}
                  <small>
                    {data ? formatUpdatedAge(data.fetchedAt, now) : "Sin datos"}
                  </small>
                </dd>
              </div>
            </dl>

            <p className="energy-sheet__copy">
              {sourceNote(source) ||
                "No hay una fuente cargada en este momento. La tarjeta mantiene la última copia disponible y la marca como sin confirmar."}
            </p>
            <p className="energy-sheet__copy">
              PVPC es el precio regulado de la electricidad para hogares
              acogidos al mercado regulado; no es el precio mayorista ni el de
              una tarifa libre. {priceState && priceState.status !== "current"
                ? "Los precios no cubren la hora actual, así que no se muestran como si fueran de ahora."
                : "La hora actual se busca por su intervalo real, no por la posición en la lista."}
            </p>

            {days.length ? (
              <div className="energy-sheet__days" aria-label="Días disponibles">
                {days.map((day) => (
                  <span key={day.date}>
                    {dayLabel(day.date, now)}
                    <small>{day.hours.length} h</small>
                  </span>
                ))}
              </div>
            ) : null}

            {source && source.url ? (
              <a
                className="energy-sheet__link"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir la fuente oficial
              </a>
            ) : null}
          </section>

          <section className="energy-sheet__section">
            <div className="energy-sheet__head">
              <h3>Precio de la energía</h3>
              <span className="energy-sheet__price">
                {price === null ? "—" : formatPrice(price)}
                <small>€/kWh</small>
              </span>
            </div>

            {focusSlot ? (
              <p className="energy-sheet__copy">
                Precio de un kWh durante la hora que se muestra en la tarjeta.
                No se aplica a otras horas ni a otros días.
              </p>
            ) : (
              <p className="energy-sheet__copy">
                No hay una hora de precio que coincida con el momento actual.
                No se estiman impuestos sobre un precio que no existe.
              </p>
            )}

            {tax.available ? (
              <div className="energy-tax">
                <div className="energy-tax__row">
                  <span>Energía por kWh (peajes y cargos incluidos)</span>
                  <strong>{formatMoney(tax.energy)}</strong>
                </div>
                <PercentRow
                  label="IEE"
                  rate={rateText(tax.ieeRate)}
                  amount={tax.iee}
                />
                <PercentRow
                  label="IVA"
                  rate={rateText(tax.ivaRate)}
                  amount={tax.iva}
                />
                <div className="energy-tax__row energy-tax__row--total">
                  <span>Total estimado por kWh</span>
                  <strong>{formatMoney(tax.total)}</strong>
                </div>
              </div>
            ) : (
              <p className="energy-sheet__copy">{tax.reason}</p>
            )}

            <p className="energy-sheet__note">
              Estimación por kWh sobre el término de energía. El coste del
              programa completo, con su duración y consumo, se calcula en la
              tarjeta de recomendaciones. No incluye el término de potencia, el
              alquiler del contador ni otros cargos fijos de la factura. Los
              tipos de IEE e IVA pueden cambiar.
            </p>
          </section>

          <section className="energy-sheet__section">
            <div className="energy-sheet__head">
              <h3>Cómo se elige la franja</h3>
              <span className="energy-sheet__tag">
                {appliance ? appliance.name : "Programa"}
              </span>
            </div>
            <ul className="energy-sheet__list">
              <li>
                Se prueban solo franjas de horas enteras y consecutivas. La
                franja debe cubrir <strong>todo el programa</strong>, no una
                parte.
              </li>
              <li>
                El coste es la suma de cada hora multiplicada por su consumo.
                {appliance && config
                  ? ` Ahora mismo: ${appliance.name.toLowerCase()}, ${
                      config.durationHours
                    } h y ${
                      appliance.mode === "hourly"
                        ? `${numberText(config.consumption)} kWh/h`
                        : `${numberText(config.consumption)} kWh en total`
                    }.`
                  : ""}
              </li>
              <li>
                Si el programa empieza en la hora actual, se exige que queden
                al menos 30 minutos y se cuenta esa hora completa a su precio.
                No se prorratean los minutos.
              </li>
              <li>
                La referencia «lo antes posible» permite comparar el ahorro.
                Las alternativas que se listan no se solapan entre sí.
              </li>
              <li>
                Los cambios de hora se respetan: un día puede tener 23, 24 o
                25 horas. Las horas se muestran en Europe/Madrid.
              </li>
              <li>
                El consumo se reparte por igual entre las horas del programa
                porque no hay un perfil real de potencia. Es una estimación,
                no una lectura del contador.
              </li>
            </ul>
          </section>

          <section className="energy-sheet__section">
            <div className="energy-sheet__head">
              <h3>Bandas barata, media y cara</h3>
              <Info size={14} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p className="energy-sheet__copy">
              Son <strong>terciles relativos a los precios del día</strong>, no
              umbrales absolutos: «barata» significa el tercio más bajo de ese
              día, aunque en otro día ese mismo precio pudiera ser medio. Si
              todas las horas valen lo mismo, no se marca ninguna como barata o
              cara.
            </p>
          </section>

          <footer className="energy-sheet__foot">
            <span>
              Datos de REE/ESIOS. Esta pantalla no factura: la factura real
              depende de tu comercializadora, potencia contratada y peajes.
            </span>
            <button type="button" className="energy-button" onClick={onClose}>
              Cerrar
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}
