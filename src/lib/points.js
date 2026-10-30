import { startOfWeek } from "./date";

// Puntos de la semana (se reinician el lunes, como la limpieza), en escala
// pequeña: 1 bajar la basura, 2 fregar, 3 sábanas, 5 el horno.
//   lo que valga cada tarea de limpieza hecha (2 si no se dice otra cosa),
//   lo que valga cada tarea de la lista hecha esta semana (1 por defecto),
//     para quien la hizo o, si nadie lo dijo, para su dueño,
//   los puntos a mano de esta semana («hizo la cena»),
//   +4 si alguien termina todo lo suyo de limpieza,
//   +2 a cada uno si la casa completa la semana.
export const POINTS = {
  cleaning: 2,
  task: 1,
  ownWeek: 4,
  houseWeek: 2,
};

const LEVELS = [
  { min: 0, label: "Huevo" },
  { min: 8, label: "Cría" },
  { min: 18, label: "Saltarín" },
  { min: 30, label: "Lengua rápida" },
  { min: 44, label: "Leyenda de casa" },
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
  // Cuenta en la semana en que se hizo (`doneAt`), no en la de su última
  // edición; lo anterior a `doneAt` solo tiene `updatedAt`.
  const listTasks = (lists && lists.byList ? lists.byList("tasks") : []).filter((item) => {
    const at = item.doneAt || item.updatedAt;
    return item.done && (item.doneBy || item.person) && at && new Date(at).getTime() >= weekStart;
  });
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
