import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequest, apiRequestWithMeta } from "../lib/api";
import { DEMO_PEOPLE, loadDemoLists, saveDemoLists } from "../lib/localStore";
import { reportFailure, reportSync } from "../lib/freshness";

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

export function useLists() {
  const [items, setItems] = useState(() =>
    DEMO_MODE ? loadDemoLists() : []
  );
  const [people, setPeople] = useState(() => DEMO_MODE ? DEMO_PEOPLE : []);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pending = useRef(0);

  const applySnapshot = useCallback((payload, meta) => {
    setItems(Array.isArray(payload.items) ? payload.items : []);
    if (Array.isArray(payload.people)) setPeople(payload.people);
    const at = (meta && meta.cachedAt) || new Date().toISOString();
    setLastUpdated(at);
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
        setLastUpdated(at);
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

    const timer = setInterval(() => refresh(true), REFRESH_MS);
    function handleVisibility() {
      if (document.visibilityState === "visible") refresh(true);
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  useEffect(() => {
    if (DEMO_MODE) saveDemoLists(items);
  }, [items]);

  async function addItem(listId, rawText, meta = {}) {
    const text = String(rawText || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    if (text.length > 160) {
      setError("El texto es demasiado largo (máximo 160 caracteres)");
      return;
    }

    setError(null);
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
      person: personId ? personFor(people, personId) : null,
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
  }

  async function toggleItem(item) {
    const nextDone = !item.done;
    setError(null);
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, done: nextDone } : entry
      )
    );

    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const payload = await apiRequest(
        `/api/lists/${encodeURIComponent(item.id)}`,
        { method: "PATCH", body: { done: nextDone } }
      );
      if (payload && payload.item) {
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? payload.item : entry
          )
        );
      }
    } catch (caught) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, done: item.done } : entry
        )
      );
      const message =
        caught instanceof Error ? caught.message : "No se pudo guardar";
      setError(message);
      reportFailure("lists", message);
    } finally {
      pending.current -= 1;
    }
  }

  async function updateItem(item, patch) {
    const next = { ...item, ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, "personId")) {
      next.person = personFor(people, patch.personId);
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
      if (payload && payload.item) {
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
  }

  async function removeItem(item) {
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
  }

  async function clearDone(listId) {
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
  }

  const byList = useCallback(
    (listId) => items.filter((item) => item.listId === listId),
    [items]
  );

  return {
    items,
    byList,
    people,
    error,
    loading,
    lastUpdated,
    refresh,
    addItem,
    toggleItem,
    updateItem,
    removeItem,
    clearDone,
  };
}
