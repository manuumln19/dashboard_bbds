import { useState } from "react";
import { Minus, Pause, Play, Plus } from "lucide-react";
import { LOCATION } from "../config";
import { formatClock } from "../lib/date";

const ZOOM_LEVELS = [1, 1.3, 1.6];

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : null;
}

export function RadarPanel({ now, today, isDemo = false }) {
  const [zoom, setZoom] = useState(0);
  const [playing, setPlaying] = useState(true);
  const rainChance = today ? round(today.precipitationProbability) : null;

  return (
    <aside className="radar" aria-labelledby="radar-title">
      <header className="radar-head">
        <div>
          <p className="radar-kicker">Radar de lluvia · lectura local</p>
          <h2 id="radar-title">{LOCATION.name} y alrededores</h2>
        </div>
        <p className="radar-meta">
          <strong>{formatClock(now)}</strong>
          <br />
          {isDemo ? "Demo local" : "Animación local"}
        </p>
      </header>

      <div
        className={`radar-stage${playing ? "" : " is-paused"}`}
        style={{ "--radar-zoom": ZOOM_LEVELS[zoom] }}
        role="group"
        aria-label={`Mapa de radar de lluvia de demostración sobre ${LOCATION.name}`}
      >
        <svg
          className="radar-map"
          viewBox="0 0 640 560"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="aurora-rain-light">
              <stop offset="0" stopColor="#5ed0b3" stopOpacity=".72" />
              <stop offset="52%" stopColor="#6ed7b7" stopOpacity=".34" />
              <stop offset="100%" stopColor="#6ed7b7" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="aurora-rain-mid">
              <stop offset="0" stopColor="#f0cb6f" stopOpacity=".8" />
              <stop offset="48%" stopColor="#a7d48d" stopOpacity=".35" />
              <stop offset="100%" stopColor="#a7d48d" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="aurora-rain-heavy">
              <stop offset="0" stopColor="#ef7296" stopOpacity=".82" />
              <stop offset="48%" stopColor="#f0c276" stopOpacity=".34" />
              <stop offset="100%" stopColor="#f0c276" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect className="land" width="640" height="560" />

          <path
            className="park"
            d="M-20 372c56-42 123-49 167-23 35 21 30 65 3 91-44 42-126 53-170 24z"
          />
          <path
            className="park"
            d="M424 248c39-22 85-17 107 8 20 23 8 56-25 70-37 15-85 4-96-24-6-17 2-38 14-54z"
          />
          <path
            className="river"
            d="M-30 466c84-39 145-24 211-4 90 27 137 17 201-16 67-35 157-42 302 4"
          />

          <path
            className="road-major"
            d="M-25 137c104 3 159 45 223 99 57 48 116 75 198 85 92 11 168 46 256 107"
          />
          <path
            className="road-major"
            d="M159 -24c35 77 38 148 27 218-16 103-3 170 63 249 34 41 49 81 53 141"
          />
          <path
            className="road"
            d="M-10 296c65-14 117-42 173-40 64 3 103 47 167 52 70 6 128-36 191-53 48-13 91-12 139-1"
          />
          <path
            className="road"
            d="M242 573c10-90 33-153 97-203 50-39 83-91 91-167 4-42 22-81 59-122"
          />
          <path
            className="road"
            d="M386 562c-15-68-5-119 38-165 41-44 63-84 68-148"
          />

          <g className="blocks">
            <rect x="259" y="194" width="76" height="45" rx="5" />
            <rect x="346" y="202" width="49" height="35" rx="5" />
            <rect x="269" y="250" width="55" height="31" rx="5" />
            <rect x="334" y="249" width="84" height="43" rx="5" />
            <rect x="230" y="312" width="61" height="38" rx="5" />
            <rect x="301" y="307" width="47" height="30" rx="5" />
            <rect x="360" y="313" width="76" height="47" rx="5" />
            <rect x="446" y="292" width="57" height="37" rx="5" />
            <rect x="183" y="250" width="44" height="29" rx="5" />
          </g>

          <g className="map-label">
            <text x="318" y="202" textAnchor="middle">
              {LOCATION.name.toUpperCase()}
            </text>
            <text x="318" y="342" textAnchor="middle">
              CENTRO
            </text>
            <text x="407" y="122">
              N-321
            </text>
            <text x="390" y="451">
              A-316
            </text>
          </g>

          <g className="rain">
            <ellipse cx="105" cy="230" rx="122" ry="62" fill="url(#aurora-rain-light)" />
            <ellipse cx="195" cy="276" rx="88" ry="48" fill="url(#aurora-rain-mid)" />
            <ellipse cx="75" cy="365" rx="88" ry="59" fill="url(#aurora-rain-light)" />
            <ellipse cx="246" cy="178" rx="62" ry="35" fill="url(#aurora-rain-heavy)" />
            <ellipse cx="436" cy="304" rx="92" ry="42" fill="url(#aurora-rain-mid)" />
            <ellipse cx="436" cy="304" rx="36" ry="17" fill="url(#aurora-rain-heavy)" />
            <ellipse cx="532" cy="358" rx="93" ry="42" fill="url(#aurora-rain-light)" />
          </g>

          <g className="rings">
            <circle cx="320" cy="280" r="88" />
            <circle cx="320" cy="280" r="158" />
            <circle cx="320" cy="280" r="228" />
            <path className="rings-axis" d="M320 42v476M76 280h488" />
          </g>

          <g transform="translate(320 280)">
            <circle className="home-halo" r="19" />
            <circle className="home-dot" r="4.5" />
            <text className="home-label" x="12" y="-12">
              BBDS
            </text>
          </g>
        </svg>

        <div className="radar-sweep" aria-hidden="true" />
        <p className="radar-status">
          <i aria-hidden="true" />
          {rainChance === null
            ? "Mapa ilustrativo"
            : rainChance >= 30
              ? `Lluvia probable · ${rainChance}%`
              : "Sin lluvia en la comarca · ecos débiles"}
        </p>

        <div className="radar-zoom" aria-label="Controles del radar">
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(0, value - 1))}
            disabled={zoom === 0}
            aria-label="Alejar el radar"
          >
            <Minus size={13} strokeWidth={1.9} aria-hidden="true" />
          </button>
          <span>{ZOOM_LEVELS[zoom]}×</span>
          <button
            type="button"
            onClick={() =>
              setZoom((value) => Math.min(ZOOM_LEVELS.length - 1, value + 1))
            }
            disabled={zoom === ZOOM_LEVELS.length - 1}
            aria-label="Acercar el radar"
          >
            <Plus size={13} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>

        <span className="radar-scale">
          <span aria-hidden="true" />
          10 km / 5 km
        </span>
      </div>

      <footer className="radar-foot">
        <div className="radar-legend">
          <div className="radar-legend-bar" aria-hidden="true" />
          <div className="radar-legend-labels">
            <span>Débil</span>
            <span>Intensa</span>
          </div>
        </div>
        <p className="radar-note">
          <strong>
            {rainChance !== null && rainChance >= 30
              ? "Lluvia posible en la comarca"
              : "Sin lluvia en la comarca"}
          </strong>
          {rainChance === null ? "Mapa ilustrativo" : `Hoy ${rainChance}% · mapa ilustrativo`}
        </p>
        <button
          type="button"
          className="radar-play"
          onClick={() => setPlaying((value) => !value)}
          aria-pressed={playing}
          aria-label={
            playing ? "Pausar animación del radar" : "Reproducir animación del radar"
          }
        >
          {playing ? (
            <Pause size={10} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Play size={10} strokeWidth={1.8} aria-hidden="true" />
          )}
          {playing ? "Pausar" : "Reproducir"}
        </button>
      </footer>
    </aside>
  );
}
