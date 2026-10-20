import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCleaningState,
  tasksWithState,
  weekKey,
} from "../lib/cleaning";
import { loadDemoCleaning, saveDemoCleaning } from "../lib/localStore";

export function useCleaning(now) {
  const [state, setState] = useState(() =>
    createCleaningState(new Date(), loadDemoCleaning())
  );
  const currentWeek = weekKey(now);

  // Al cambiar de semana se empieza de cero sin tocar las tareas ni el orden.
  useEffect(() => {
    setState((current) =>
      current.weekKey === currentWeek
        ? current
        : createCleaningState(new Date(), null)
    );
  }, [currentWeek]);

  useEffect(() => {
    saveDemoCleaning(state);
  }, [state]);

  const tasks = useMemo(() => tasksWithState(state.done), [state.done]);

  const toggleTask = useCallback((taskId) => {
    setState((current) => ({
      ...current,
      done: {
        ...current.done,
        [taskId]: !current.done[taskId],
      },
    }));
  }, []);

  const resetWeek = useCallback(() => {
    setState((current) => ({ ...current, done: {} }));
  }, []);

  const doneCount = tasks.filter((task) => task.done).length;

  return {
    tasks,
    doneCount,
    totalCount: tasks.length,
    weekKey: state.weekKey,
    toggleTask,
    resetWeek,
  };
}
