import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequest } from "../lib/api";
import { periodOf } from "../lib/bills";
import { loadDemoBills, saveDemoBills } from "../lib/localStore";
import { onPollingResume, pollingPaused, pollInterval } from "../lib/polling";
import { useStableFns } from "./useStableFns";

const REFRESH_MS = 5 * 60 * 1000;
const EMPTY = { bills: [], rules: [] };

// En la demo no hay Worker: la factura del mes de cada regla se crea aquí.
function withRuleBills(data, now = new Date()) {
  const period = periodOf(now);
  const missing = data.rules.filter(
    (rule) => rule.active && !data.bills.some((bill) => bill.ruleId === rule.id && bill.period === period)
  );
  if (!missing.length) return data;
  const created = missing.map((rule) => ({
    id: `bl-${rule.id}-${period}`,
    kind: rule.kind,
    title: rule.title || null,
    period,
    amount: rule.amount,
    dueOn: `${period}-${String(rule.dayTo).padStart(2, "0")}`,
    ruleId: rule.id,
    payments: [],
  }));
  return { ...data, bills: [...created, ...data.bills] };
}

// Cuentas de casa: alquiler y facturas, a medias. Como los puntos, cada
// escritura devuelve todo y `pending` evita que el sondeo la pise.
export function useBills() {
  const [data, setData] = useState(() => (DEMO_MODE ? withRuleBills(loadDemoBills()) : EMPTY));
  const [error, setError] = useState(null);
  const pending = useRef(0);
  const lastKey = useRef("");

  const apply = useCallback((next) => {
    const value = next && Array.isArray(next.bills) ? { bills: next.bills, rules: next.rules || [] } : EMPTY;
    const key = JSON.stringify(value);
    if (key === lastKey.current) return;
    lastKey.current = key;
    setData(value);
  }, []);

  const load = useCallback(async () => {
    if (DEMO_MODE || pending.current > 0) return;
    try {
      apply(await apiRequest("/api/bills"));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar las cuentas");
    }
  }, [apply]);

  useEffect(() => {
    if (DEMO_MODE) return undefined;
    load();
    const timer = setInterval(() => {
      if (!pollingPaused()) load();
    }, pollInterval(REFRESH_MS));
    const stopResume = onPollingResume(load);
    return () => {
      clearInterval(timer);
      stopResume();
    };
  }, [load]);

  useEffect(() => {
    if (DEMO_MODE) saveDemoBills(data);
  }, [data]);

  // Cambio optimista en la demo y en la pantalla; con Worker, se confirma
  // con lo que devuelve y, si falla, se vuelve atrás.
  async function write(change, request) {
    const previous = data;
    setData((current) => change(current));
    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const next = await request();
      pending.current -= 1;
      apply(next);
      setError(null);
    } catch (caught) {
      pending.current -= 1;
      setData(previous);
      setError(caught instanceof Error ? caught.message : "No se pudieron guardar las cuentas");
    }
  }

  function addBill({ kind, title = null, period, amount, dueOn = null, paid = false }, people = []) {
    const draft = {
      id: `bl-${Date.now()}`,
      kind,
      title,
      period,
      amount,
      dueOn,
      ruleId: null,
      payments: paid ? people.map((person) => ({ personId: person.id, paidAt: new Date().toISOString() })) : [],
    };
    return write(
      (current) => ({ ...current, bills: [draft, ...current.bills] }),
      () => apiRequest("/api/bills", { method: "POST", body: { kind, title, period, amount, dueOn, paid } })
    );
  }

  function updateBill(id, patch) {
    return write(
      (current) => ({ ...current, bills: current.bills.map((bill) => (bill.id === id ? { ...bill, ...patch } : bill)) }),
      () => apiRequest(`/api/bills/${encodeURIComponent(id)}`, { method: "PATCH", body: patch })
    );
  }

  function removeBill(id) {
    return write(
      (current) => ({ ...current, bills: current.bills.filter((bill) => bill.id !== id) }),
      () => apiRequest(`/api/bills/${encodeURIComponent(id)}`, { method: "DELETE" })
    );
  }

  function setPaid(billId, personId, paid) {
    return write(
      (current) => ({
        ...current,
        bills: current.bills.map((bill) => {
          if (bill.id !== billId) return bill;
          const others = bill.payments.filter((payment) => payment.personId !== personId);
          return { ...bill, payments: paid ? [...others, { personId, paidAt: new Date().toISOString() }] : others };
        }),
      }),
      () =>
        apiRequest(`/api/bills/${encodeURIComponent(billId)}/payments/${encodeURIComponent(personId)}`, {
          method: "PUT",
          body: { paid },
        })
    );
  }

  // El alquiler: importe, plazo (del día 1 al 5) y si está activo. El mes en
  // curso se actualiza si nadie ha pagado todavía.
  function saveRule(id, rule) {
    const period = periodOf(new Date());
    return write(
      (current) =>
        withRuleBills({
          rules: [...current.rules.filter((item) => item.id !== id), { id, ...rule }],
          bills: current.bills.map((bill) =>
            bill.ruleId === id && bill.period === period && !bill.payments.length
              ? { ...bill, amount: rule.amount, dueOn: `${period}-${String(rule.dayTo).padStart(2, "0")}` }
              : bill
          ),
        }),
      () => apiRequest(`/api/bills/rules/${encodeURIComponent(id)}`, { method: "PUT", body: rule })
    );
  }

  const actions = useStableFns({ addBill, updateBill, removeBill, setPaid, saveRule });
  return useMemo(() => ({ ...data, error, ...actions }), [data, error, actions]);
}
