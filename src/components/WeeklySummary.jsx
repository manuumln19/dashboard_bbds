import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Cake, Crown, Flame, ListChecks, SprayCan, X } from "lucide-react";
import { weekRangeLabel } from "../lib/cleaning";
import { addDays, eventStartDate, eventTimeLabel, relativeDayLabel, startOfWeek } from "../lib/date";
import { weeklyScores } from "../lib/points";
import { upcomingBirthday } from "../lib/season";
import { EggAvatar } from "./EggAvatar";
import { Yoshi } from "./Yoshi";

const SEEN_KEY = "bbds.summary.seen";
const CONFETTI = 18;

// El domingo desde las 20:00 el resumen se abre solo, una vez por semana.
export function summaryDue(now, weekKey) {
  if (now.getDay() !== 0 || now.getHours() < 20) return false;
  try {
    return window.localStorage.getItem(SEEN_KEY) !== weekKey;
  } catch {
    return false;
  }
}

function markSeen(weekKey) {
  try {
    window.localStorage.setItem(SEEN_KEY, weekKey);
  } catch {
    // Sin almacenamiento, se volverá a abrir el domingo que viene igual.
  }
}

function headline({ cleaning, mvp, scores }) {
  if (cleaning.weekComplete && mvp) return `¡Semana redonda! ${mvp.person.name} se lleva la corona.`;
  if (cleaning.weekComplete) return "¡Semana redonda y empate! Así da gusto.";
  const left = (cleaning.totalCount || 0) - (cleaning.doneCount || 0);
  if (left > 0 && left <= 2) return `A ${left === 1 ? "una tarea" : "dos tareas"} de la semana perfecta. La próxima cae.`;
  if (mvp) return `${mvp.person.name} tira del carro esta semana.`;
  if (scores.some((entry) => entry.points)) return "Empate técnico. Yoshi pide revancha.";
  return "Semana tranquila. El lunes se empieza de cero.";
}

// Un título para cada uno, con cariño.
function awardFor(entry, scores) {
  const others = scores.filter((item) => item !== entry);
  if (entry.ownWeek && entry.streak >= 3) return "Imparable";
  if (entry.ownWeek) return "Todo hecho";
  if (entry.listDone >= 3 && others.every((item) => item.listDone < entry.listDone)) return "Tachador oficial";
  if (entry.streak >= 3) return "En racha";
  if (entry.done > 0 && others.every((item) => item.done < entry.done)) return "Rey de la fregona";
  if (!entry.points) return "Modo sofá";
  return "Cumplidor";
}

function nextWeekEvents(events, now) {
  const start = addDays(startOfWeek(now), 7);
  const end = addDays(start, 7);
  return (Array.isArray(events) ? events : [])
    .filter((event) => {
      const at = eventStartDate(event);
      return at >= start && at < end;
    })
    .sort((a, b) => eventStartDate(a) - eventStartDate(b));
}

// Cuenta hasta `value` escribiendo en el DOM: sin re-render por fotograma.
function CountUp({ value, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let frame = 0;
    const startAt = performance.now() + delay;
    const duration = 900;
    el.textContent = "0";
    function tick(at) {
      const t = Math.min(1, Math.max(0, (at - startAt) / duration));
      el.textContent = String(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    }
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value, delay]);
  return <span ref={ref}>{value}</span>;
}

function LevelBar({ entry }) {
  const { level, points } = entry;
  const span = level.next ? level.next - level.min : 1;
  const progress = level.next ? Math.min(1, (points - level.min) / span) : 1;
  return (
    <div className="week-summary__level">
      <span>{level.label}</span>
      <span className="week-summary__level-bar">
        <span style={{ transform: `scaleX(${progress})` }} />
      </span>
      <small>{level.next ? `${level.next - points} para subir` : "Nivel máximo"}</small>
    </div>
  );
}

export function WeeklySummary({ now, cleaning, lists, events, seasonId, onClose }) {
  const { scores, mvp } = weeklyScores({ cleaning, lists, now });
  // El ganador en medio y más alto, como un podio.
  const ranked = [...scores].sort((a, b) => b.points - a.points);
  const podium = ranked.length === 2 && mvp ? [ranked[1], ranked[0]] : ranked;
  const coming = nextWeekEvents(events, now);
  const birthday = upcomingBirthday(now, cleaning.people, 8);
  const total = cleaning.totalCount || 0;
  const houseProgress = total ? cleaning.doneCount / total : 0;
  const host = document.querySelector(".app") || document.body;

  useEffect(() => {
    markSeen(cleaning.weekKey);
  }, [cleaning.weekKey]);

  return createPortal(
    <div
      className="ink-overlay feature-overlay week-summary-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="week-summary" role="dialog" aria-modal="true" aria-labelledby="summary-title">
        <header className="week-summary__hero">
          <div className="week-summary__confetti" aria-hidden="true">
            {Array.from({ length: CONFETTI }, (_, index) => (
              <i key={index} />
            ))}
          </div>
          <div className="week-summary__intro">
            <span className="week-summary__eyebrow">Resumen · {weekRangeLabel(now)}</span>
            <h2 id="summary-title">Así ha ido la semana</h2>
            <p>{headline({ cleaning, mvp, scores })}</p>
          </div>
          <Yoshi
            mood="idle"
            seasonId={seasonId}
            holding={mvp || cleaning.weekComplete ? "trophy" : null}
            line={mvp ? `¡Bravo, ${mvp.person.name}!` : "¡Buena semana!"}
            size={150}
          />
          <button type="button" className="week-summary__close" onClick={onClose} aria-label="Cerrar el resumen">
            <X size={22} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </header>

        <ol className="week-summary__podium">
          {podium.map((entry, index) => {
            const isMvp = mvp === entry;
            return (
              <li
                key={entry.person.id}
                className={`week-summary__player tone-${entry.person.tone}${isMvp ? " is-mvp" : ""}`}
                style={{ animationDelay: `${120 + index * 120}ms` }}
              >
                {isMvp ? <Crown className="week-summary__crown" size={30} strokeWidth={2} aria-hidden="true" /> : null}
                <span className="week-summary__award">{awardFor(entry, scores)}</span>
                <EggAvatar person={entry.person} size={isMvp ? 58 : 48} cracked={entry.ownWeek} />
                <strong className="week-summary__name">{entry.person.name}</strong>
                <span className="week-summary__points">
                  <CountUp value={entry.points} delay={300 + index * 150} />
                  <small>pts</small>
                </span>
                <LevelBar entry={entry} />
                <div className="week-summary__chips">
                  <span title="Limpieza">
                    <SprayCan size={15} strokeWidth={2} aria-hidden="true" /> {entry.done}/{entry.owed}
                  </span>
                  <span title="Tareas de la lista">
                    <ListChecks size={15} strokeWidth={2} aria-hidden="true" /> {entry.listDone}
                  </span>
                  <span className={`is-flame${entry.streak ? " is-on" : ""}`} title="Semanas de racha">
                    <Flame size={15} strokeWidth={2.2} aria-hidden="true" /> {entry.streak}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="week-summary__house">
          <div className="week-summary__house-text">
            <strong>
              {cleaning.doneCount}/{total}
            </strong>{" "}
            tareas de limpieza en casa
          </div>
          <span className="week-summary__house-bar">
            <span style={{ transform: `scaleX(${houseProgress})` }} />
          </span>
          <span className={`week-summary__house-streak${cleaning.streak ? " is-on" : ""}`}>
            <Flame size={18} strokeWidth={2.2} aria-hidden="true" />
            {cleaning.streak} {cleaning.streak === 1 ? "semana" : "semanas"}
          </span>
        </div>

        <div className="week-summary__next">
          <h3>
            <CalendarDays size={18} strokeWidth={2} aria-hidden="true" /> La semana que viene
          </h3>
          <div className="week-summary__events">
            {birthday ? (
              <span className="week-summary__event is-birthday">
                <b>
                  <Cake size={15} strokeWidth={2} aria-hidden="true" />
                </b>
                <strong>Cumple de {birthday.person.name}</strong>
                <small>{birthday.inDays === 1 ? "mañana" : `en ${birthday.inDays} días`}</small>
              </span>
            ) : null}
            {coming.slice(0, birthday ? 4 : 5).map((event) => (
              <span className="week-summary__event" key={`${event.id || event.summary}-${event.start}`}>
                <b>{relativeDayLabel(eventStartDate(event), now).slice(0, 3)}</b>
                <strong>{event.summary}</strong>
                <small>{eventTimeLabel(event)}</small>
              </span>
            ))}
            {!coming.length && !birthday ? (
              <p className="week-summary__empty">Nada en la agenda. Semana libre, de momento.</p>
            ) : null}
          </div>
        </div>

        <footer className="week-summary__foot">
          <button type="button" onClick={onClose}>
            ¡A por la semana que viene!
          </button>
        </footer>
      </section>
    </div>,
    host
  );
}
