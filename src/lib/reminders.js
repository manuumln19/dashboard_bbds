import { upcomingBirthday } from "./season";

// Avisos de la casa que dependen del calendario: cambio de hora, tareas de
// temporada, uvas, cumpleaños cercanos y el marcador de limpieza del mes.
// Mismo formato que los elementos de «Lo siguiente» (lib/today.js).

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function lastSunday(year, monthIndex) {
  const date = new Date(year, monthIndex + 1, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function daysUntil(now, date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((date - start) / 86400000);
}

function clockChange(now) {
  for (const monthIndex of [2, 9]) {
    const sunday = lastSunday(now.getFullYear(), monthIndex);
    const left = daysUntil(now, sunday);
    if (left < 0 || left > 2) continue;
    const spring = monthIndex === 2;
    const shift = spring ? "a las 2 serán las 3" : "a las 3 serán las 2";
    return {
      id: "clock-change",
      kind: "reminder",
      kicker: "Cambio de hora",
      title: left === 0 ? "Hoy se ha cambiado la hora" : left === 1 ? `Esta noche ${shift}` : "El domingo se cambia la hora",
      detail: spring ? "Se duerme una hora menos" : "Una hora más de sueño",
    };
  }
  return null;
}

function seasonalChore(now) {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month === 11 && day <= 7) {
    return { id: "radiators", kind: "reminder", kicker: "Toca", title: "Purgar los radiadores", detail: "Antes de que apriete el frío" };
  }
  if (month === 6 && day <= 7) {
    return { id: "filters", kind: "reminder", kicker: "Toca", title: "Limpiar los filtros del aire", detail: "Antes de que apriete el calor" };
  }
  if (month === 12 && day >= 26 && day <= 31) {
    return { id: "grapes", kind: "reminder", kicker: "Nochevieja", title: "¿Uvas compradas?", detail: "", addToShopping: "Uvas para Nochevieja" };
  }
  return null;
}

function birthdaySoon(now, people) {
  const soon = upcomingBirthday(now, people, 10);
  if (!soon) return null;
  return {
    id: "birthday",
    kind: "birthday",
    kicker: "Cumpleaños",
    title: `Cumple de ${soon.person.name}`,
    detail: soon.inDays === 1 ? "mañana" : `en ${soon.inDays} días`,
  };
}

// La primera semana de cada mes, quién ganó la limpieza del anterior.
function monthWinner(now, cleaning) {
  const last = cleaning && cleaning.lastMonth;
  if (!last || now.getDate() > 7 || !last.tally || !last.tally.length) return null;
  const ranked = [...last.tally].sort((a, b) => b.done - a.done);
  const monthName = MONTHS[(now.getMonth() + 11) % 12];
  const nameOf = (id) => {
    const person = (cleaning.people || []).find((entry) => entry.id === id);
    return person ? person.name : id;
  };
  const tie = ranked.length > 1 && ranked[0].done === ranked[1].done;
  return {
    id: "month-winner",
    kind: "trophy",
    kicker: `Limpieza de ${monthName}`,
    title: tie ? `Empate a ${ranked[0].done}` : `Gana ${nameOf(ranked[0].personId)}`,
    detail: ranked.map((entry) => `${nameOf(entry.personId)} ${entry.done}`).join(" · "),
  };
}

export function houseReminders({ now, cleaning }) {
  const people = (cleaning && cleaning.people) || [];
  return [clockChange(now), birthdaySoon(now, people), monthWinner(now, cleaning), seasonalChore(now)].filter(Boolean);
}
