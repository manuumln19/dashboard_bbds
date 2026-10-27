// Calendario de la casa: qué decoración toca hoy y, si es un día señalado,
// cómo se llama. `id` elige los dibujos de SeasonDecor, `note` sale junto a
// la fecha en Hoy y `line`, si existe, es la frase del saludo.

// De dónde es cada uno: sus ferias también se celebran en casa.
export const HOMETOWNS = { manu: "Úbeda", paco: "Torreperogil" };

const DAYS = {
  "1-1": { id: "navidad", note: "Año nuevo" },
  "1-5": { id: "navidad", note: "Noche de Reyes" },
  "1-6": { id: "navidad", note: "Día de Reyes" },
  "1-16": { id: "lumbres", note: "Noche de San Antón", line: "Esta noche hay lumbres por todo Jaén." },
  "1-17": { id: "lumbres", note: "San Antón" },
  "2-14": { id: "amor", note: "San Valentín" },
  "2-28": { id: "invierno", note: "Día de Andalucía" },
  "6-11": { id: "verano", note: "Virgen de la Capilla", line: "Hoy es el día de la Capilla en Jaén." },
  "6-23": { id: "verano", note: "Noche de San Juan" },
  "10-31": { id: "halloween", note: "Noche de Halloween" },
  "11-1": { id: "otono", note: "Todos los Santos" },
  "12-24": { id: "navidad", note: "Nochebuena" },
  "12-25": { id: "navidad", note: "Navidad" },
  "12-28": { id: "navidad", note: "Día de los Inocentes" },
  "12-31": { id: "navidad", note: "Nochevieja" },
};

// Domingo de Resurrección (algoritmo de Meeus).
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function dayDiff(a, b) {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((end - start) / 86400000);
}

function holyWeek(date) {
  const offset = dayDiff(date, easterSunday(date.getFullYear()));
  if (offset < 0 || offset > 7) return null;
  const names = {
    7: "Domingo de Ramos",
    3: "Jueves Santo",
    2: "Viernes Santo",
    0: "Domingo de Resurrección",
  };
  return {
    id: "semanasanta",
    note: names[offset] || "Semana Santa",
    line: offset === 2 ? "Viernes Santo: Úbeda y Jaén en la calle." : null,
  };
}

function personName(people, id, fallback) {
  const person = (people || []).find((entry) => entry.id === id);
  return person ? person.name : fallback;
}

function fiesta(date, people) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 9 && day >= 6 && day <= 11) {
    const name = personName(people, "paco", "Paco");
    return {
      id: "feria",
      note: "Feria de Torreperogil",
      line: day === 8 ? `Día de la Misericordia: felicidades, ${name}.` : `Feria en Torreperogil: el pueblo de ${name} está de fiesta.`,
    };
  }
  if ((month === 9 && day >= 28) || (month === 10 && day <= 4)) {
    const name = personName(people, "manu", "Manu");
    return {
      id: "feria",
      note: "Feria de San Miguel",
      line: day === 29 ? `San Miguel: Úbeda, la de ${name}, de fiesta grande.` : `Feria de San Miguel en Úbeda, la de ${name}.`,
    };
  }
  if (month === 10 && day >= 13 && day <= 19) {
    return { id: "feria", note: "Feria de San Lucas", line: "Feria de San Lucas: Jaén está de fiesta." };
  }
  return null;
}

// Cumpleaños hoy (MM-DD en cada persona).
export function birthdaysOn(date, people) {
  const key = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return (people || []).filter((person) => person.birthday === key);
}

// Próximo cumpleaños en los próximos `days` días (sin contar hoy).
export function upcomingBirthday(date, people, days = 10) {
  let best = null;
  (people || []).forEach((person) => {
    if (!person.birthday) return;
    const [month, day] = person.birthday.split("-").map(Number);
    let next = new Date(date.getFullYear(), month - 1, day);
    if (dayDiff(date, next) <= 0) next = new Date(date.getFullYear() + 1, month - 1, day);
    const inDays = dayDiff(date, next);
    if (inDays <= days && (!best || inDays < best.inDays)) best = { person, inDays };
  });
  return best;
}

export function seasonFor(date, people = []) {
  const birthdays = birthdaysOn(date, people);
  if (birthdays.length) {
    const names = birthdays.map((person) => person.name).join(" y ");
    return { id: "cumple", note: `Cumpleaños de ${names}`, line: `¡Feliz cumpleaños, ${names}!` };
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const special = DAYS[`${month}-${day}`];
  if (special) return special;

  const local = holyWeek(date) || fiesta(date, people);
  if (local) return local;

  if (month === 10 && day >= 24) return { id: "spooky", note: null };
  if (month === 12 || (month === 1 && day <= 6)) return { id: "navidad", note: null };
  if (month <= 2) return { id: "invierno", note: null };
  if (month <= 5) return { id: "primavera", note: null };
  if (month <= 8) return { id: "verano", note: null };
  return { id: "otono", note: null };
}

// Para probar una temporada sin esperar: `?temporada=navidad`.
export function seasonOverride() {
  try {
    const value = new URLSearchParams(window.location.search).get("temporada");
    return value ? { id: value, note: null } : null;
  } catch {
    return null;
  }
}
