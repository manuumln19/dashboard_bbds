import { useRef, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  House,
  Receipt,
  Trash2,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  BILL_KINDS,
  billStatus,
  billTitle,
  compareBill,
  formatMoney,
  monthSummary,
  monthTotals,
  parseAmount,
  periodLabel,
  periodOf,
  shareOf,
  shiftPeriod,
} from "../lib/bills";

const KIND_ICONS = {
  alquiler: House,
  luz: Zap,
  agua: Droplets,
  basura: Trash2,
  gas: Flame,
  internet: Wifi,
  comunidad: Building2,
  otro: Receipt,
};
const MONTH_INITIALS = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
// Pagadas: solo las de los últimos meses; el resto está en el gráfico.
const PAID_MONTHS = 3;

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function dueLabel(dueOn) {
  if (!dueOn) return "";
  return `vence el ${Number(dueOn.slice(8, 10))}`;
}

// Cuentas de casa: alquiler y facturas, a medias. A la izquierda, lo que
// falta por pagar y lo pagado de los últimos meses; a la derecha, el gasto
// del año, la factura nueva y el alquiler.
export function BillsView({ now, bills, people }) {
  const period = periodOf(now);
  const pending = bills.bills.filter((bill) => !billStatus(bill, people).done);
  const oldest = shiftPeriod(period, -(PAID_MONTHS - 1));
  const paid = bills.bills.filter((bill) => billStatus(bill, people).done && bill.period >= oldest);
  const paidByMonth = [];
  paid.forEach((bill) => {
    const group = paidByMonth.find((entry) => entry.period === bill.period);
    if (group) group.bills.push(bill);
    else paidByMonth.push({ period: bill.period, bills: [bill] });
  });
  paidByMonth.sort((a, b) => (a.period < b.period ? 1 : -1));
  const year = now.getFullYear();
  const yearTotal = monthTotals(bills.bills, year).reduce((sum, value) => sum + value, 0);

  return (
    <section className="view bills-view" aria-labelledby="bills-title">
      <header className="cleaning-head">
        <div>
          <span className="eyebrow">Casa · a medias</span>
          <h1 id="bills-title">Cuentas</h1>
          <p>
            Alquiler y facturas · {year}: {formatMoney(yearTotal)} en casa, {formatMoney(yearTotal / Math.max(1, people.length))} cada
            uno
          </p>
        </div>
      </header>

      {bills.error ? (
        <div className="inline-alert" role="status">
          No se pudo sincronizar: {bills.error}. Se reintentará solo.
        </div>
      ) : null}

      <div className="bills-layout">
        <section className="card bills-list" aria-label="Facturas">
          <h2>{pending.length ? `Por pagar · ${pending.length}` : "Por pagar"}</h2>
          {pending.length ? (
            <ul>
              {pending.map((bill) => (
                <BillRow key={bill.id} bill={bill} bills={bills} people={people} />
              ))}
            </ul>
          ) : (
            <p className="bills-empty">Todo pagado. Casa en orden.</p>
          )}

          {paidByMonth.map((group) => (
            <section key={group.period} className="bills-paid">
              <h2>Pagado en {periodLabel(group.period, group.period.slice(0, 4) !== String(year))}</h2>
              <ul>
                {group.bills.map((bill) => (
                  <BillRow key={bill.id} bill={bill} bills={bills} people={people} compact />
                ))}
              </ul>
            </section>
          ))}
        </section>

        <aside className="tasks-side bills-side">
          <YearChart bills={bills.bills} people={people} now={now} />
          <NewBill bills={bills} people={people} now={now} />
          <RentRule bills={bills} />
        </aside>
      </div>
    </section>
  );
}

// Una factura: qué es, cuánto, comparación y la parte de cada uno, que se
// marca pagada con un toque. Borrar pide un segundo toque.
function BillRow({ bill, bills, people, compact = false }) {
  const [confirming, setConfirming] = useState(false);
  const status = billStatus(bill, people);
  const compare = compareBill(bill, bills.bills);
  const Icon = KIND_ICONS[bill.kind] || Receipt;
  const each = shareOf(bill, people.length);
  const meta = [dueLabel(bill.dueOn), compare ? compare.label : ""].filter(Boolean);

  return (
    <li className={`bill${status.done ? " is-done" : ""}${compact ? " is-compact" : ""}`}>
      <div className="bill__main">
        <span className={`bill__icon kind-${bill.kind}`} aria-hidden="true">
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <span className="bill__copy">
          <strong>{billTitle(bill)}</strong>
          {meta.length ? (
            <small className={compare && compare.alert ? "is-alert" : undefined}>{meta.join(" · ")}</small>
          ) : null}
        </span>
        <span className="bill__amount">{formatMoney(bill.amount)}</span>
        {confirming ? (
          <button type="button" className="bill__delete is-confirm" onClick={() => bills.removeBill(bill.id)}>
            Borrar
          </button>
        ) : (
          <button type="button" className="bill__delete" onClick={() => setConfirming(true)} aria-label={`Borrar ${billTitle(bill)}`}>
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="bill__people" role="group" aria-label="Quién ha pagado su parte">
        {people.map((person) => {
          const done = status.paid.has(person.id);
          return (
            <button
              key={person.id}
              type="button"
              className={`bill__share tone-${person.tone}${done ? " is-paid" : ""}`}
              aria-pressed={done}
              onClick={() => bills.setPaid(bill.id, person.id, !done)}
            >
              <span className="who-dot" aria-hidden="true" />
              {person.name} · {formatMoney(each)}
              <em>{done ? "pagado" : "pendiente"}</em>
            </button>
          );
        })}
      </div>
    </li>
  );
}

// Las facturas de cada mes del año, en barras (sin el alquiler: es fijo y
// aplastaría las diferencias). Al tocar un mes, su resumen con todo.
function YearChart({ bills, people, now }) {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const totals = monthTotals(bills.filter((bill) => bill.kind !== "alquiler"), year);
  const top = Math.max(1, ...totals);
  const selected = `${year}-${String(month + 1).padStart(2, "0")}`;
  const summary = monthSummary(bills, selected, people.length);
  const isCurrent = (index) => year === now.getFullYear() && index === now.getMonth();

  return (
    <section className="card bills-chart" aria-label="Gasto del año">
      <div className="bills-chart__head">
        <h2>Facturas de {year} · sin alquiler</h2>
        <span>
          <button type="button" onClick={() => setYear(year - 1)} aria-label="Año anterior">
            <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setYear(year + 1)} disabled={year >= now.getFullYear()} aria-label="Año siguiente">
            <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </span>
      </div>
      <div className="bills-chart__bars">
        {totals.map((total, index) => (
          <button
            key={index}
            type="button"
            className={`bills-chart__bar${index === month ? " is-on" : ""}${isCurrent(index) ? " is-now" : ""}`}
            onClick={() => setMonth(index)}
            aria-label={`${periodLabel(`${year}-${String(index + 1).padStart(2, "0")}`)}: ${formatMoney(total)}`}
          >
            <i style={{ height: `${Math.round((total / top) * 100)}%` }} />
            <span>{MONTH_INITIALS[index]}</span>
          </button>
        ))}
      </div>
      <p className="bills-chart__summary">
        <strong>{capitalize(periodLabel(selected))}</strong>
        {summary.total
          ? ` · ${formatMoney(summary.total)}, ${formatMoney(summary.each)} cada uno`
          : " · sin facturas"}
        {summary.byKind.length ? (
          <small>{summary.byKind.map((entry) => `${entry.label} ${formatMoney(entry.total)}`).join(" · ")}</small>
        ) : null}
      </p>
    </section>
  );
}

// Apuntar una factura: tipo, importe, mes y, si es antigua, ya pagada.
function NewBill({ bills, people, now }) {
  const inputRef = useRef(null);
  const [kind, setKind] = useState("luz");
  const [monthsAgo, setMonthsAgo] = useState(0);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [message, setMessage] = useState(null);
  const period = shiftPeriod(periodOf(now), -monthsAgo);

  function submit(event) {
    event.preventDefault();
    const amount = parseAmount(inputRef.current ? inputRef.current.value : "");
    if (!amount) {
      setMessage({ alert: true, text: "Escribe el importe, por ejemplo 62,40." });
      return;
    }
    const draft = { id: "nueva", kind, period, amount };
    const compare = compareBill(draft, bills.bills);
    bills.addBill({ kind, period, amount, paid: alreadyPaid }, people);
    inputRef.current.value = "";
    setMessage({
      alert: Boolean(compare && compare.alert),
      text: `Apuntada: ${billTitle(draft).toLowerCase()}, ${formatMoney(amount / Math.max(1, people.length))} cada uno${
        compare ? ` · ${compare.label}` : ""
      }.`,
    });
  }

  return (
    <form className="card bills-new" onSubmit={submit} aria-label="Nueva factura">
      <h2>Nueva factura</h2>
      <div className="tasks-chips" role="group" aria-label="De qué es">
        {BILL_KINDS.filter((item) => item.id !== "alquiler").map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tasks-chip is-small${kind === item.id ? " is-on" : ""}`}
            aria-pressed={kind === item.id}
            onClick={() => setKind(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="tasks-chips" role="group" aria-label="De qué mes">
        {[0, 1, 2].map((offset) => (
          <button
            key={offset}
            type="button"
            className={`tasks-chip is-small${monthsAgo === offset ? " is-on" : ""}`}
            aria-pressed={monthsAgo === offset}
            onClick={() => setMonthsAgo(offset)}
          >
            {capitalize(periodLabel(shiftPeriod(periodOf(now), -offset)))}
          </button>
        ))}
        <button
          type="button"
          className={`tasks-chip is-small${alreadyPaid ? " is-on" : ""}`}
          aria-pressed={alreadyPaid}
          onClick={() => setAlreadyPaid(!alreadyPaid)}
        >
          Ya pagada
        </button>
      </div>
      <div className="bills-new__row">
        <input ref={inputRef} inputMode="decimal" placeholder="Importe, p. ej. 62,40" aria-label="Importe en euros" enterKeyHint="done" />
        <button type="submit" className="bills-new__add">
          Apuntar
        </button>
      </div>
      {message ? <p className={`bills-new__msg${message.alert ? " is-alert" : ""}`}>{message.text}</p> : null}
    </form>
  );
}

// El alquiler: importe al mes y del día X al Y. Se puede pausar.
function RentRule({ bills }) {
  const rule = bills.rules.find((item) => item.id === "alquiler") || null;
  const [editing, setEditing] = useState(false);
  const amountRef = useRef(null);
  const [days, setDays] = useState(() => (rule ? [rule.dayFrom, rule.dayTo] : [1, 5]));
  const [error, setError] = useState("");

  function save(event) {
    event.preventDefault();
    const amount = parseAmount(amountRef.current ? amountRef.current.value : "");
    if (!amount) {
      setError("Escribe el importe del alquiler.");
      return;
    }
    bills.saveRule("alquiler", { kind: "alquiler", title: null, amount, dayFrom: days[0], dayTo: days[1], active: true });
    setError("");
    setEditing(false);
  }

  if (!editing) {
    return (
      <section className="card bills-rent" aria-label="Alquiler">
        <h2>Alquiler</h2>
        {rule ? (
          <p>
            <strong>{formatMoney(rule.amount)}</strong> al mes, del día {rule.dayFrom} al {rule.dayTo}
            {rule.active ? "" : " · en pausa"}
          </p>
        ) : (
          <p>Apunta el alquiler y saldrá cada mes, con aviso en Hoy y en Telegram.</p>
        )}
        <div className="tasks-chips">
          <button type="button" className="tasks-chip is-small" onClick={() => setEditing(true)}>
            {rule ? "Cambiar" : "Apuntar el alquiler"}
          </button>
          {rule ? (
            <button
              type="button"
              className="tasks-chip is-small"
              onClick={() => bills.saveRule("alquiler", { ...rule, active: !rule.active })}
            >
              {rule.active ? "Pausar" : "Reanudar"}
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <form className="card bills-rent" onSubmit={save} aria-label="Alquiler">
      <h2>Alquiler</h2>
      <div className="bills-new__row">
        <input
          ref={amountRef}
          inputMode="decimal"
          defaultValue={rule ? String(rule.amount).replace(".", ",") : ""}
          placeholder="Importe al mes"
          aria-label="Importe del alquiler"
        />
        <button type="submit" className="bills-new__add">
          Guardar
        </button>
      </div>
      <div className="tasks-chips" role="group" aria-label="Plazo de pago">
        {[
          [1, 5],
          [1, 10],
          [25, 28],
        ].map(([from, to]) => (
          <button
            key={`${from}-${to}`}
            type="button"
            className={`tasks-chip is-small${days[0] === from && days[1] === to ? " is-on" : ""}`}
            aria-pressed={days[0] === from && days[1] === to}
            onClick={() => setDays([from, to])}
          >
            Del {from} al {to}
          </button>
        ))}
      </div>
      {error ? <p className="bills-new__msg is-alert">{error}</p> : null}
    </form>
  );
}
