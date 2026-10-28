import { CalendarDays, Sparkles, SprayCan, X, Zap } from "lucide-react";
import { eventStartDate, isSameDay } from "../lib/date";
import { sheetPortal } from "../lib/sheetPortal";
import { cheapPower, cleaningDayIndex } from "../lib/today";
import { weatherLabel } from "../lib/weather";
import { WeatherGlyph } from "./WeatherGlyph";
import { YOSHI_SPRITES } from "./Yoshi";

const KEY = "bbds.morning.brief";

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "—";
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// Se abre una vez al día, por la mañana (6–12), al despertar la pantalla.
export function morningBriefDue(now) {
  const hour = now.getHours();
  if (hour < 6 || hour >= 12) return false;
  try {
    return window.localStorage.getItem(KEY) !== dayKey(now);
  } catch {
    return false;
  }
}

export function markMorningBrief(now) {
  try {
    window.localStorage.setItem(KEY, dayKey(now));
  } catch {
    // Sin almacenamiento se volvería a abrir; no pasa nada grave.
  }
}

// «Buenos días» de Yoshi: el día en cuatro líneas, para mirarlo con el café.
export function MorningBrief({ now, weather, events, cleaning, electricity, onClose }) {
  const today = weather && weather.today ? weather.today : null;
  const current = weather && weather.current ? weather.current : null;
  const first = (Array.isArray(events) ? events : [])
    .filter((event) => !event.allDay && isSameDay(eventStartDate(event), now) && eventStartDate(event) > now)
    .sort((a, b) => eventStartDate(a) - eventStartDate(b))[0];
  const index = cleaningDayIndex(now);
  const chores = (cleaning.tasks || []).filter((task) => task.day === index && !task.done);
  const cheap = cheapPower(electricity, now);

  return sheetPortal(
    <div
      className="ink-overlay feature-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="ink-sheet card morning-brief" role="dialog" aria-modal="true" aria-labelledby="morning-title">
        <header className="ink-head">
          <img className="morning-brief__yoshi" src={YOSHI_SPRITES.happy} alt="" width={92} height={92} />
          <div>
            <span className="eyebrow">Yoshi te cuenta el día</span>
            <h2 id="morning-title">¡Buenos días!</h2>
          </div>
          <button type="button" className="ink-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </header>

        <ul className="morning-brief__list">
          <li>
            <WeatherGlyph code={current ? current.weatherCode : 0} isDay size={22} strokeWidth={1.6} />
            <span>
              <strong>{current ? `${round(current.temperature)}° · ${weatherLabel(current.weatherCode).toLowerCase()}` : "El tiempo, cargando"}</strong>
              {today ? (
                <small>
                  Máx {round(today.max)}° · mín {round(today.min)}°
                  {Number(today.precipitationProbability) >= 30 ? ` · lluvia ${round(today.precipitationProbability)}%` : ""}
                </small>
              ) : null}
            </span>
          </li>
          <li>
            <CalendarDays size={22} strokeWidth={1.6} aria-hidden="true" />
            <span>
              <strong>{first ? first.summary : "Sin citas por delante"}</strong>
              <small>
                {first ? `A las ${pad(eventStartDate(first).getHours())}:${pad(eventStartDate(first).getMinutes())}` : "Día libre en la agenda"}
              </small>
            </span>
          </li>
          <li>
            <SprayCan size={22} strokeWidth={1.6} aria-hidden="true" />
            <span>
              <strong>
                {chores.length
                  ? chores.map((task) => `${task.person ? task.person.name : "Casa"}: ${task.area}`).join(" · ")
                  : "Hoy no toca limpiar"}
              </strong>
              <small>{chores.length ? "Limpieza de hoy" : "O ya está hecha"}</small>
            </span>
          </li>
          <li>
            {cheap ? <Zap size={22} strokeWidth={1.6} aria-hidden="true" /> : <Sparkles size={22} strokeWidth={1.6} aria-hidden="true" />}
            <span>
              <strong>{cheap ? cheap.label : "Que tengáis buen día"}</strong>
              <small>{cheap ? "Buen momento para la lavadora" : "Yoshi cuida de la casa"}</small>
            </span>
          </li>
        </ul>

        <button type="button" className="morning-brief__go" onClick={onClose}>
          ¡A por el día!
        </button>
      </section>
    </div>
  );
}
