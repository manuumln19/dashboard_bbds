import { startOfWeek } from "./date";

// Puntos de la semana (se reinician el lunes, como la limpieza):
//   10 por cada tarea de limpieza hecha,
//   5 por cada tarea de la lista con dueño marcada esta semana,
//   +20 si alguien termina todo lo suyo de limpieza,
//   +10 a cada uno si la casa completa la semana.
export const POINTS = {
  cleaning: 10,
  task: 5,
  ownWeek: 20,
  houseWeek: 10,
};

const LEVELS = [
  { min: 0, label: "Huevo" },
  { min: 40, label: "Cría" },
  { min: 90, label: "Saltarín" },
  { min: 150, label: "Lengua rápida" },
  { min: 220, label: "Leyenda de casa" },
];

export function levelFor(points) {
  let level = LEVELS[0];
  for (const item of LEVELS) if (points >= item.min) level = item;
  const next = LEVELS[LEVELS.indexOf(level) + 1] || null;
  return { ...level, next: next ? next.min : null };
}

export function weeklyScores({ cleaning, lists, now }) {
  const people = (cleaning && cleaning.people) || [];
  const tasks = (cleaning && cleaning.tasks) || [];
  const weekStart = startOfWeek(now).getTime();
  const listTasks = (lists && lists.byList ? lists.byList("tasks") : []).filter(
    (item) =>
      item.done && item.person && item.updatedAt && new Date(item.updatedAt).getTime() >= weekStart
  );
  const streaks = (cleaning && cleaning.personStreaks) || {};

  const scores = people.map((person) => {
    const mine = tasks.filter((task) => task.personId === person.id);
    const done = mine.filter((task) => task.done).length;
    const listDone = listTasks.filter((item) => item.person.id === person.id).length;
    const ownWeek = mine.length > 0 && done === mine.length;
    const points =
      done * POINTS.cleaning +
      listDone * POINTS.task +
      (ownWeek ? POINTS.ownWeek : 0) +
      (cleaning && cleaning.weekComplete ? POINTS.houseWeek : 0);
    return {
      person,
      points,
      done,
      owed: mine.length,
      listDone,
      ownWeek,
      // Como la de la casa: semanas anteriores seguidas, más esta si ya está.
      streak: (Number(streaks[person.id]) || 0) + (ownWeek ? 1 : 0),
      level: levelFor(points),
    };
  });

  const sorted = [...scores].sort((a, b) => b.points - a.points);
  const mvp = sorted.length > 1 && sorted[0].points > sorted[1].points ? sorted[0] : null;
  return { scores, mvp };
}
