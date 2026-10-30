import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequest, apiRequestWithMeta } from "../lib/api";
import { DEMO_PEOPLE, loadDemoLists, saveDemoLists } from "../lib/localStore";
import { reportFailure, reportSync } from "../lib/freshness";
import { onPollingResume, pollingPaused, pollInterval } from "../lib/polling";
import { rememberShopping } from "../lib/usualShopping";

const REFRESH_MS = 20 * 1000;

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function personFor(people, personId) {
  return people.find((person) => person.id === personId) || null;
}

// Lo que se ve de una lista, sin la hora interna de cada elemento: el
// servidor la renueva en cada escritura y no cambia nada en pantalla.
function visibleKey(items) {
  return JSON.stringify(
    items.map((item) => [item.id, item.listId, item.text, item.done, item.dueOn, item.dueAt, item.person ? item.person.id : null, item.points, item.doneBy, item.drawing ? item.drawing.length : 0])
  );
}

function sameVisible(a, b) {
  return visibleKey([a]) === visibleKey([b]);
}

export function useLists() {
  const [items, setItems] = useState(() =>
    DEMO_MODE ? loadDemoLists() : []
  );
  const [people, setPeople] = useState(() => DEMO_MODE ? DEMO_PEOPLE : []);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  // La hora de sincronización solo se ve en Listas, que se repinta con el
  // reloj: guardarla como estado repintaba toda la app cada minuto.
  const lastUpdated = useRef(null);
  const pending = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const peopleRef = useRef(people);
  peopleRef.current = people;

  const applySnapshot = useCallback((payload, meta) => {
    const nextItems = Array.isArray(payload.items) ? payload.items : [];
    const nextPeople = Array.isArray(payload.people) ? payload.people : null;
    const at = (meta && meta.cachedAt) || new Date().toISOString();
    // El sondeo cada 20 s casi nunca trae cambios. Guardar arrays nuevos
    // repintaba toda la app (en el marco, ~150 ms cada vez): solo se aplica si
    // cambia algo de lo que se ve respecto a lo que hay en pantalla, también
    // justo después de una escritura local.
    if (visibleKey(nextItems) !== visibleKey(itemsRef.current)) setItems(nextItems);
    if (nextPeople && JSON.stringify(nextPeople) !== JSON.stringify(peopleRef.current)) setPeople(nextPeople);
    lastUpdated.current = at;
    reportSync("lists", {
      at,
      cachedAt: meta && meta.offline ? at : null,
      detail:
        meta && meta.offline ? "Mostrando la última copia guardada" : null,
    });
  }, []);

  const refresh = useCallback(
    async (silent = false) => {
      if (DEMO_MODE) {
        setItems(loadDemoLists());
        setPeople(DEMO_PEOPLE);
        const at = new Date().toISOString();
        lastUpdated.current = at;
        setError(null);
        setLoading(false);
        reportSync("lists", { at });
        return;
      }
      if (pending.current > 0) return;

      if (!silent) setLoading(true);
      try {
        const { data, meta } = await apiRequestWithMeta("/api/lists");
        applySnapshot(data, meta);
        setError(null);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "No se pudieron cargar las listas";
        setError(message);
        reportFailure("lists", message);
      } finally {
        setLoading(false);
      }
    },
    [applySnapshot]
  );

  useEffect(() => {
    refresh(false);
    if (DEMO_MODE) return undefined;

    // Sin sondeos con el salvapantallas abierto; al cerrarlo, uno al momento.
    const tick = () => refresh(true);
    const timer = setInterval(() => {
      if (!pollingPaused()) tick();
    }, pollInterval(REFRESH_MS));
    const stopResume = onPollingResume(tick);
    function handleVisibility() {
      if (document.visibilityState === "visible") refresh(true);
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      stopResume();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  useEffect(() => {
    if (DEMO_MODE) saveDemoLists(items);
  }, [items]);

  const addItem = useCallback(async (listId, rawText, meta = {}) => {
    const text = String(rawText || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    if (text.length > 160) {
      setError("El texto es demasiado largo (máximo 160 caracteres)");
      return;
    }

    setError(null);
    if (listId === "shopping") rememberShopping(text);
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const personId =
      listId === "tasks" && meta.personId ? String(meta.personId) : null;
    const optimistic = {
      id: tempId,
      listId,
      text,
      done: false,
      dueOn: listId === "tasks" ? meta.dueOn || null : null,
      dueAt: listId === "tasks" ? meta.dueAt || null : null,
      person: personId ? personFor(peopleRef.current, personId) : null,
      points: listId === "tasks" && meta.points ? Number(meta.points) : null,
      doneBy: null,
      createdAt: new Date().toISOString(),
    };
    setItems((current) => [...current, optimistic]);

    if (DEMO_MODE) {
      setItems((current) =>
        current.map((item) =>
          item.id === tempId
            ? {
                ...item,
                id: `demo-${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 5)}`,
              }
            : item
        )
      );
      return;
    }

    pending.current += 1;
    try {
      const payload = await apiRequest("/api/lists", {
        method: "POST",
        body: {
          listId,
          text,
          ...(listId === "tasks"
            ? {
                dueOn: optimistic.dueOn,
                dueAt: optimistic.dueAt,
                personId,
                points: optimistic.points,
              }
            : {}),
        },
      });
      if (payload && payload.item) {
        setItems((current) =>
          current.map((item) => (item.id === tempId ? payload.item : item))
        );
      }
    } catch (caught) {
      setItems((current) => current.filter((item) => item.id !== tempId));
      const message =
        caught instanceof Error ? caught.message : "No se pudo añadir";
      setError(message);
      reportFailure("lists", message);
    } finally {
      pending.current -= 1;
    }
  }, []);

  // `doneBy`: quién la ha hecho, para las tareas libres (se lleva los puntos).
  const toggleItem = useCallback(async (item, doneBy = null) => {
    const nextDone = !item.done;
    const by = nextDone && doneBy ? String(doneBy) : null;
    const optimistic = { ...item, done: nextDone, doneBy: by, updatedAt: new Date().toISOString() };
    setError(null);
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? optimistic : entry))
    );

    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const payload = await apiRequest(
        `/api/lists/${encodeURIComponent(item.id)}`,
        { method: "PATCH", body: by ? { done: nextDone, doneBy: by } : { done: nextDone } }
      );
      // Si lo que vuelve es lo mismo que ya se ve, no se repinta otra vez.
      if (payload && payload.item && !sameVisible(payload.item, optimistic)) {
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? payload.item : entry
          )
        );
      }
    } catch (caught) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, done: item.done, doneBy: item.doneBy || null } : entry
        )
      );
      const message =
        caught instanceof Error ? caught.message : "No se pudo guardar";
      setError(message);
      reportFailure("lists", message);
    } finally {
      pending.current -= 1;
    }
  }, []);

  const updateItem = useCallback(async (item, patch) => {
    const next = { ...item, ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, "personId")) {
      next.person = personFor(peopleRef.current, patch.personId);
    }
    setError(null);
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? next : entry))
    );

    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const payload = await apiRequest(
        `/api/lists/${encodeURIComponent(item.id)}`,
        { method: "PATCH", body: patch }
      );
      if (payload && payload.item && !sameVisible(payload.item, next)) {
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? payload.item : entry
          )
        );
      }
    } catch (caught) {
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? item : entry))
      );
      const message =
        caught instanceof Error ? caught.message : "No se pudo guardar";
      setError(message);
      reportFailure("lists", message);
    } finally {
      pending.current -= 1;
    }
  }, []);

  const removeItem = useCallback(async (item) => {
    setError(null);
    setItems((current) => current.filter((entry) => entry.id !== item.id));

    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      await apiRequest(`/api/lists/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
    } catch (caught) {
      setItems((current) => [...current, item]);
      const message =
        caught instanceof Error ? caught.message : "No se pudo borrar";
      setError(message);
      reportFailure("lists", message);
    } finally {
      pending.current -= 1;
    }
  }, []);

  const clearDone = useCallback(async (listId) => {
    setError(null);
    setItems((current) =>
      current.filter((item) => !(item.listId === listId && item.done))
    );

    if (DEMO_MODE) return;
    pending.current += 1;
    let failed = false;
    try {
      await apiRequest(
        `/api/lists?list=${encodeURIComponent(listId)}&done=1`,
        { method: "DELETE" }
      );
    } catch (caught) {
      failed = true;
      const message =
        caught instanceof Error ? caught.message : "No se pudo limpiar";
      setError(message);
      reportFailure("lists", message);
    } finally {
      pending.current -= 1;
      // Hay que esperar a que baje el contador: refresh ignora las llamadas
      // mientras hay una mutación en curso.
      if (failed) refresh(true);
    }
  }, [refresh]);

  const byList = useCallback(
    (listId) => items.filter((item) => item.listId === listId),
    [items]
  );

  // Mismo objeto mientras no cambie nada: así las tarjetas memorizadas de
  // Hoy no se repintan por un render de App que no las afecta.
  return useMemo(
    () => ({
      items,
      byList,
      people,
      error,
      loading,
      get lastUpdated() {
        return lastUpdated.current;
      },
      refresh,
      addItem,
      toggleItem,
      updateItem,
      removeItem,
      clearDone,
    }),
    [items, byList, people, error, loading, refresh, addItem, toggleItem, updateItem, removeItem, clearDone]
  );
}
