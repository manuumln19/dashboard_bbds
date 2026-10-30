import { useEffect, useState } from "react";
import { Coffee, Crown, Droplets, Film, Gift, Moon, Shuffle, Trash2, Tv, UtensilsCrossed, X } from "lucide-react";
import { startOfWeek } from "../lib/date";
import { formatPoints } from "../lib/points";
import { REWARDS } from "../lib/rewards";
import { sheetPortal } from "../lib/sheetPortal";
import { EggAvatar } from "./EggAvatar";

const ICONS = {
  trash: Trash2,
  film: Film,
  moon: Moon,
  drops: Droplets,
  dinner: UtensilsCrossed,
  tv: Tv,
  swap: Shuffle,
  coffee: Coffee,
  crown: Crown,
};

const DONE_MS = 4000;

// Canjear los puntos de la semana. Dos toques a propósito: elegir la
// recompensa y confirmar (en el marco un toque se cuela fácil). Lo canjeado
// esta semana sale abajo con su cruz para deshacerlo.
export function RewardsSheet({ scores, points, now, onClose }) {
  const [personId, setPersonId] = useState(() => {
    const richest = [...scores].sort((a, b) => b.balance - a.balance)[0];
    return richest ? richest.person.id : "";
  });
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(null);
  const entry = scores.find((item) => item.person.id === personId) || null;
  const balance = entry ? entry.balance : 0;
  const weekStart = startOfWeek(now).getTime();
  const thisWeek = points.redemptions.filter((item) => new Date(item.createdAt).getTime() >= weekStart);
  const nameOf = (id) => {
    const found = scores.find((item) => item.person.id === id);
    return found ? found.person.name : id;
  };

  useEffect(() => {
    if (!done) return undefined;
    const timer = window.setTimeout(() => setDone(null), DONE_MS);
    return () => window.clearTimeout(timer);
  }, [done]);

  function choosePerson(id) {
    setPersonId(id);
    setPicked(null);
  }

  function confirm() {
    if (!picked || !entry || picked.cost > balance) return;
    points.redeem(personId, picked.title, picked.cost);
    setDone({ name: entry.person.name, title: picked.title });
    setPicked(null);
  }

  return sheetPortal(
    <div
      className="ink-overlay feature-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="ink-sheet card rewards-sheet" role="dialog" aria-modal="true" aria-labelledby="rewards-title">
        <header className="ink-head">
          <div>
            <span className="eyebrow">Recompensas · hasta el domingo</span>
            <h2 id="rewards-title">¿Qué os habéis ganado?</h2>
            <p>Se gastan los puntos de esta semana. El marcador no baja.</p>
          </div>
          <button type="button" className="ink-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </header>

        <div className="rewards-who" role="group" aria-label="Quién canjea">
          {scores.map((item) => (
            <button
              key={item.person.id}
              type="button"
              className={`rewards-who__person tone-${item.person.tone}${item.person.id === personId ? " is-on" : ""}`}
              aria-pressed={item.person.id === personId}
              onClick={() => choosePerson(item.person.id)}
            >
              <EggAvatar person={item.person} size={34} cracked={item.ownWeek} level={item.level.index} />
              <span>
                <strong>{item.person.name}</strong>
                <small>{formatPoints(item.balance)} pts para gastar</small>
              </span>
            </button>
          ))}
        </div>

        <div className="rewards-grid">
          {REWARDS.map((reward) => {
            const Icon = ICONS[reward.icon] || Gift;
            const missing = reward.cost - balance;
            const isPicked = picked && picked.id === reward.id;
            return (
              <button
                key={reward.id}
                type="button"
                className={`rewards-card${isPicked ? " is-on" : ""}${missing > 0 ? " is-locked" : ""}`}
                aria-pressed={Boolean(isPicked)}
                disabled={missing > 0}
                onClick={() => setPicked(isPicked ? null : reward)}
              >
                <Icon size={24} strokeWidth={1.7} aria-hidden="true" />
                <strong>{reward.title}</strong>
                <span>{missing > 0 ? `Faltan ${formatPoints(missing)}` : `${formatPoints(reward.cost)} pts`}</span>
              </button>
            );
          })}
        </div>

        <footer className="rewards-foot">
          {done ? (
            <p className="rewards-foot__done" role="status">
              <Gift size={18} strokeWidth={1.9} aria-hidden="true" />
              ¡Canjeado! {done.name}: {done.title}.
            </p>
          ) : picked ? (
            <button type="button" className="rewards-foot__confirm" onClick={confirm}>
              Canjear «{picked.title}» para {entry ? entry.person.name : ""} · {formatPoints(picked.cost)} pts
            </button>
          ) : (
            <p className="rewards-foot__hint">
              {balance > 0 ? "Elige una recompensa y confírmala." : "Sin puntos que gastar todavía: a por las tareas."}
            </p>
          )}

          {thisWeek.length ? (
            <ul className="rewards-foot__list" aria-label="Canjeado esta semana">
              {thisWeek.map((item) => (
                <li key={item.id}>
                  <span>
                    {nameOf(item.personId)} · {item.reward} · −{formatPoints(item.cost)}
                  </span>
                  <button type="button" onClick={() => points.undoRedeem(item.id)} aria-label={`Deshacer: ${item.reward}`}>
                    <X size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
