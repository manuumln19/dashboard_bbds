import { useState } from "react";
import { FlaskConical, Minus, Pause, Play, Plus } from "lucide-react";
import { LOCATION } from "../config";
import { formatClock } from "../lib/date";

const ZOOM_LEVELS = [1, 1.3, 1.6];

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : null;
}

export function RadarPanel({ now, today }) {
  const [zoom, setZoom] = useState(0);
  const [playing, setPlaying] = useState(true);
  const rainChance = today ? round(today.precipitationProbability) : null;

  function zoomIn() {
    setZoom((current) => Math.min(ZOOM_LEVELS.length - 1, current + 1));
  }

  function zoomOut() {
    setZoom((current) => Math.max(0, current - 1));
  }

  return (
    <article className="card radar-panel" aria-labelledby="radar-title">
      <header className="radar-panel__head">
        <div>
          <span className="eyebrow">Radar de lluvia</span>
          <h2 id="radar-title">{LOCATION.name} y alrededores</h2>
        </div>
        <span
          className="radar-demo"
          title="Mapa y precipitación simulados con datos locales de demostración"
        >
          <FlaskConical size={12} strokeWidth={2} aria-hidden="true" />
          Demo
        </span>
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
          role="img"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="radar-rain-light">
              <stop offset="0%" stopColor="#71cbb2" stopOpacity="0.78" />
              <stop offset="55%" stopColor="#a5dd9a" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#a5dd9a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="radar-rain-mid">
              <stop offset="0%" stopColor="#f1ce72" stopOpacity="0.86" />
              <stop offset="48%" stopColor="#a9d98f" stopOpacity="0.52" />
              <stop offset="100%" stopColor="#a9d98f" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="radar-rain-heavy">
              <stop offset="0%" stopColor="#e38f7c" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#f1ce72" stopOpacity="0.56" />
              <stop offset="100%" stopColor="#f1ce72" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect className="radar-map__land" width="640" height="560" />

          <g className="radar-map__zoom">
            <path
              className="radar-map__park"
              d="M-20 372c56-42 123-49 167-23 35 21 30 65 3 91-44 42-126 53-170 24z"
            />
            <path
              className="radar-map__park radar-map__park--small"
              d="M424 248c39-22 85-17 107 8 20 23 8 56-25 70-37 15-85 4-96-24-6-17 2-38 14-54z"
            />
            <path
              className="radar-map__river"
              d="M-30 466c84-39 145-24 211-4 90 27 137 17 201-16 67-35 157-42 302 4"
            />
            <path
              className="radar-map__road radar-map__road--major"
              d="M-25 137c104 3 159 45 223 99 57 48 116 75 198 85 92 11 168 46 256 107"
            />
            <path
              className="radar-map__road radar-map__road--major"
              d="M159 -24c35 77 38 148 27 218-16 103-3 170 63 249 34 41 49 81 53 141"
            />
            <path
              className="radar-map__road"
              d="M-10 296c65-14 117-42 173-40 64 3 103 47 167 52 70 6 128-36 191-53 48-13 91-12 139-1"
            />
            <path
              className="radar-map__road"
              d="M242 573c10-90 33-153 97-203 50-39 83-91 91-167 4-42 22-81 59-122"
            />
            <path
              className="radar-map__road"
              d="M386 562c-15-68-5-119 38-165 41-44 63-84 68-148"
            />
            <g className="radar-map__blocks">
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
            <g className="radar-map__labels">
              <text x="318" y="202" textAnchor="middle">
                MADRID
              </text>
              <text x="52" y="353">
                CASA DE CAMPO
              </text>
              <text x="452" y="234">
                EL RETIRO
              </text>
              <text x="497" y="122">
                A-2
              </text>
              <text x="59" y="248">
                M-30
              </text>
              <text x="390" y="451">
                M-30
              </text>
            </g>

            <g className="radar-cells">
              <ellipse
                className="radar-cell radar-cell--a"
                cx="105"
                cy="230"
                rx="122"
                ry="62"
                fill="url(#radar-rain-light)"
              />
              <ellipse
                className="radar-cell radar-cell--b"
                cx="195"
                cy="276"
                rx="88"
                ry="48"
                fill="url(#radar-rain-mid)"
              />
              <ellipse
                className="radar-cell radar-cell--c"
                cx="75"
                cy="365"
                rx="88"
                ry="59"
                fill="url(#radar-rain-light)"
              />
              <ellipse
                className="radar-cell radar-cell--d"
                cx="246"
                cy="178"
                rx="62"
                ry="35"
                fill="url(#radar-rain-heavy)"
              />
              <ellipse
                className="radar-cell radar-cell--e"
                cx="532"
                cy="358"
                rx="93"
                ry="42"
                fill="url(#radar-rain-light)"
              />
            </g>

            <g className="radar-rings">
              <circle cx="320" cy="280" r="88" />
              <circle cx="320" cy="280" r="158" />
              <circle cx="320" cy="280" r="228" />
              <path d="M320 42v476M76 280h488" />
            </g>

            <g className="radar-home" transform="translate(320 280)">
              <circle className="radar-home__halo" r="19" />
              <circle className="radar-home__dot" r="4.5" />
              <text x="12" y="-12">
                BBDS
              </text>
            </g>
          </g>
        </svg>

        <span className="radar-sweep" aria-hidden="true" />

        <div className="radar-controls" aria-label="Controles del radar">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom === 0}
            aria-label="Alejar el radar"
            title="Alejar"
          >
            <Minus size={15} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <span>{ZOOM_LEVELS[zoom]}×</span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom === ZOOM_LEVELS.length - 1}
            aria-label="Acercar el radar"
            title="Acercar"
          >
            <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        <div className="radar-stage__meta">
          <span>40° 25′ N · 3° 42′ O</span>
          <span>{formatClock(now)} · animación demo</span>
        </div>
      </div>

      <footer className="radar-panel__foot">
        <div className="radar-legend">
          <div className="radar-legend__bar" aria-hidden="true" />
          <div className="radar-legend__labels">
            <span>Débil</span>
            <span>Intensa</span>
          </div>
          <span className="radar-legend__note">
            {rainChance === null
              ? "Mapa ilustrativo"
              : `Hoy ${rainChance}% de lluvia`}
          </span>
        </div>
        <button
          type="button"
          className="radar-play"
          onClick={() => setPlaying((current) => !current)}
          aria-pressed={playing}
          aria-label={playing ? "Pausar animación del radar" : "Reproducir animación del radar"}
        >
          {playing ? (
            <Pause size={15} strokeWidth={2.1} aria-hidden="true" />
          ) : (
            <Play size={15} strokeWidth={2.1} aria-hidden="true" />
          )}
          {playing ? "Pausar" : "Reproducir"}
        </button>
      </footer>
    </article>
  );
}
