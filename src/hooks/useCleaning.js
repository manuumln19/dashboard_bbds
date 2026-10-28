import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_MODE } from "../config";
import { apiRequest, apiRequestWithMeta } from "../lib/api";
import {
  CLEANING_PEOPLE,
  CLEANING_TASKS,
  personById,
  tasksWithState,
  weekKey,
} from "../lib/cleaning";
import { reportFailure, reportSync } from "../lib/freshness";
import { loadDemoCleaning, saveDemoCleaning } from "../lib/localStore";
import { useStableFns } from "./useStableFns";
import { compareText } from "../lib/compare";
import { onPollingResume, pollingPaused, pollInterval } from "../lib/polling";

function sortTasks(tasks) {
  return [...tasks].sort(
    (a, b) =>
      Number(a.day) - Number(b.day) ||
      Number(a.position || 0) - Number(b.position || 0) ||
      compareText(a.id, b.id)
  );
}

function attachPeople(tasks, people) {
  return sortTasks(
    tasks.map((task) => ({
      ...task,
      person:
        task.person ||
        people.find((person) => person.id === task.personId) ||
        personById(task.personId),
    }))
  );
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function validDays(value) {
  const days = Array.isArray(value)
    ? value.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  return days.length ? days : ALL_DAYS;
}

function initialDemoState() {
  const saved = loadDemoCleaning();
  const currentWeek = weekKey(new Date());
  const sameWeek = saved && saved.weekKey === currentWeek;
  const people =
    Array.isArray(saved && saved.people) && saved.people.length
      ? saved.people
      : CLEANING_PEOPLE;

  const knownPeople = new Set(people.map((person) => person.id));
  const savedTasks =
    Array.isArray(saved && saved.tasks) &&
    saved.tasks.length &&
    saved.tasks.every((task) => knownPeople.has(task.personId))
      ? saved.tasks
      : null;

  const tasks = savedTasks
    ? savedTasks.map((task) => ({
        ...task,
        done: sameWeek ? Boolean(task.done) : false,
        person:
          people.find((person) => person.id === task.personId) ||
          personById(task.personId),
      }))
    : tasksWithState(sameWeek && saved && saved.done ? saved.done : {});

  return {
    tasks: attachPeople(tasks, people),
    people,
    days: validDays(saved && saved.days),
    weekKey: currentWeek,
    lastUpdated: new Date().toISOString(),
  };
}

export function useCleaning(now) {
  const demoRef = useRef(null);
  if (DEMO_MODE && !demoRef.current) demoRef.current = initialDemoState();
  const demo = demoRef.current;
  const [tasks, setTasks] = useState(() => (demo ? demo.tasks : []));
  const [people, setPeople] = useState(() => (demo ? demo.people : []));
  const [week, setWeek] = useState(() => (demo ? demo.weekKey : weekKey(now)));
  // La hora de sincronización solo se ve en Limpieza, que se repinta con el
  // reloj: como estado, cada escritura y cada sondeo repintaban toda la app.
  const lastUpdatedRef = useRef(demo ? demo.lastUpdated : null);
  const setLastUpdated = useCallback((value) => {
    lastUpdatedRef.current = value;
  }, []);
  const snapshotKey = useRef(null);
  // En demo no hay historial: una racha y un mes inventados para ver cómo queda.
  const [streak, setStreak] = useState(DEMO_MODE ? 3 : 0);
  const [personStreaks, setPersonStreaks] = useState(DEMO_MODE ? { manu: 4, paco: 2 } : {});
  const [lastMonth, setLastMonth] = useState(() =>
    DEMO_MODE
      ? { month: "demo", tally: [{ personId: "paco", done: 31 }, { personId: "manu", done: 27 }] }
      : null
  );
  const [days, setDaysState] = useState(() => (demo ? demo.days : ALL_DAYS));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const pending = useRef(0);
  const currentWeek = weekKey(now);

  const applySnapshot = useCallback((payload, meta) => {
    const nextPeople = Array.isArray(payload.people) ? payload.people : [];
    const at =
      (meta && meta.cachedAt) ||
      payload.updatedAt ||
      new Date().toISOString();
    const report = () =>
      reportSync("cleaning", {
        at,
        cachedAt: meta && meta.offline ? at : null,
        detail:
          meta && meta.offline ? "Mostrando la última copia guardada" : null,
      });
    setLastUpdated(at);
    // El sondeo de cada minuto casi nunca trae cambios: con los mismos datos
    // no se toca el estado (cada set repintaba toda la app).
    const key = JSON.stringify([
      nextPeople,
      payload.tasks,
      payload.weekKey,
      payload.streak,
      payload.personStreaks,
      payload.days,
      payload.lastMonth,
    ]);
    if (key === snapshotKey.current) {
      report();
      return;
    }
    snapshotKey.current = key;
    if (nextPeople.length) setPeople(nextPeople);
    setTasks(
      attachPeople(
        Array.isArray(payload.tasks) ? payload.tasks : [],
        nextPeople
      )
    );
    if (payload.weekKey) setWeek(payload.weekKey);
    if (Number.isFinite(payload.streak)) setStreak(payload.streak);
    if (payload.personStreaks && typeof payload.personStreaks === "object") {
      setPersonStreaks(payload.personStreaks);
    }
    if (Array.isArray(payload.days)) setDaysState(validDays(payload.days));
    if (payload.lastMonth) setLastMonth(payload.lastMonth);
    report();
  }, [setLastUpdated]);

  const load = useCallback(
    async (targetWeek, silent = false) => {
      if (DEMO_MODE) {
        const next = initialDemoState();
        setTasks(next.tasks);
        setPeople(next.people);
        setWeek(targetWeek);
        setLastUpdated(next.lastUpdated);
        setError(null);
        setLoading(false);
        reportSync("cleaning", { at: next.lastUpdated });
        return;
      }
      if (pending.current > 0) return;
      if (!silent) setLoading(true);
      try {
        const { data, meta } = await apiRequestWithMeta(
          `/api/cleaning?week=${encodeURIComponent(targetWeek)}`
        );
        applySnapshot(data, meta);
        setError(null);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "No se pudo cargar la limpieza";
        setError(message);
        reportFailure("cleaning", message);
      } finally {
        setLoading(false);
      }
    },
    [applySnapshot]
  );

  // En demo no hay petición, pero el aviso de frescura también debe saber
  // cuándo se cargó la limpieza.
  // En demo no hay sondeo que lo renueve: se da por sincronizada cada minuto
  // (si no, el aviso de frescura saltaba a los 3 minutos).
  useEffect(() => {
    if (!DEMO_MODE) return undefined;
    function report() {
      const at = new Date().toISOString();
      lastUpdatedRef.current = at;
      reportSync("cleaning", { at });
    }
    report();
    const timer = setInterval(report, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (DEMO_MODE) return undefined;
    load(currentWeek, false);
    // Sin sondeos con el salvapantallas abierto; al cerrarlo, uno al momento.
    const tick = () => load(currentWeek, true);
    const timer = setInterval(() => {
      if (!pollingPaused()) tick();
    }, pollInterval(60 * 1000));
    const stopResume = onPollingResume(tick);
    function handleVisibility() {
      if (document.visibilityState === "visible") load(currentWeek, true);
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(timer);
      stopResume();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentWeek, load]);

  useEffect(() => {
    if (!DEMO_MODE || week === currentWeek) return;
    setTasks((current) =>
      current.map((task) => ({ ...task, done: false }))
    );
    setWeek(currentWeek);
    const at = new Date().toISOString();
    setLastUpdated(at);
    // En demo no hay petición, pero el aviso de frescura también debe saberlo.
    reportSync("cleaning", { at });
  }, [currentWeek, week, setLastUpdated]);

  useEffect(() => {
    if (!DEMO_MODE) return;
    const done = {};
    tasks.forEach((task) => {
      if (task.done) done[task.id] = true;
    });
    saveDemoCleaning({
      weekKey: week,
      done,
      people,
      days,
      tasks: tasks.map(({ person, ...task }) => task),
    });
  }, [tasks, people, week, days]);

  // Qué días de la semana se limpia. Las tareas de los demás no cuentan.
  async function setDays(nextDays) {
    const previous = days;
    const clean = validDays([...new Set(nextDays)].sort());
    setDaysState(clean);
    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      await apiRequest("/api/cleaning/days", { method: "PUT", body: { days: clean } });
      setLastUpdated(new Date().toISOString());
    } catch (caught) {
      setDaysState(previous);
      const message = caught instanceof Error ? caught.message : "No se pudo guardar";
      setError(message);
      reportFailure("cleaning", message);
      throw caught;
    } finally {
      pending.current -= 1;
    }
  }

  async function toggleTask(taskId) {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) return;
    const nextDone = !task.done;
    setError(null);
    setTasks((current) =>
      current.map((entry) =>
        entry.id === taskId ? { ...entry, done: nextDone } : entry
      )
    );

    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      await apiRequest("/api/cleaning/checks", {
        method: "PATCH",
        body: { weekKey: week, taskId, done: nextDone },
      });
      setLastUpdated(new Date().toISOString());
    } catch (caught) {
      setTasks((current) =>
        current.map((entry) =>
          entry.id === taskId ? { ...entry, done: task.done } : entry
        )
      );
      const message =
        caught instanceof Error ? caught.message : "No se pudo guardar el check";
      setError(message);
      reportFailure("cleaning", message);
    } finally {
      pending.current -= 1;
    }
  }

  async function resetWeek() {
    setError(null);
    setTasks((current) => current.map((task) => ({ ...task, done: false })));

    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      await apiRequest("/api/cleaning/reset", {
        method: "POST",
        body: { weekKey: week },
      });
      setLastUpdated(new Date().toISOString());
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "No se pudo reiniciar";
      setError(message);
      reportFailure("cleaning", message);
      load(week, true);
    } finally {
      pending.current -= 1;
    }
  }

  async function addTask(payload) {
    setError(null);
    if (DEMO_MODE) {
      const person =
        people.find((entry) => entry.id === payload.personId) ||
        personById(payload.personId);
      const task = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        day: Number(payload.day) || 0,
        personId: person.id,
        person,
        area: payload.area,
        title: payload.title,
        position: 999,
        done: false,
      };
      setTasks((current) => attachPeople([...current, task], people));
      return task;
    }

    pending.current += 1;
    try {
      const response = await apiRequest("/api/cleaning/tasks", {
        method: "POST",
        body: payload,
      });
      if (response && response.task) {
        setTasks((current) =>
          attachPeople([...current, response.task], people)
        );
        setLastUpdated(new Date().toISOString());
        return response.task;
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "No se pudo añadir la tarea";
      setError(message);
      reportFailure("cleaning", message);
      throw caught;
    } finally {
      pending.current -= 1;
    }
    return null;
  }

  async function updateTask(taskId, patch) {
    const previous = tasks.find((task) => task.id === taskId);
    if (!previous) return;
    setError(null);
    const nextPerson = Object.prototype.hasOwnProperty.call(patch, "personId")
      ? people.find((person) => person.id === patch.personId) ||
        personById(patch.personId)
      : previous.person;
    setTasks((current) =>
      attachPeople(
        current.map((task) =>
          task.id === taskId
            ? { ...task, ...patch, person: nextPerson }
            : task
        ),
        people
      )
    );

    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const response = await apiRequest(
        `/api/cleaning/tasks/${encodeURIComponent(taskId)}`,
        { method: "PATCH", body: patch }
      );
      if (response && response.task) {
        setTasks((current) =>
          attachPeople(
            current.map((task) =>
              task.id === taskId
                ? { ...response.task, done: task.done }
                : task
            ),
            people
          )
        );
        setLastUpdated(new Date().toISOString());
      }
    } catch (caught) {
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? previous : task))
      );
      const message =
        caught instanceof Error
          ? caught.message
          : "No se pudo guardar la tarea";
      setError(message);
      reportFailure("cleaning", message);
      throw caught;
    } finally {
      pending.current -= 1;
    }
  }

  async function removeTask(taskId) {
    const previous = tasks.find((task) => task.id === taskId);
    if (!previous) return;
    setError(null);
    setTasks((current) => current.filter((task) => task.id !== taskId));

    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      await apiRequest(
        `/api/cleaning/tasks/${encodeURIComponent(taskId)}`,
        { method: "DELETE" }
      );
      setLastUpdated(new Date().toISOString());
    } catch (caught) {
      setTasks((current) => attachPeople([...current, previous], people));
      const message =
        caught instanceof Error ? caught.message : "No se pudo borrar";
      setError(message);
      reportFailure("cleaning", message);
      throw caught;
    } finally {
      pending.current -= 1;
    }
  }

  async function updatePerson(personId, patch) {
    const previous = people.find((person) => person.id === personId);
    if (!previous) return;
    const next = { ...previous, ...patch };
    setPeople((current) =>
      current.map((person) => (person.id === personId ? next : person))
    );
    setTasks((current) =>
      current.map((task) =>
        task.personId === personId ? { ...task, person: next } : task
      )
    );

    if (DEMO_MODE) return;
    pending.current += 1;
    try {
      const response = await apiRequest(
        `/api/people/${encodeURIComponent(personId)}`,
        { method: "PATCH", body: patch }
      );
      if (response && response.person) {
        const saved = response.person;
        setPeople((current) =>
          current.map((person) =>
            person.id === personId ? saved : person
          )
        );
        setTasks((current) =>
          current.map((task) =>
            task.personId === personId ? { ...task, person: saved } : task
          )
        );
        setLastUpdated(new Date().toISOString());
      }
    } catch (caught) {
      setPeople((current) =>
        current.map((person) =>
          person.id === personId ? previous : person
        )
      );
      setTasks((current) =>
        current.map((task) =>
          task.personId === personId ? { ...task, person: previous } : task
        )
      );
      const message =
        caught instanceof Error ? caught.message : "No se pudo guardar";
      setError(message);
      reportFailure("cleaning", message);
      throw caught;
    } finally {
      pending.current -= 1;
    }
  }

  const activeTasks = useMemo(() => tasks.filter((task) => days.includes(task.day)), [tasks, days]);
  const doneCount = activeTasks.filter((task) => task.done).length;
  const weekComplete = activeTasks.length > 0 && doneCount === activeTasks.length;
  const actions = useStableFns({
    setDays,
    toggleTask,
    resetWeek,
    addTask,
    updateTask,
    removeTask,
    updatePerson,
    refresh: () => load(currentWeek, false),
  });

  // Mismo objeto mientras no cambie nada: así las tarjetas memorizadas de Hoy
  // no se repintan por un render de App que no las afecta.
  return useMemo(() => ({
    // Solo las tareas de los días de limpieza; el editor usa `allTasks`.
    tasks: activeTasks,
    allTasks: tasks,
    people,
    days,
    setDays: actions.setDays,
    lastMonth,
    doneCount,
    totalCount: activeTasks.length,
    // Semanas completas seguidas, contando esta si ya está terminada.
    streak: streak + (weekComplete ? 1 : 0),
    // Semanas anteriores seguidas de cada persona; `lib/points` suma esta.
    personStreaks,
    weekComplete,
    weekKey: week,
    toggleTask: actions.toggleTask,
    resetWeek: actions.resetWeek,
    addTask: actions.addTask,
    updateTask: actions.updateTask,
    removeTask: actions.removeTask,
    updatePerson: actions.updatePerson,
    get lastUpdated() {
      return lastUpdatedRef.current;
    },
    error,
    loading,
    refresh: actions.refresh,
  }), [activeTasks, tasks, people, days, lastMonth, doneCount, streak, personStreaks, weekComplete, week, error, loading, actions]);
}
