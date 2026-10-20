import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequest } from "../lib/api";
import { loadDemoLists, saveDemoLists } from "../lib/localStore";

const REFRESH_MS = 20 * 1000;

export function useLists() {
  const [items, setItems] = useState(() =>
    DEMO_MODE ? loadDemoLists() : []
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const pending = useRef(0);

  const refresh = useCallback(async (silent = false) => {
    if (DEMO_MODE) {
      setItems(loadDemoLists());
      setError(null);
      setLoading(false);
      return;
    }
    if (pending.current > 0) return;

    if (!silent) setLoading(true);
    try {
      const payload = await apiRequest("/api/lists");
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pudieron cargar las listas"
      );
    } finally {
      setLoading(false);
    }
  }, []);

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

  async function addItem(listId, rawText) {
    const text = String(rawText || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    if (text.length > 160) {
      setError("El texto es demasiado largo (máximo 160 caracteres)");
      return;
    }

    setError(null);
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic = {
      id: tempId,
      listId,
      text,
      done: false,
      createdAt: new Date().toISOString(),
    };
    setItems((current) => [...current, optimistic]);

    if (DEMO_MODE) {
      setItems((current) =>
        current.map((item) =>
          item.id === tempId
            ? { ...item, id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` }
            : item
        )
      );
      return;
    }

    pending.current += 1;
    try {
      const payload = await apiRequest("/api/lists", {
        method: "POST",
        body: { listId, text },
      });
      if (payload && payload.item) {
        setItems((current) =>
          current.map((item) => (item.id === tempId ? payload.item : item))
        );
      }
    } catch (caught) {
      setItems((current) => current.filter((item) => item.id !== tempId));
      setError(caught instanceof Error ? caught.message : "No se pudo añadir");
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
      await apiRequest(`/api/lists/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: { done: nextDone },
      });
    } catch (caught) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, done: item.done } : entry
        )
      );
      setError(caught instanceof Error ? caught.message : "No se pudo guardar");
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
      setError(caught instanceof Error ? caught.message : "No se pudo borrar");
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
      setError(caught instanceof Error ? caught.message : "No se pudo limpiar");
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
    error,
    loading,
    refresh,
    addItem,
    toggleItem,
    removeItem,
    clearDone,
  };
}
