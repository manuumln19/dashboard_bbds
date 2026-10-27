import { createContext, memo, useContext } from "react";

// La temporada activa, para que cualquier tarjeta pueda ponerse su detalle.
export const SeasonContext = createContext("otono");

// Dibujos de temporada en los márgenes de la pantalla (las franjas de arriba y
// abajo que dejan libres las vistas). Son SVG estáticos: nada se anima, para
// que el Frameo no tenga que repintar.

const SHAPES = {
  leaf: (
    <>
      <path d="M12 2l1.8 4.6 4.4-1.3-2.2 4 4.6 2.5-5 .9.9 5.3L12 15l-4.5 3.9.9-5.3-5-.9 4.6-2.5-2.2-4 4.4 1.3z" />
      <path d="M12 15v7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  oak: (
    <>
      <path d="M12 3c2 1 1 3 3 3.5S18 6 18 8s-2 2-1 3.5 2 1.5 1 3.5-3 0-3.5 1.5S13 20 12 20s-2-2-2.5-3.5S7 17 6 15s0-2 1-3.5S6 10 6 8s2-1 3-1.5S10 4 12 3z" />
      <path d="M12 7v15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </>
  ),
  bat: (
    <path d="M12 9c.6-1.3 1.4-1.3 2 0 1.6-.8 4.3-1.4 8 .5-1.8.4-2.8 1.4-3 2.8-1.3-.9-2.5-.6-3.2.7-1-.8-2-.7-2.6.3-.6-1-1.6-1.1-2.6-.3-.7-1.3-1.9-1.6-3.2-.7-.2-1.4-1.2-2.4-3-2.8 3.7-1.9 6.4-1.3 8-.5.6-1.3 1.4-1.3 2 0z" />
  ),
  pumpkin: (
    <>
      <path d="M12 7c-1.5-1-5.5-1.4-7.5 1.4S3.6 17 6.4 19c2 1.4 3.8.6 5.6.6s3.6.8 5.6-.6c2.8-2 3.9-7.8 1.9-10.6S13.5 6 12 7z" />
      <path d="M12 7c-1.2 2-1.2 10 0 12.6M12 7c1.2 2 1.2 10 0 12.6" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1" />
      <path d="M12 7.2c0-2 .6-3.4 2-4.2" fill="none" stroke="#5b6b2e" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  ghost: (
    <>
      <path d="M5 21V11a7 7 0 0114 0v10l-2.3-1.8L14.3 21 12 19.2 9.7 21l-2.4-1.8z" stroke="rgba(60, 40, 80, 0.45)" strokeWidth="0.9" />
      <circle cx="9.5" cy="11" r="1.2" fill="#2b2530" />
      <circle cx="14.5" cy="11" r="1.2" fill="#2b2530" />
    </>
  ),
  snow: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
      <path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5M3.6 10.4l3.4-.9-.9-3.4M20.4 13.6l-3.4.9.9 3.4M6.1 17.9l.9-3.4-3.4-.9M17.9 6.1l-.9 3.4 3.4.9" />
    </g>
  ),
  star: <path d="M12 2.5l2.7 6 6.5.6-4.9 4.4 1.4 6.4L12 16.6l-5.7 3.3 1.4-6.4-4.9-4.4 6.5-.6z" />,
  bauble: (
    <>
      <circle cx="12" cy="14" r="7" />
      <rect x="10" y="5" width="4" height="3" rx="0.8" fill="#b9a26a" />
      <path d="M6 13.5c2 1.5 10 1.5 12 0" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
    </>
  ),
  heart: <path d="M12 20s-8-4.8-8-10.4C4 6.7 6.1 5 8.3 5c1.6 0 2.9.8 3.7 2.1C12.8 5.8 14.1 5 15.7 5 17.9 5 20 6.7 20 9.6 20 15.2 12 20 12 20z" />,
  flower: (
    <>
      <circle cx="12" cy="6.5" r="3.6" />
      <circle cx="17.2" cy="10.3" r="3.6" />
      <circle cx="15.2" cy="16.4" r="3.6" />
      <circle cx="8.8" cy="16.4" r="3.6" />
      <circle cx="6.8" cy="10.3" r="3.6" />
      <circle cx="12" cy="12" r="2.6" fill="#f3c34d" />
    </>
  ),
  lemon: (
    <>
      <path d="M4 13c0-4 3.8-7.5 8.5-7.5 2.7 0 5 1.2 6.3 3 1.3.2 2 1 2 2s-.4 1.6-1 2c-.4 4-3.9 6.5-8 6.5C7 19 4 16.5 4 13z" />
      <path d="M14 5.6c.6-1.8 2.2-2.6 4-2.4-.6 1.6-2 2.5-4 2.4z" fill="#5f8a3a" />
    </>
  ),
  farolillo: (
    <>
      <path d="M12 2v2" fill="none" stroke="#4a4136" strokeWidth="1.2" />
      <ellipse cx="12" cy="12.5" rx="7" ry="8.5" />
      <path d="M7 6.5c1.5 4 1.5 8 0 12M17 6.5c-1.5 4-1.5 8 0 12M12 4v17" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.9" />
      <circle cx="9.5" cy="10" r="1.1" fill="#fff" opacity="0.8" />
      <circle cx="14.5" cy="15" r="1.1" fill="#fff" opacity="0.8" />
      <rect x="9.5" y="3.4" width="5" height="1.6" rx="0.5" fill="#4a4136" />
    </>
  ),
  flame: (
    <>
      <path d="M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 1.6-4.4 2.6-6 .4 1.6 1.2 2.6 2.2 3C10.4 8 11 5 12 2z" />
      <path d="M12 11c.6 2 3 3 3 5.5a3 3 0 01-6 0c0-1.5.8-2.4 1.4-3.2.3.7.7 1.1 1.1 1.3-.2-1.3.1-2.6.5-3.6z" fill="#f6d36b" />
    </>
  ),
  candle: (
    <>
      <rect x="9" y="9" width="6" height="13" rx="1" fill="#efe6d2" />
      <path d="M12 3c.8 1.6 2 2.4 2 4a2 2 0 01-4 0c0-1.6 1.2-2.4 2-4z" />
      <path d="M12 7v2" stroke="#4a4136" strokeWidth="0.8" />
    </>
  ),
  balloon: (
    <>
      <ellipse cx="12" cy="9" rx="6" ry="7" />
      <path d="M11 16l1-.8 1 .8zM12 16c-.5 2 1 3 0 6" fill="none" stroke="#6f6658" strokeWidth="0.9" />
      <ellipse cx="9.8" cy="6.6" rx="1.3" ry="2" fill="#fff" opacity="0.45" />
    </>
  ),
  confetti: (
    <>
      <rect x="4" y="5" width="4" height="2" rx="0.6" transform="rotate(25 6 6)" />
      <rect x="14" y="3" width="4" height="2" rx="0.6" transform="rotate(-30 16 4)" />
      <circle cx="11" cy="13" r="1.6" />
      <rect x="15" y="15" width="4" height="2" rx="0.6" transform="rotate(50 17 16)" />
      <circle cx="6" cy="18" r="1.3" />
    </>
  ),
  tree: (
    <>
      <path d="M12 2l5 6h-2.5l4 5h-2.8L20 18H4l4.3-5H5.5l4-5H7z" />
      <rect x="10.6" y="18" width="2.8" height="4" fill="#7a5233" />
    </>
  ),
  cake: (
    <>
      <rect x="4" y="12" width="16" height="9" rx="1.5" />
      <path d="M4 15c2 1.5 4-1.5 6 0s4-1.5 6 0 3 0 4-.5" fill="none" stroke="#fff" strokeWidth="1.3" opacity="0.8" />
      <rect x="7.5" y="7" width="1.6" height="5" fill="#f3e3c3" />
      <rect x="11.2" y="7" width="1.6" height="5" fill="#f3e3c3" />
      <rect x="14.9" y="7" width="1.6" height="5" fill="#f3e3c3" />
      <path d="M8.3 4.2c.5.9 1 1.3 1 2a1 1 0 01-2 0c0-.7.5-1.1 1-2zM12 4.2c.5.9 1 1.3 1 2a1 1 0 01-2 0c0-.7.5-1.1 1-2zM15.7 4.2c.5.9 1 1.3 1 2a1 1 0 01-2 0c0-.7.5-1.1 1-2z" fill="#f0a52a" />
    </>
  ),
  acorn: (
    <>
      <path d="M6 10c0-3 3-4.5 6-4.5s6 1.5 6 4.5z" fill="#7a5233" />
      <path d="M7 10h10c0 5-2.5 9-5 10.5C9.5 19 7 15 7 10z" />
      <path d="M12 5.5V3" fill="none" stroke="#5a3d25" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  snowman: (
    <>
      <circle cx="12" cy="16" r="6" fill="#f6f8fb" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="12" cy="7.5" r="4" fill="#f6f8fb" stroke="currentColor" strokeWidth="0.8" />
      <path d="M12 7.6l3 1-3 .5z" fill="#ef8f1f" />
      <circle cx="10.6" cy="6.6" r="0.6" fill="#2b2530" />
      <circle cx="13.2" cy="6.6" r="0.6" fill="#2b2530" />
      <path d="M8.5 10.6h7l-1 1.6h-5z" fill="#c22f3c" />
    </>
  ),
  sun: (
    <g>
      <circle cx="12" cy="12" r="4.6" />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </g>
  ),
};

const PALETTES = {
  otono: { shapes: ["leaf", "oak", "leaf"], colors: ["#c4622d", "#d8962b", "#9a3f22", "#8a8a2e", "#e0a948"] },
  spooky: { shapes: ["bat", "leaf", "bat", "oak"], colors: ["#2b2530", "#c4622d", "#d8962b", "#2b2530"] },
  halloween: { shapes: ["bat", "pumpkin", "ghost", "bat"], colors: ["#2b2530", "#e0761f", "#efe9df", "#2b2530"] },
  navidad: { shapes: ["star", "bauble", "snow", "bauble"], colors: ["#c8a24a", "#c22f3c", "#9fc3d9", "#2f7d57"] },
  invierno: { shapes: ["snow"], colors: ["#8fb6d1", "#b9cfdd", "#7da2bf"] },
  amor: { shapes: ["heart"], colors: ["#d92363", "#ee7aa0", "#b81d52"] },
  primavera: { shapes: ["flower", "leaf"], colors: ["#e889b0", "#9b84dd", "#f3f0e8", "#6aa56c"] },
  verano: { shapes: ["lemon", "sun", "lemon"], colors: ["#f2c230", "#f0a52a", "#e8cf3a"] },
  feria: { shapes: ["farolillo"], colors: ["#d7263d", "#2f7d57", "#e7b53c", "#f0f0e8", "#3f7cc4"] },
  lumbres: { shapes: ["flame"], colors: ["#e0611f", "#d7392b", "#ef8f1f"] },
  semanasanta: { shapes: ["candle"], colors: ["#e7a93c", "#d98c2b"] },
  cumple: { shapes: ["balloon", "confetti", "balloon"], colors: ["#d92363", "#3f7cc4", "#e7b53c", "#2a9b80", "#725fc1"] },
};

// Cuántos dibujos por franja. Halloween y Navidad van más cargados.
const DENSITY = { halloween: 14, navidad: 12, spooky: 7, feria: 16, cumple: 14, semanasanta: 6 };

// Pseudoaleatorio estable: la misma temporada siempre se dibuja igual.
function seeded(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function hashString(text) {
  let hash = 7;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 233280;
  }
  return hash;
}

function scatter(seasonId) {
  const palette = PALETTES[seasonId];
  const random = seeded(hashString(seasonId));
  const perBand = DENSITY[seasonId] || 9;
  const items = [];
  ["top", "bottom"].forEach((band) => {
    for (let index = 0; index < perBand; index += 1) {
      const slot = (index + 0.15 + random() * 0.7) / perBand;
      items.push({
        band,
        left: slot * 100,
        offset: random() * 3,
        size: 11 + Math.round(random() * 5),
        rotate: Math.round(random() * 70 - 35),
        shape: palette.shapes[index % palette.shapes.length],
        color: palette.colors[Math.floor(random() * palette.colors.length)],
      });
    }
  });
  return items;
}

// Guirnalda de luces para Navidad: un cable que cuelga por la franja de arriba.
function Garland() {
  const bulbs = [];
  const colors = ["#c22f3c", "#e7b53c", "#2f7d57", "#3f7cc4"];
  for (let index = 0; index < 28; index += 1) {
    const x = 10 + index * 36;
    const phase = (index % 7) / 7;
    const y = 6 + Math.sin(phase * Math.PI) * 8;
    bulbs.push(
      <g key={index} transform={`translate(${x} ${y})`}>
        <rect x="-1.6" y="0" width="3.2" height="3" fill="#4a4136" />
        <ellipse cx="0" cy="7" rx="3.4" ry="4.6" fill={colors[index % colors.length]} />
      </g>
    );
  }
  let wire = "M0 6";
  for (let segment = 0; segment < 4; segment += 1) {
    const start = segment * 252;
    wire += ` Q${start + 126} 22 ${start + 252} 6`;
  }
  return (
    <svg className="season-decor__garland" viewBox="0 0 1008 28" preserveAspectRatio="none" aria-hidden="true">
      <path d={wire} fill="none" stroke="#4a4136" strokeWidth="1.2" />
      {bulbs}
    </svg>
  );
}

// Telaraña para la esquina de arriba a la derecha.
function Web() {
  return (
    <svg className="season-decor__web" viewBox="0 0 100 100" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="0.8">
        <path d="M100 0L0 0M100 0L10 45M100 0L40 80M100 0L75 100M100 0L100 100" />
        <path d="M78 0Q82 10 92 14Q96 18 100 22" />
        <path d="M55 0Q62 20 80 28Q92 38 100 44" />
        <path d="M30 0Q42 30 66 46Q84 60 100 68" />
        <path d="M8 0Q22 40 52 62Q74 82 100 92" />
      </g>
      <path d="M62 52v14" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="62" cy="68" r="3" fill="currentColor" />
    </svg>
  );
}

export const SeasonDecor = memo(function SeasonDecor({ seasonId }) {
  if (!PALETTES[seasonId]) return null;
  const items = scatter(seasonId);

  return (
    <div className={`season-decor season-decor--${seasonId}`} aria-hidden="true">
      {seasonId === "navidad" ? <Garland /> : null}
      {seasonId === "halloween" || seasonId === "spooky" ? <Web /> : null}
      {items
        .filter((item) => !(seasonId === "navidad" && item.band === "top"))
        .map((item, index) => (
          <svg
            key={index}
            className={`season-decor__item season-decor__item--${item.band}`}
            viewBox="0 0 24 24"
            width={item.size}
            height={item.size}
            style={{
              left: `${item.left}%`,
              [item.band]: `${item.offset}px`,
              color: item.color,
              transform: `rotate(${item.rotate}deg)`,
            }}
          >
            <g fill="currentColor">{SHAPES[item.shape]}</g>
          </svg>
        ))}
    </div>
  );
});

const BADGES = {
  otono: ["oak", "#c4622d"],
  spooky: ["bat", "#2b2530"],
  halloween: ["pumpkin", "#e0761f"],
  navidad: ["star", "#c8a24a"],
  invierno: ["snow", "#7da2bf"],
  amor: ["heart", "#d92363"],
  primavera: ["flower", "#e889b0"],
  verano: ["sun", "#f0a52a"],
  feria: ["farolillo", "#d7263d"],
  lumbres: ["flame", "#e0611f"],
  semanasanta: ["candle", "#e7a93c"],
  cumple: ["balloon", "#d92363"],
};

// El dibujo grande de la temporada, en el hueco libre del rail.
export function SeasonBadge({ seasonId }) {
  const badge = BADGES[seasonId];
  if (!badge) return null;
  return (
    <div className="season-badge" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="46" height="46" style={{ color: badge[1] }}>
        <g fill="currentColor">{SHAPES[badge[0]]}</g>
      </svg>
    </div>
  );
}

// Escenas para el hueco libre de la tarjeta de la hora: varias piezas
// colocadas a mano en un lienzo de 150 × 96.
const SCENES = {
  otono: [["oak", 8, 44, 42, "#c4622d", -20], ["leaf", 52, 52, 36, "#d8962b", 15], ["acorn", 92, 50, 38, "#a8743f", 8], ["leaf", 104, 8, 30, "#9a3f22", -30], ["leaf", 40, 6, 26, "#e0a948", 40]],
  spooky: [["pumpkin", 18, 40, 52, "#e0761f", 0], ["bat", 82, 10, 40, "#2b2530", -10], ["bat", 110, 38, 26, "#2b2530", 12], ["leaf", 82, 62, 28, "#c4622d", 20]],
  halloween: [["pumpkin", 2, 34, 62, "#e0761f", -4], ["pumpkin", 60, 52, 44, "#ea8a2c", 6], ["ghost", 100, 18, 44, "#f4efe6", 0], ["bat", 50, 2, 38, "#2b2530", -12], ["bat", 118, 0, 26, "#2b2530", 16]],
  navidad: [["tree", 40, 6, 86, "#2f7d57", 0], ["star", 66, 0, 26, "#c8a24a", 0], ["bauble", 6, 54, 34, "#c22f3c", -6], ["bauble", 112, 58, 32, "#3f7cc4", 8], ["snow", 118, 10, 22, "#9fc3d9", 0]],
  invierno: [["snowman", 30, 12, 80, "#7da2bf", 0], ["snow", 104, 10, 28, "#8fb6d1", 0], ["snow", 6, 20, 22, "#b9cfdd", 20], ["snow", 118, 56, 20, "#7da2bf", -10]],
  amor: [["heart", 30, 18, 62, "#d92363", -8], ["heart", 92, 8, 36, "#ee7aa0", 12], ["heart", 98, 54, 28, "#b81d52", -14]],
  primavera: [["flower", 12, 34, 50, "#e889b0", 0], ["flower", 70, 46, 40, "#9b84dd", 15], ["flower", 104, 14, 34, "#e889b0", -10], ["leaf", 56, 8, 28, "#6aa56c", 30]],
  verano: [["sun", 70, 4, 64, "#f0a52a", 0], ["lemon", 10, 46, 44, "#f2c230", -12], ["lemon", 52, 62, 30, "#e8cf3a", 20]],
  feria: [["farolillo", 4, 6, 44, "#d7263d", -4], ["farolillo", 40, 20, 40, "#2f7d57", 4], ["farolillo", 74, 4, 46, "#e7b53c", -2], ["farolillo", 112, 22, 36, "#3f7cc4", 6]],
  lumbres: [["flame", 28, 10, 74, "#e0611f", 0], ["flame", 90, 34, 46, "#d7392b", 6], ["flame", 4, 46, 36, "#ef8f1f", -6]],
  semanasanta: [["candle", 20, 14, 70, "#e7a93c", 0], ["candle", 66, 26, 58, "#d98c2b", 0], ["candle", 106, 36, 48, "#e7a93c", 0]],
  cumple: [["cake", 36, 32, 64, "#ee7aa0", 0], ["balloon", 4, 2, 46, "#3f7cc4", -8], ["balloon", 104, 0, 44, "#e7b53c", 10], ["confetti", 104, 54, 34, "#725fc1", 0]],
};

export function SeasonScene({ seasonId }) {
  const scene = SCENES[seasonId];
  if (!scene) return null;
  return (
    <svg className={`season-scene season-scene--${seasonId}`} viewBox="0 0 150 96" aria-hidden="true">
      {scene.map(([shape, x, y, size, color, rotate], index) => (
        <g key={index} transform={`rotate(${rotate} ${x + size / 2} ${y + size / 2})`} style={{ color }}>
          <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" overflow="visible">
            <g fill="currentColor">{SHAPES[shape]}</g>
          </svg>
        </g>
      ))}
    </svg>
  );
}

// Detalle pequeño junto al título de una tarjeta.
export function SeasonMark() {
  const seasonId = useContext(SeasonContext);
  const badge = BADGES[seasonId];
  if (!badge) return null;
  return (
    <svg className="season-mark" viewBox="0 0 24 24" width="22" height="22" style={{ color: badge[1] }} aria-hidden="true">
      <g fill="currentColor">{SHAPES[badge[0]]}</g>
    </svg>
  );
}
