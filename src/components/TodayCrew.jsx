import { Flame, Trophy } from "lucide-react";
import { weeklyScores } from "../lib/points";
import { EggAvatar } from "./EggAvatar";

// La casa en una fila: el huevo de cada uno, sus puntos de la semana y su
// racha. Toca para ir a Limpieza; el trofeo abre el resumen semanal.
export function TodayCrew({ now, cleaning, lists, onOpenCleaning, onOpenSummary }) {
  const { scores, mvp } = weeklyScores({ cleaning, lists, now });
  if (!scores.length) return null;

  return (
    <div className="card today-crew" aria-label="Puntos de la semana">
      <button type="button" className="today-crew__people" onClick={onOpenCleaning}>
        {scores.map((entry) => (
          <span
            key={entry.person.id}
            className={`today-crew__person tone-${entry.person.tone}${
              mvp && mvp.person.id === entry.person.id ? " is-mvp" : ""
            }`}
          >
            <EggAvatar person={entry.person} size={30} cracked={entry.ownWeek} />
            <span className="today-crew__stats">
              <strong>{entry.points}</strong>
              <small>pts · {entry.level.label}</small>
              <span className="today-crew__bar" aria-hidden="true">
                <span
                  style={{
                    transform: `scaleX(${
                      entry.level.next
                        ? Math.min(1, (entry.points - entry.level.min) / (entry.level.next - entry.level.min))
                        : 1
                    })`,
                  }}
                />
              </span>
            </span>
            {entry.streak ? (
              <span className="today-crew__streak" title={`${entry.streak} semanas seguidas`}>
                <Flame size={14} strokeWidth={2.2} aria-hidden="true" />
                {entry.streak}
              </span>
            ) : null}
          </span>
        ))}
      </button>
      <button
        type="button"
        className="icon-button today-crew__trophy"
        onClick={onOpenSummary}
        aria-label="Ver el resumen de la semana"
      >
        <Trophy size={18} strokeWidth={1.9} aria-hidden="true" />
      </button>
    </div>
  );
}
