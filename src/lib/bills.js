import { numberFormat } from "./intl";

// Cuentas de casa: alquiler y facturas, a medias entre los de casa. Lo usan
// la pantalla Cuentas, el aviso de Hoy y el bot de Telegram (worker), así
// que no toca el DOM.

export const BILL_KINDS = [
  { id: "alquiler", label: "Alquiler" },
  { id: "luz", label: "Luz" },
  { id: "agua", label: "Agua" },
  { id: "basura", label: "Basura" },
  { id: "gas", label: "Gas" },
  { id: "internet", label: "Internet" },
  { id: "comunidad", label: "Comunidad" },
  { id: "otro", label: "Otra" },
];

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const MONEY = { style: "currency", currency: "EUR" };
const PERCENT = { maximumFractionDigits: 0 };

// Una subida mayor que esta respecto a la de referencia se avisa.
export const RISE_ALERT = 0.3;

export function kindLabel(kind) {
  const found = BILL_KINDS.find((item) => item.id === kind);
  return found ? found.label : "Factura";
}

export function formatMoney(value) {
  return numberFormat(MONEY).format(Number(value) || 0);
}

export function periodOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// "2026-10" → «octubre» (o «octubre de 2026»).
export function periodLabel(period, withYear = false) {
  const month = MONTHS[Number(String(period).slice(5, 7)) - 1] || "";
  return withYear ? `${month} de ${String(period).slice(0, 4)}` : month;
}

export function shiftPeriod(period, months) {
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7)) - 1 + months;
  const date = new Date(year, month, 1);
  return periodOf(date);
}

// «Luz de octubre»; si es de otro año, «Luz de octubre de 2025».
export function billTitle(bill) {
  const otherYear = String(bill.period).slice(0, 4) !== String(new Date().getFullYear());
  return bill.title || `${kindLabel(bill.kind)} de ${periodLabel(bill.period, otherYear)}`;
}

// A medias: lo que le toca a cada uno, con céntimos.
export function shareOf(bill, peopleCount) {
  return Math.round((Number(bill.amount) / Math.max(1, peopleCount)) * 100) / 100;
}

// Quién ha pagado su parte y quién no.
export function billStatus(bill, people) {
  const paid = new Set((bill.payments || []).map((payment) => payment.personId));
  const missing = (people || []).filter((person) => !paid.has(person.id));
  return { paid, missing, done: (people || []).length > 0 && missing.length === 0 };
}

// Contra qué se compara una factura: la del mismo tipo y mes del año
// anterior y, si no hay, la anterior del mismo tipo. El alquiler no varía.
export function compareBill(bill, bills) {
  if (!bill || bill.kind === "alquiler") return null;
  const same = (bills || []).filter((item) => item.kind === bill.kind && item.id !== bill.id && item.period < bill.period);
  const lastYear = shiftPeriod(bill.period, -12);
  const ref = same.find((item) => item.period === lastYear) || same.sort((a, b) => (a.period < b.period ? 1 : -1))[0];
  if (!ref || !Number(ref.amount)) return null;
  const change = (Number(bill.amount) - Number(ref.amount)) / Number(ref.amount);
  const sign = change > 0 ? "+" : "−";
  const percent = numberFormat(PERCENT).format(Math.abs(change) * 100);
  const when = periodLabel(ref.period, ref.period === lastYear);
  return {
    change,
    alert: change > RISE_ALERT,
    label: percent === "0" ? `igual que ${when}` : `${sign}${percent} % que ${when}`,
  };
}

// Total de cada mes de un año (enero a diciembre), para el gráfico.
export function monthTotals(bills, year) {
  const totals = MONTHS.map(() => 0);
  (bills || []).forEach((bill) => {
    if (String(bill.period).slice(0, 4) !== String(year)) return;
    totals[Number(bill.period.slice(5, 7)) - 1] += Number(bill.amount) || 0;
  });
  return totals.map((total) => Math.round(total * 100) / 100);
}

// Lo de un mes: total, lo de cada uno y por tipo (lo más caro primero).
export function monthSummary(bills, period, peopleCount) {
  const mine = (bills || []).filter((bill) => bill.period === period);
  const total = mine.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  const byKind = BILL_KINDS.map((kind) => ({
    kind: kind.id,
    label: kind.label,
    total: mine.filter((bill) => bill.kind === kind.id).reduce((sum, bill) => sum + Number(bill.amount), 0),
  }))
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total);
  return {
    bills: mine,
    total: Math.round(total * 100) / 100,
    each: Math.round((total / Math.max(1, peopleCount)) * 100) / 100,
    byKind,
  };
}

// «12,50» o «12.50» → 12.5; si no es un importe válido, null.
export function parseAmount(text) {
  const clean = String(text || "").replace(/[€\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const value = Number(clean);
  return Number.isFinite(value) && value > 0 && value <= 100000 ? Math.round(value * 100) / 100 : null;
}
