// BBDS · Cuentas: alquiler y facturas de casa, a medias.
// Cada persona marca su parte como pagada. El alquiler es una regla: al leer
// las cuentas se crea la factura del mes en curso si aún no existe.
import { BILL_KINDS, billStatus, billTitle, compareBill, formatMoney, kindLabel, monthSummary, periodLabel, shareOf, shiftPeriod } from "../src/lib/bills.js";
import { fetchPeople, HttpError, json, normalizeDateValue, normalizeText, readJson, requireDashboard } from "./index.js";

const KINDS = new Set(BILL_KINDS.map((kind) => kind.id));
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const RULE_ID_RE = /^[a-z0-9_-]{1,32}$/;
// Lo que se manda a la app: unos dos años, de sobra para comparar.
const BILLS_LIMIT = 200;

// Fecha de Madrid: YYYY-MM-DD.
export function madridDay(at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

function normalizeAmount(raw) {
  const value = Math.round(Number(raw) * 100) / 100;
  if (!Number.isFinite(value) || value <= 0 || value > 100000) throw new HttpError(400, "El importe debe ser mayor que 0");
  return value;
}

function normalizePeriod(raw) {
  const value = String(raw || "");
  if (!PERIOD_RE.test(value)) throw new HttpError(400, "El mes debe tener el formato YYYY-MM");
  return value;
}

function normalizeKind(raw) {
  const value = String(raw || "");
  if (!KINDS.has(value)) throw new HttpError(400, "Tipo de factura desconocido");
  return value;
}

function normalizeTitle(raw) {
  return normalizeText(raw).slice(0, 60) || null;
}

function rowToRule(row) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title || null,
    amount: Number(row.amount),
    dayFrom: Number(row.day_from),
    dayTo: Number(row.day_to),
    active: Boolean(row.active),
  };
}

// La factura del mes de cada regla activa, si aún no está. El índice único
// (rule_id, period) evita duplicados aunque dos lecturas lleguen a la vez.
export async function ensureRuleBills(env, at = new Date()) {
  const today = madridDay(at);
  const period = today.slice(0, 7);
  const { results } = await env.DB.prepare("SELECT * FROM bill_rules WHERE active = 1").all();
  const rules = (results || []).map(rowToRule);
  if (!rules.length) return;
  const now = at.toISOString();
  await env.DB.batch(
    rules.map((rule) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO bills (id, kind, title, period, amount, due_on, rule_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        `bl-${rule.id}-${period}`,
        rule.kind,
        rule.title,
        period,
        rule.amount,
        `${period}-${String(rule.dayTo).padStart(2, "0")}`,
        rule.id,
        now
      )
    )
  );
}

export async function fetchBills(env) {
  const [billsResult, paymentsResult, rulesResult] = await Promise.all([
    env.DB.prepare(
      `SELECT id, kind, title, period, amount, due_on, rule_id, created_at FROM bills
        ORDER BY period DESC, created_at DESC LIMIT ?`
    )
      .bind(BILLS_LIMIT)
      .all(),
    env.DB.prepare("SELECT bill_id, person_id, paid_at FROM bill_payments").all(),
    env.DB.prepare("SELECT * FROM bill_rules ORDER BY id").all(),
  ]);
  const payments = {};
  (paymentsResult.results || []).forEach((row) => {
    (payments[row.bill_id] = payments[row.bill_id] || []).push({ personId: row.person_id, paidAt: row.paid_at });
  });
  return {
    bills: (billsResult.results || []).map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title || null,
      period: row.period,
      amount: Number(row.amount),
      dueOn: row.due_on || null,
      ruleId: row.rule_id || null,
      createdAt: row.created_at,
      payments: payments[row.id] || [],
    })),
    rules: (rulesResult.results || []).map(rowToRule),
  };
}

async function billsPayload(env) {
  await ensureRuleBills(env);
  return fetchBills(env);
}

// `paid: true` la apunta ya pagada por todos (facturas antiguas, para tener
// con qué comparar).
export async function createBill(env, { kind, title, period, amount, dueOn, paid }) {
  const id = `bl-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const statements = [
    env.DB.prepare(
      "INSERT INTO bills (id, kind, title, period, amount, due_on, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, normalizeKind(kind), normalizeTitle(title), normalizePeriod(period), normalizeAmount(amount), normalizeDateValue(dueOn, "El vencimiento"), now),
  ];
  if (paid === true) {
    (await fetchPeople(env)).forEach((person) => {
      statements.push(env.DB.prepare("INSERT INTO bill_payments (bill_id, person_id, paid_at) VALUES (?, ?, ?)").bind(id, person.id, now));
    });
  }
  await env.DB.batch(statements);
  return id;
}

export async function setPayment(env, billId, personId, paid) {
  const bill = await env.DB.prepare("SELECT id FROM bills WHERE id = ?").bind(billId).first();
  if (!bill) throw new HttpError(404, "Factura no encontrada");
  const person = await env.DB.prepare("SELECT id FROM people WHERE id = ?").bind(personId).first();
  if (!person) throw new HttpError(400, "Persona desconocida");
  if (paid) {
    await env.DB.prepare("INSERT OR REPLACE INTO bill_payments (bill_id, person_id, paid_at) VALUES (?, ?, ?)")
      .bind(billId, personId, new Date().toISOString())
      .run();
  } else {
    await env.DB.prepare("DELETE FROM bill_payments WHERE bill_id = ? AND person_id = ?").bind(billId, personId).run();
  }
}

export async function handleBills(request, env, url) {
  requireDashboard(request, env);
  const path = url.pathname;

  if (path === "/api/bills" && request.method === "GET") {
    return json(await billsPayload(env));
  }

  if (path === "/api/bills" && request.method === "POST") {
    const body = await readJson(request);
    await createBill(env, body);
    return json(await billsPayload(env), 201);
  }

  const rule = path.match(/^\/api\/bills\/rules\/([a-z0-9_-]+)$/);
  if (rule && request.method === "PUT") {
    if (!RULE_ID_RE.test(rule[1])) throw new HttpError(400, "Regla no válida");
    const body = await readJson(request);
    const dayFrom = Math.round(Number(body.dayFrom) || 1);
    const dayTo = Math.round(Number(body.dayTo) || 5);
    if (dayFrom < 1 || dayTo > 28 || dayFrom > dayTo) throw new HttpError(400, "Los días deben ir del 1 al 28, en orden");
    await env.DB.prepare(
      `INSERT INTO bill_rules (id, kind, title, amount, day_from, day_to, active) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, title = excluded.title, amount = excluded.amount,
         day_from = excluded.day_from, day_to = excluded.day_to, active = excluded.active`
    )
      .bind(rule[1], normalizeKind(body.kind || "alquiler"), normalizeTitle(body.title), normalizeAmount(body.amount), dayFrom, dayTo, body.active === false ? 0 : 1)
      .run();
    // El importe nuevo vale también para el mes en curso si nadie ha pagado aún.
    const period = madridDay().slice(0, 7);
    await env.DB.prepare(
      `UPDATE bills SET amount = ?, due_on = ? WHERE rule_id = ? AND period = ?
         AND NOT EXISTS (SELECT 1 FROM bill_payments WHERE bill_id = bills.id)`
    )
      .bind(normalizeAmount(body.amount), `${period}-${String(dayTo).padStart(2, "0")}`, rule[1], period)
      .run();
    return json(await billsPayload(env));
  }

  const payment = path.match(/^\/api\/bills\/([a-z0-9_-]+)\/payments\/([a-z0-9_-]+)$/);
  if (payment && request.method === "PUT") {
    const body = await readJson(request);
    await setPayment(env, payment[1], payment[2], body.paid !== false);
    return json(await billsPayload(env));
  }

  const one = path.match(/^\/api\/bills\/([a-z0-9_-]+)$/);
  if (one && request.method === "PATCH") {
    const body = await readJson(request);
    const existing = await env.DB.prepare("SELECT * FROM bills WHERE id = ?").bind(one[1]).first();
    if (!existing) throw new HttpError(404, "Factura no encontrada");
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
    await env.DB.prepare("UPDATE bills SET kind = ?, title = ?, period = ?, amount = ?, due_on = ? WHERE id = ?")
      .bind(
        has("kind") ? normalizeKind(body.kind) : existing.kind,
        has("title") ? normalizeTitle(body.title) : existing.title,
        has("period") ? normalizePeriod(body.period) : existing.period,
        has("amount") ? normalizeAmount(body.amount) : existing.amount,
        has("dueOn") ? normalizeDateValue(body.dueOn, "El vencimiento") : existing.due_on,
        one[1]
      )
      .run();
    return json(await billsPayload(env));
  }

  if (one && request.method === "DELETE") {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM bill_payments WHERE bill_id = ?").bind(one[1]),
      env.DB.prepare("DELETE FROM bills WHERE id = ?").bind(one[1]),
    ]);
    return json(await billsPayload(env));
  }

  throw new HttpError(405, "Método no permitido");
}

// ---------------------------------------------------------------------------
// Para el bot: lo pendiente, los avisos del día y el resumen del mes.

export async function pendingBills(env) {
  await ensureRuleBills(env);
  const [{ bills }, people] = await Promise.all([fetchBills(env), fetchPeople(env)]);
  return {
    people,
    bills,
    pending: bills.filter((bill) => !billStatus(bill, people).done),
  };
}

function esc(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Una factura en el bot (HTML de Telegram): importe, parte de cada uno,
// comparación y quién ha pagado.
export function billLine(bill, people, bills) {
  const status = billStatus(bill, people);
  const each = formatMoney(shareOf(bill, people.length));
  const who = people.map((person) => `${person.name} ${status.paid.has(person.id) ? "✓" : "—"}`).join(" · ");
  const compare = compareBill(bill, bills);
  const versus = compare ? `, ${compare.label}${compare.alert ? " ⚠️" : ""}` : "";
  return `<b>${esc(billTitle(bill))}</b>: ${formatMoney(bill.amount)} (${each} cada uno)${versus}\n${esc(who)}`;
}

// Lo que el bot dice cada mañana (cron). Vacío si no hay nada que decir.
export async function dailyNotices(env, at = new Date()) {
  const today = madridDay(at);
  const day = Number(today.slice(8, 10));
  const period = today.slice(0, 7);
  const { people, bills, pending } = await pendingBills(env);
  const { results } = await env.DB.prepare("SELECT * FROM bill_rules WHERE active = 1").all();
  const rules = (results || []).map(rowToRule);
  const lines = [];

  // Día 1: cómo fue el mes pasado.
  if (day === 1) {
    const last = shiftPeriod(period, -1);
    const summary = monthSummary(bills, last, people.length);
    if (summary.total > 0) {
      lines.push(
        `<b>${periodLabel(last, true).replace(/^./, (c) => c.toUpperCase())}</b>: ${formatMoney(summary.total)} en casa, ${formatMoney(summary.each)} cada uno.`,
        summary.byKind.map((entry) => `${entry.label} ${formatMoney(entry.total)}`).join(" · ")
      );
    }
  }

  // Alquiler: el primer día del plazo y el penúltimo, si falta alguien.
  rules.forEach((rule) => {
    if (day !== rule.dayFrom && day !== Math.max(rule.dayFrom, rule.dayTo - 1)) return;
    const bill = pending.find((item) => item.ruleId === rule.id && item.period === period);
    if (!bill) return;
    const missing = billStatus(bill, people).missing.map((person) => person.name);
    lines.push(
      `${kindLabel(rule.kind)} de ${periodLabel(period)}: ${formatMoney(shareOf(bill, people.length))} cada uno, antes del día ${rule.dayTo}. Falta: ${missing.join(" y ")}.`
    );
  });

  // Facturas sueltas que vencen hoy o mañana.
  const tomorrow = madridDay(new Date(at.getTime() + 86400000));
  pending
    .filter((bill) => !bill.ruleId && bill.dueOn && (bill.dueOn === today || bill.dueOn === tomorrow))
    .forEach((bill) => {
      lines.push(`${esc(billTitle(bill))} vence ${bill.dueOn === today ? "hoy" : "mañana"}: falta ${billStatus(bill, people).missing.map((person) => person.name).join(" y ")}.`);
    });

  return lines.join("\n\n");
}
