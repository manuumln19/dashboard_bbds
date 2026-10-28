import { getGreeting } from "./date";
import { cleaningDayIndex } from "./today";

// El saludo de Hoy: «Buenos días» y, detrás, una frase según lo que pasa en
// casa. Se elige una por hora para que no cambie a cada minuto. Es la voz de
// la casa, no un resumen: la agenda, la lluvia y la luz ya tienen su sitio en
// «Lo siguiente» y no se repiten aquí.

// En los días grandes el saludo es la propia fiesta («Feliz Navidad.») y la
// frase de detrás cuenta otra cosa.
const FIESTA_HELLO = {
  "Año nuevo": "Feliz año nuevo",
  "Día de Reyes": "Feliz día de Reyes",
  "San Valentín": "Feliz San Valentín",
  "Día de Andalucía": "Feliz día de Andalucía",
  "Noche de Halloween": "Feliz Halloween",
  Nochebuena: "Feliz Nochebuena",
  Navidad: "Feliz Navidad",
  Nochevieja: "Feliz Nochevieja",
};

const HOLIDAY_LINES = {
  "Año nuevo": "Primer día del año: con calma.",
  "Noche de Reyes": "Esta noche vienen los Reyes: zapatos en el salón.",
  "Día de Reyes": "¿Qué han traído los Reyes?",
  "San Valentín": "Un detalle hoy no sobra.",
  "Día de Andalucía": "Hoy toca pan con aceite en el desayuno.",
  "Noche de San Juan": "Noche de San Juan: a quemar lo malo.",
  "Noche de Halloween": "Noche de Halloween: ojo con quién llama a la puerta.",
  "Todos los Santos": "Hoy toca castañas y huesos de santo.",
  Nochebuena: "Esta noche, cena en familia.",
  Navidad: "Hoy toca sobremesa larga.",
  "Día de los Inocentes": "Cuidado con lo que os creéis hoy.",
  Nochevieja: "Última noche del año: las uvas, contadas.",
};

const SEASON_LINES = {
  spooky: ["Se acerca Halloween…", "Algo ronda la casa estos días."],
  navidad: ["Ya huele a Navidad.", "Mes de turrón y polvorones."],
  otono: ["Tiempo de castañas asadas.", "Tarde de manta y peli."],
  semanasanta: ["Semana Santa: huele a incienso y a torrijas."],
};

function rounded(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function pick(lines, seed) {
  return lines.length ? lines[seed % lines.length] : null;
}

export function greetingLine({ now, weather, season, lists, cleaning }) {
  const hour = now.getHours();
  const weekday = now.getDay();
  const seed = now.getDate() * 24 + hour;
  const today = weather && weather.today;
  const rain = today ? rounded(today.precipitationProbability) : null;
  const max = today ? rounded(today.max) : null;
  const min = today ? rounded(today.min) : null;

  // Lo importante del día gana siempre.
  if (season && season.line) return season.line;
  if (season && season.note && HOLIDAY_LINES[season.note]) return HOLIDAY_LINES[season.note];
  if (hour < 6 && hour >= 1) return "¿Qué hacéis despiertos a estas horas?";
  if (rain !== null && rain >= 60) return "Hoy toca paraguas.";
  if (max !== null && max >= 34) return `Hoy aprieta: ${max}°. Persianas abajo.`;
  if (min !== null && min <= 2) return `Fresquito: mínima de ${min}°. Abrigaos.`;

  const lines = [];
  if (cleaning && cleaning.weekComplete) {
    lines.push("Limpieza de la semana hecha. Casa reluciente.");
  } else if (cleaning && hour >= 18) {
    const index = cleaningDayIndex(now);
    const left = cleaning.tasks.filter((task) => task.day === index && !task.done).length;
    if (left) lines.push(left === 1 ? "Queda una tarea de limpieza de hoy." : `Quedan ${left} tareas de limpieza de hoy.`);
  }
  if (cleaning && cleaning.streak >= 3 && !cleaning.weekComplete) {
    lines.push(`Llevamos ${cleaning.streak} semanas de racha limpiando. No la rompáis.`);
  }

  const shopping = lists ? lists.byList("shopping").filter((item) => !item.done).length : 0;
  if (shopping >= 8) lines.push(`${shopping} cosas en la compra: esto ya pide súper.`);

  if (weekday === 1 && hour < 13) lines.push("Lunes. Solo hay uno por semana.");
  if (weekday === 5 && hour >= 15) lines.push("Viernes por la tarde. Ya casi.");
  if ((weekday === 6 || weekday === 0) && hour < 13) lines.push("Fin de semana: sin prisas.");
  if (weekday === 0 && hour >= 19) lines.push("Domingo por la tarde: a preparar la semana.");
  if (hour >= 23) lines.push("Ya va siendo hora de dormir.");
  if (rain !== null && rain >= 35) lines.push(`Puede llover (${rain}%). Por si acaso, paraguas.`);
  if (max !== null && max >= 18 && max <= 26 && rain !== null && rain < 20) lines.push("Hace un día buenísimo.");

  if (season && SEASON_LINES[season.id]) lines.push(...SEASON_LINES[season.id]);

  return pick(lines, seed);
}

export function greetingFor(context) {
  const line = greetingLine(context);
  const note = context.season && context.season.note;
  return { hello: (note && FIESTA_HELLO[note]) || getGreeting(context.now), line };
}
