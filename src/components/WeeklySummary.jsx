import { useEffect, useRef } from "react";
import { Cake, Crown, Flame, X } from "lucide-react";
import { weekRangeLabel } from "../lib/cleaning";
import { addDays, eventStartDate, eventTimeLabel, relativeDayLabel, startOfWeek } from "../lib/date";
import { LITE_MODE } from "../lib/perf";
import { sheetPortal } from "../lib/sheetPortal";
import { weeklyScores } from "../lib/points";
import { markSummarySeen } from "../lib/summary";
import { upcomingBirthday } from "../lib/season";
import { EggAvatar } from "./EggAvatar";
import { Yoshi } from "./Yoshi";

function headline({ cleaning, mvp, scores }) {
  if (cleaning.weekComplete && mvp) return `Semana redonda. ${mvp.person.name} se lleva la corona.`;
  if (cleaning.weekComplete) return "Semana redonda y empate. Así da gusto.";
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
// En el marco (modo ligero) sale la cifra directamente.
function CountUp({ value, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || LITE_MODE) return undefined;
    let frame = 0;
    const startAt = performance.now() + delay;
    const duration = 700;
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

function progressOf(level, points) {
  if (!level.next) return 1;
  return Math.min(1, (points - level.min) / (level.next - level.min));
}

export function WeeklySummary({ now, cleaning, lists, events, pointEvents, seasonId, onClose }) {
  const { scores, mvp } = weeklyScores({ cleaning, lists, now, pointEvents });
  const ranked = [...scores].sort((a, b) => b.points - a.points);
  const coming = nextWeekEvents(events, now);
  const birthday = upcomingBirthday(now, cleaning.people, 8);
  const total = cleaning.totalCount || 0;

  useEffect(() => {
    markSummarySeen(cleaning.weekKey);
  }, [cleaning.weekKey]);

  return sheetPortal(
    <div
      className="ink-overlay feature-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="ink-sheet card week-summary" role="dialog" aria-modal="true" aria-labelledby="summary-title">
        <header className="ink-head">
          <span className="week-summary__mascot">
            <Yoshi mood="idle" seasonId={seasonId} holding={mvp || cleaning.weekComplete ? "trophy" : null} size={92} />
          </span>
          <div>
            <span className="eyebrow">Resumen · {weekRangeLabel(now)}</span>
            <h2 id="summary-title">Así ha ido la semana</h2>
            <p>{headline({ cleaning, mvp, scores })}</p>
          </div>
          <button type="button" className="ink-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </header>

        <div className="week-summary__body">
          <section className="week-summary__section week-summary__players">
            {ranked.map((entry, index) => {
              const isMvp = mvp === entry;
              return (
                <article key={entry.person.id} className={`week-summary__player tone-${entry.person.tone}${isMvp ? " is-mvp" : ""}`}>
                  <div className="week-summary__who">
                    <EggAvatar person={entry.person} size={38} cracked={entry.ownWeek} level={entry.level.index} />
                    <div>
                      <strong>
                        {entry.person.name}
                        {isMvp ? <Crown size={15} strokeWidth={2} aria-label="Va ganando" /> : null}
                      </strong>
                      <span>{awardFor(entry, scores)}</span>
                    </div>
                  </div>
                  <p className="week-summary__points">
                    <CountUp value={entry.points} delay={150 + index * 120} />
                    <small>pts · {entry.level.label}</small>
                  </p>
                  <span className="week-summary__bar" aria-hidden="true">
                    <span style={{ transform: `scaleX(${progressOf(entry.level, entry.points)})` }} />
                  </span>
                  <dl className="week-summary__stats">
                    <div>
                      <dt>Limpieza</dt>
                      <dd>
                        {entry.done}/{entry.owed}
                      </dd>
                    </div>
                    <div>
                      <dt>Lista</dt>
                      <dd>{entry.listDone}</dd>
                    </div>
                    <div>
                      <dt>Racha</dt>
                      <dd className={entry.streak ? "is-flame" : ""}>
                        {entry.streak ? <Flame size={13} strokeWidth={2.1} aria-hidden="true" /> : null}
                        {entry.streak} sem.
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </section>

          <section className="week-summary__section">
            <div className="week-summary__head">
              <h3>En casa</h3>
              <span className={`week-summary__flag${cleaning.streak ? " is-on" : ""}`}>
                <Flame size={13} strokeWidth={2.1} aria-hidden="true" />
                {cleaning.streak} {cleaning.streak === 1 ? "semana seguida" : "semanas seguidas"}
              </span>
            </div>
            <div className="week-summary__house">
              <span>
                <strong>
                  {cleaning.doneCount}/{total}
                </strong>{" "}
                tareas de limpieza hechas
              </span>
              <span className="week-summary__bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${total ? cleaning.doneCount / total : 0})` }} />
              </span>
            </div>
          </section>

          <section className="week-summary__section">
            <div className="week-summary__head">
              <h3>La semana que viene</h3>
            </div>
            {coming.length || birthday ? (
              <ul className="week-summary__events">
                {birthday ? (
                  <li className="is-birthday">
                    <span>
                      <Cake size={14} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <strong>Cumple de {birthday.person.name}</strong>
                    <small>{birthday.inDays === 1 ? "mañana" : `en ${birthday.inDays} días`}</small>
                  </li>
                ) : null}
                {coming.slice(0, birthday ? 4 : 5).map((event) => (
                  <li key={`${event.id || event.summary}-${event.start}`}>
                    <span>{relativeDayLabel(eventStartDate(event), now)}</span>
                    <strong>{event.summary}</strong>
                    <small>{eventTimeLabel(event)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="week-summary__empty">Nada en la agenda. Semana libre, de momento.</p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
