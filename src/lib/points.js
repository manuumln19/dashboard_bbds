import { startOfWeek } from "./date";

// Puntos de la semana (se reinician el lunes, como la limpieza):
//   lo que valga cada tarea de limpieza hecha (10 si no se dice otra cosa),
//   lo que valga cada tarea de la lista hecha esta semana (5 por defecto),
//     para quien la hizo o, si nadie lo dijo, para su dueño,
//   los puntos a mano de esta semana («hizo la cena»),
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
  const index = LEVELS.indexOf(level);
  const next = LEVELS[index + 1] || null;
  return { ...level, index, next: next ? next.min : null };
}

export function weeklyScores({ cleaning, lists, now, pointEvents = [] }) {
  const people = (cleaning && cleaning.people) || [];
  const tasks = (cleaning && cleaning.tasks) || [];
  const weekStart = startOfWeek(now).getTime();
  const listTasks = (lists && lists.byList ? lists.byList("tasks") : []).filter(
    (item) =>
      item.done && (item.doneBy || item.person) && item.updatedAt && new Date(item.updatedAt).getTime() >= weekStart
  );
  const manual = (pointEvents || []).filter((event) => new Date(event.createdAt).getTime() >= weekStart);
  const streaks = (cleaning && cleaning.personStreaks) || {};

  const scores = people.map((person) => {
    const mine = tasks.filter((task) => task.personId === person.id);
    const doneTasks = mine.filter((task) => task.done);
    const done = doneTasks.length;
    const listMine = listTasks.filter((item) => (item.doneBy || item.person.id) === person.id);
    const listDone = listMine.length;
    const extra = manual.filter((event) => event.personId === person.id).reduce((sum, event) => sum + event.points, 0);
    const ownWeek = mine.length > 0 && done === mine.length;
    const points =
      doneTasks.reduce((sum, task) => sum + (task.points || POINTS.cleaning), 0) +
      listMine.reduce((sum, item) => sum + (item.points || POINTS.task), 0) +
      extra +
      (ownWeek ? POINTS.ownWeek : 0) +
      (cleaning && cleaning.weekComplete ? POINTS.houseWeek : 0);
    return {
      person,
      points,
      done,
      owed: mine.length,
      listDone,
      extra,
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
