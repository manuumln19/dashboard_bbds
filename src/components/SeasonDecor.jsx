import { createContext, memo, useContext } from "react";

// La temporada activa, para que cualquier tarjeta pueda ponerse su detalle.
export const SeasonContext = createContext("otono");

// Dibujos de temporada en el marco de la pantalla, alrededor de las vistas.
// Son SVG estáticos: nada se anima, para que el Frameo no tenga que repintar.

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
    <>
      <path d="M10.6 10C8 7.6 4.6 6.6 1 7c1.6 1.4 2.3 3.3 2.4 5.4 1-.9 2.2-1.1 3.4-.6.1 1.2.5 2.2 1.3 3 .7-1 1.6-1.6 2.6-1.8z" />
      <path d="M13.4 10c2.6-2.4 6-3.4 9.6-3-1.6 1.4-2.3 3.3-2.4 5.4-1-.9-2.2-1.1-3.4-.6-.1 1.2-.5 2.2-1.3 3-.7-1-1.6-1.6-2.6-1.8z" />
      <ellipse cx="12" cy="12" rx="2" ry="3.4" />
      <circle cx="12" cy="8.2" r="1.8" />
      <path d="M10.6 7.4l.3-2 1 1.3zM13.4 7.4l-.3-2-1 1.3z" />
    </>
  ),
  pumpkin: (
    <>
      <path d="M12 7c-1.5-1-5.5-1.4-7.5 1.4S3.6 17 6.4 19c2 1.4 3.8.6 5.6.6s3.6.8 5.6-.6c2.8-2 3.9-7.8 1.9-10.6S13.5 6 12 7z" />
      <path d="M12 7c-1.2 2-1.2 10 0 12.6M12 7c1.2 2 1.2 10 0 12.6" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1" />
      <path d="M12 7.2c0-2 .6-3.4 2-4.2" fill="none" stroke="#5b6b2e" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  // Calabaza tallada y encendida, para la noche de Halloween.
  jack: (
    <>
      <path d="M12 7c-1.5-1-5.5-1.4-7.5 1.4S3.6 17 6.4 19c2 1.4 3.8.6 5.6.6s3.6.8 5.6-.6c2.8-2 3.9-7.8 1.9-10.6S13.5 6 12 7z" />
      <path d="M12 7.2c0-2 .6-3.4 2-4.2" fill="none" stroke="#5b6b2e" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.6 11.2l2.6 1.4-2.8 1zM16.4 11.2l-2.6 1.4 2.8 1zM7.4 15.2c1.6 1.4 7.6 1.4 9.2 0-.4 2-2.2 3-4.6 3s-4.2-1-4.6-3z" fill="#ffd36b" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="1.5" />
      <rect x="3" y="7.5" width="18" height="4" rx="1" />
      <rect x="11" y="7.5" width="2" height="13.5" fill="#e7c25a" />
      <path d="M12 7.5c-1.4-2.8-5-3.2-4.6-1.2.3 1.2 2.6 1.2 4.6 1.2zm0 0c1.4-2.8 5-3.2 4.6-1.2-.3 1.2-2.6 1.2-4.6 1.2z" fill="#e7c25a" />
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
  spider: (
    <>
      <path
        d="M9 12L4.5 9 2.5 11M9 14H4.5L2.5 17M15 12l4.5-3 2 2M15 14h4.5l2 3M10 16l-3.5 3-1 3M14 16l3.5 3 1 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="12" cy="14" r="3.8" />
      <circle cx="12" cy="9" r="2.4" />
    </>
  ),
  sparkle: <path d="M12 2l1.8 8.2L22 12l-8.2 1.8L12 22l-1.8-8.2L2 12l8.2-1.8z" />,
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

// Composición de cada temporada, colocada a mano sobre el marco que dejan
// libres las vistas: la columna entre el rail y las tarjetas (unos 30 px), el
// margen derecho (26 px) y las esquinas. Las piezas van por detrás de las
// tarjetas, así que las que se acercan a una se asoman en vez de taparla.
// `left`/`right` y `top`/`bottom` en px desde el borde; `hang` cuelga la pieza
// de un hilo desde arriba; `rot` en grados.
const C = {
  ink: "#2b2530",
  pumpkin: "#e0761f",
  pumpkinLight: "#ea8a2c",
  ghost: "#f4efe6",
};

const COMPOSITIONS = {
  halloween: {
    web: 76,
    pieces: [
      { s: "bat", left: 4, top: 0, hang: 58, size: 32, color: C.ink },
      { s: "bat", left: 6, top: 182, size: 26, color: C.ink, rot: -18 },
      { s: "ghost", left: 3, top: 300, size: 34, color: C.ghost, rot: -8 },
      { s: "bat", left: 8, top: 468, size: 22, color: C.ink, rot: 14 },
      { s: "pumpkin", left: 1, bottom: -4, size: 38, color: C.pumpkin, rot: -4 },
      { s: "pumpkin", left: 21, bottom: -6, size: 24, color: C.pumpkinLight, rot: 8 },
      { s: "spider", right: 4, top: 0, hang: 132, size: 18, color: C.ink },
      { s: "bat", right: 1, top: 380, size: 24, color: C.ink, rot: 12 },
      { s: "pumpkin", right: -3, bottom: -4, size: 28, color: C.pumpkin, rot: 6 },
    ],
  },
  spooky: {
    web: 54,
    pieces: [
      { s: "bat", left: 5, top: 0, hang: 44, size: 26, color: C.ink },
      { s: "leaf", left: 7, top: 210, size: 20, color: "#c4622d", rot: 30 },
      { s: "bat", left: 8, top: 380, size: 22, color: C.ink, rot: -14 },
      { s: "leaf", left: 6, top: 530, size: 18, color: "#d8962b", rot: -40 },
      { s: "pumpkin", left: 3, bottom: -4, size: 32, color: C.pumpkin, rot: -4 },
      { s: "bat", right: 1, top: 270, size: 24, color: C.ink, rot: 10 },
      { s: "leaf", right: 5, bottom: 40, size: 16, color: "#9a3f22", rot: 20 },
    ],
  },
  otono: {
    pieces: [
      { s: "leaf", left: 6, top: 40, size: 22, color: "#c4622d", rot: -20 },
      { s: "oak", left: 9, top: 170, size: 18, color: "#d8962b", rot: 25 },
      { s: "leaf", left: 4, top: 330, size: 24, color: "#9a3f22", rot: 40 },
      { s: "leaf", left: 11, top: 480, size: 16, color: "#e0a948", rot: -30 },
      { s: "acorn", left: 4, bottom: 0, size: 28, color: "#a8743f", rot: -8 },
      { s: "leaf", left: 22, bottom: -4, size: 18, color: "#c4622d", rot: 60 },
      { s: "leaf", right: 4, top: 140, size: 18, color: "#d8962b", rot: 15 },
      { s: "oak", right: 3, top: 520, size: 20, color: "#c4622d", rot: -25 },
      { s: "acorn", right: 1, bottom: -2, size: 22, color: "#a8743f", rot: 10 },
    ],
  },
  navidad: {
    garland: "bulbs",
    pieces: [
      { s: "star", left: 6, top: 0, hang: 34, size: 24, color: "#c8a24a" },
      { s: "bauble", left: 12, top: 0, hang: 96, size: 18, color: "#c22f3c" },
      { s: "snow", left: 7, top: 260, size: 18, color: "#9fc3d9" },
      { s: "snow", left: 13, top: 420, size: 12, color: "#b9cfdd" },
      { s: "star", left: 11, bottom: 37, size: 12, color: "#c8a24a" },
      { s: "tree", left: 1, bottom: -2, size: 40, color: "#2f7d57" },
      { s: "bauble", right: 3, top: 0, hang: 70, size: 20, color: "#2f7d57" },
      { s: "snow", right: 5, top: 330, size: 16, color: "#9fc3d9" },
      { s: "bauble", right: 1, bottom: -3, size: 22, color: "#c22f3c", rot: 10 },
    ],
  },
  invierno: {
    pieces: [
      { s: "snow", left: 6, top: 30, size: 22, color: "#8fb6d1" },
      { s: "snow", left: 13, top: 150, size: 12, color: "#b9cfdd" },
      { s: "snow", left: 4, top: 260, size: 18, color: "#7da2bf" },
      { s: "snow", left: 12, top: 400, size: 14, color: "#8fb6d1" },
      { s: "snowman", left: 1, bottom: -2, size: 40, color: "#7da2bf" },
      { s: "snow", right: 4, top: 90, size: 16, color: "#b9cfdd" },
      { s: "snow", right: 7, top: 300, size: 12, color: "#8fb6d1" },
      { s: "snow", right: 3, top: 520, size: 18, color: "#7da2bf" },
    ],
  },
  amor: {
    pieces: [
      { s: "heart", left: 8, top: 0, hang: 40, size: 18, color: "#b81d52" },
      { s: "heart", left: 13, bottom: 170, size: 10, color: "#ee7aa0" },
      { s: "heart", left: 6, bottom: 120, size: 14, color: "#b81d52", rot: -12 },
      { s: "heart", left: 10, bottom: 62, size: 20, color: "#ee7aa0", rot: 10 },
      { s: "heart", left: 4, bottom: 2, size: 30, color: "#d92363", rot: -8 },
      { s: "heart", right: 3, top: 200, size: 18, color: "#d92363", rot: 12 },
      { s: "heart", right: 7, top: 240, size: 10, color: "#ee7aa0", rot: -10 },
    ],
  },
  primavera: {
    pieces: [
      { s: "flower", left: 7, top: 120, size: 16, color: "#9b84dd", rot: 15 },
      { s: "leaf", left: 8, top: 330, size: 16, color: "#6aa56c", rot: -20 },
      { s: "leaf", left: 7, bottom: 30, size: 16, color: "#6aa56c", rot: -20 },
      { s: "flower", left: 1, bottom: -4, size: 30, color: "#e889b0" },
      { s: "flower", left: 19, bottom: -8, size: 22, color: "#9b84dd", rot: 12 },
      { s: "leaf", right: 4, top: 300, size: 16, color: "#6aa56c", rot: 30 },
      { s: "flower", right: 1, bottom: -3, size: 24, color: "#e889b0", rot: -10 },
    ],
  },
  verano: {
    pieces: [
      { s: "sun", left: -8, top: -10, size: 52, color: "#f0a52a" },
      { s: "lemon", left: 4, bottom: 0, size: 30, color: "#f2c230", rot: -12 },
      { s: "lemon", left: 20, bottom: -6, size: 20, color: "#e8cf3a", rot: 20 },
      { s: "lemon", right: 2, top: 300, size: 20, color: "#f2c230", rot: 15 },
      { s: "sun", right: -4, bottom: -4, size: 28, color: "#f0a52a" },
    ],
  },
  feria: {
    garland: "farolillos",
    pieces: [
      { s: "farolillo", left: 4, top: 0, hang: 40, size: 28, color: "#d7263d" },
      { s: "farolillo", left: 14, top: 0, hang: 120, size: 18, color: "#e7b53c" },
      { s: "farolillo", left: 6, top: 0, hang: 210, size: 22, color: "#2f7d57" },
      { s: "farolillo", right: 3, top: 0, hang: 60, size: 20, color: "#3f7cc4" },
      { s: "farolillo", right: 5, top: 0, hang: 170, size: 16, color: "#d7263d" },
    ],
  },
  lumbres: {
    pieces: [
      { s: "sparkle", left: 14, bottom: 140, size: 6, color: "#d7392b" },
      { s: "sparkle", left: 6, bottom: 100, size: 8, color: "#e0611f" },
      { s: "sparkle", left: 11, bottom: 62, size: 10, color: "#ef8f1f" },
      { s: "flame", left: -2, bottom: -4, size: 20, color: "#ef8f1f", rot: -8 },
      { s: "flame", left: 15, bottom: -4, size: 22, color: "#d7392b", rot: 8 },
      { s: "flame", left: 3, bottom: -2, size: 34, color: "#e0611f" },
      { s: "sparkle", right: 8, bottom: 50, size: 8, color: "#ef8f1f" },
      { s: "flame", right: -1, bottom: -3, size: 24, color: "#e0611f" },
    ],
  },
  semanasanta: {
    pieces: [
      { s: "candle", left: 1, bottom: -2, size: 34, color: "#e7a93c" },
      { s: "candle", left: 15, bottom: -4, size: 26, color: "#d98c2b" },
      { s: "candle", right: 0, bottom: -3, size: 28, color: "#e7a93c" },
    ],
  },
  cumple: {
    garland: "banderines",
    pieces: [
      { s: "balloon", left: 3, top: 120, size: 32, color: "#d92363", rot: -6 },
      { s: "balloon", left: 11, top: 210, size: 24, color: "#3f7cc4", rot: 8 },
      { s: "confetti", left: 7, top: 380, size: 18, color: "#e7b53c", rot: 20 },
      { s: "confetti", left: 10, top: 520, size: 16, color: "#2a9b80", rot: -30 },
      { s: "cake", left: 1, bottom: -2, size: 34, color: "#ee7aa0" },
      { s: "balloon", right: 1, top: 260, size: 22, color: "#e7b53c", rot: 6 },
      { s: "confetti", right: 4, top: 470, size: 14, color: "#725fc1" },
    ],
  },
};

// Una pieza: el dibujo y, si cuelga, su hilo desde el borde de arriba.
function Piece({ piece }) {
  const { s, size, color, rot = 0, hang = 0 } = piece;
  const style = { color };
  ["left", "right", "top", "bottom"].forEach((side) => {
    if (piece[side] !== undefined) style[side] = `${piece[side]}px`;
  });
  return (
    <svg className="season-decor__piece" width={size} height={hang + size} style={style}>
      {hang ? <path d={`M${size / 2} 0V${hang + size * 0.3}`} stroke="currentColor" strokeWidth="1" opacity="0.55" /> : null}
      <svg y={hang} width={size} height={size} viewBox="0 0 24 24" overflow="visible">
        <g fill="currentColor" transform={rot ? `rotate(${rot} 12 12)` : undefined}>
          {SHAPES[s]}
        </g>
      </svg>
    </svg>
  );
}

// Guirnaldas a lo ancho del margen de arriba. El hilo se estira con la
// pantalla; las piezas no, para que no salgan deformadas.
const GARLAND_HEIGHT = 30;
const GARLAND_COUNT = 30;

function wireY(t) {
  return (1 - t) * (1 - t) * 4 + 2 * (1 - t) * t * 20 + t * t * 4;
}

const GARLAND_ITEMS = {
  bulbs: {
    colors: ["#c22f3c", "#e7b53c", "#2f7d57", "#3f7cc4"],
    draw: (color) => (
      <>
        <rect x="-1.6" y="0" width="3.2" height="3" fill="#4a4136" />
        <ellipse cx="0" cy="7" rx="3.4" ry="4.6" fill={color} />
      </>
    ),
  },
  farolillos: {
    colors: ["#d7263d", "#2f7d57", "#e7b53c", "#f0f0e8", "#3f7cc4"],
    draw: (color) => (
      <>
        <rect x="-2.4" y="0" width="4.8" height="1.6" fill="#4a4136" />
        <ellipse cx="0" cy="8" rx="5.6" ry="6.6" fill={color} />
        <path d="M0 1.6v13M-3.4 3.4c1.3 3 1.3 6.2 0 9.2M3.4 3.4c-1.3 3-1.3 6.2 0 9.2" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
      </>
    ),
  },
  banderines: {
    colors: ["#d92363", "#3f7cc4", "#e7b53c", "#2a9b80", "#725fc1"],
    draw: (color) => <path d="M-7 0h14L0 15z" fill={color} />,
  },
};

function Garland({ kind }) {
  const item = GARLAND_ITEMS[kind];
  const items = [];
  for (let index = 0; index < GARLAND_COUNT; index += 1) {
    const along = (index + 0.5) / GARLAND_COUNT;
    const segment = along * 4;
    const y = wireY(segment - Math.floor(segment));
    items.push(
      <svg key={index} x={`${along * 100}%`} y={y} overflow="visible">
        {item.draw(item.colors[index % item.colors.length])}
      </svg>
    );
  }
  let wire = "M0 4";
  for (let segment = 0; segment < 4; segment += 1) {
    const start = segment * 250;
    wire += ` Q${start + 125} 20 ${start + 250} 4`;
  }
  return (
    <svg className="season-decor__garland" width="100%" height={GARLAND_HEIGHT} aria-hidden="true">
      <svg width="100%" height={GARLAND_HEIGHT} viewBox={`0 0 1000 ${GARLAND_HEIGHT}`} preserveAspectRatio="none">
        <path d={wire} fill="none" stroke="#4a4136" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      {items}
    </svg>
  );
}

// Telaraña para la esquina de arriba a la derecha.
function Web({ size }) {
  return (
    <svg className="season-decor__web" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="0.8">
        <path d="M100 0L0 0M100 0L10 45M100 0L40 80M100 0L75 100M100 0L100 100" />
        <path d="M78 0Q82 10 92 14Q96 18 100 22" />
        <path d="M55 0Q62 20 80 28Q92 38 100 44" />
        <path d="M30 0Q42 30 66 46Q84 60 100 68" />
        <path d="M8 0Q22 40 52 62Q74 82 100 92" />
      </g>
    </svg>
  );
}

export const SeasonDecor = memo(function SeasonDecor({ seasonId }) {
  const composition = COMPOSITIONS[seasonId];
  if (!composition) return null;

  return (
    <div className={`season-decor season-decor--${seasonId}`} aria-hidden="true">
      {composition.garland ? <Garland kind={composition.garland} /> : null}
      {composition.web ? <Web size={composition.web} /> : null}
      {composition.pieces.map((piece, index) => (
        <Piece key={index} piece={piece} />
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

// Lo que se ve por la ventana de Yoshi en cada temporada, en un lienzo de
// 156 × 188 (el cristal). Yoshi tapa el centro de abajo: las piezas van por el
// cielo y por los lados de la colina. `fiesta` es la escena completa del día
// señalado; `base`, el detalle discreto del resto de la temporada.
const WINDOW_SCENES = {
  spooky: {
    base: [["bat", 16, 20, 20, C.ink, -10], ["bat", 50, 42, 13, C.ink, 8], ["pumpkin", 118, 128, 20, C.pumpkin, 4]],
  },
  halloween: {
    base: [
      ["ghost", 12, 26, 28, C.ghost, -8],
      ["bat", 50, 12, 24, C.ink, -10],
      ["bat", 94, 50, 16, C.ink, 12],
      ["bat", 30, 70, 12, C.ink, 0],
      ["jack", 4, 122, 30, C.pumpkin, -4],
      ["pumpkin", 126, 132, 22, C.pumpkinLight, 6],
    ],
  },
  otono: {
    base: [["leaf", 16, 22, 15, "#c4622d", -20], ["leaf", 46, 60, 12, "#d8962b", 30], ["oak", 112, 74, 13, "#9a3f22", -30]],
  },
  navidad: {
    base: [["tree", 116, 100, 40, "#2f7d57", 0], ["star", 130, 94, 12, "#c8a24a", 0]],
    fiesta: [
      ["tree", 116, 96, 44, "#2f7d57", 0],
      ["star", 131, 89, 14, "#e7c25a", 0],
      ["tree", 2, 112, 32, "#3b8a63", 0],
      ["star", 12, 107, 11, "#e7c25a", 0],
    ],
    string: { kind: "bulbs", y: 10, sag: 14 },
  },
  invierno: {
    base: [["snowman", 112, 108, 38, "#7da2bf", 0]],
  },
  primavera: {
    base: [
      ["flower", 12, 136, 15, "#e889b0", 0],
      ["flower", 30, 146, 10, "#9b84dd", 10],
      ["flower", 124, 138, 15, "#e889b0", -8],
      ["flower", 110, 150, 10, "#f3f0e8", 0],
    ],
  },
  amor: {
    base: [["heart", 16, 26, 18, "#d92363", -10], ["heart", 44, 54, 12, "#ee7aa0", 10], ["heart", 120, 66, 11, "#b81d52", 0]],
  },
  feria: {
    base: [],
    string: { kind: "farolillos", y: 8, sag: 16 },
    string2: { kind: "farolillos", y: 46, sag: 10 },
  },
  lumbres: {
    base: [
      ["flame", 6, 108, 32, "#e0611f", 0],
      ["flame", 26, 122, 20, "#f6a23a", 8],
      ["sparkle", 20, 84, 7, "#ffd36b", 0],
      ["sparkle", 34, 70, 5, "#ef8f1f", 0],
      ["sparkle", 10, 62, 5, "#ffd36b", 0],
    ],
  },
  cumple: {
    base: [["balloon", 6, 40, 30, "#d92363", -8], ["balloon", 28, 60, 22, "#3f7cc4", 6], ["balloon", 118, 62, 24, "#e7b53c", 8]],
    string: { kind: "banderines", y: 8, sag: 14 },
  },
};

// Lo que se pone en el alféizar, a los lados de Yoshi: [forma, lado, tamaño, color].
const WINDOW_PROPS = {
  spooky: [["pumpkin", "left", 22, C.pumpkin]],
  halloween: [["jack", "left", 30, C.pumpkin], ["pumpkin", "right", 22, C.pumpkinLight]],
  otono: [["acorn", "right", 18, "#a8743f"]],
  navidad: [["gift", "right", 24, "#c22f3c"]],
  cumple: [["cake", "right", 30, "#ee7aa0"]],
  semanasanta: [["candle", "left", 26, "#e7a93c"], ["candle", "right", 20, "#d98c2b"]],
};

const STRING_COLORS = {
  bulbs: ["#ff5b5b", "#ffd34d", "#5fd38a", "#6fb2ff"],
  farolillos: ["#d7263d", "#2f7d57", "#e7b53c", "#f0f0e8", "#3f7cc4"],
  banderines: ["#d92363", "#3f7cc4", "#e7b53c", "#2a9b80", "#725fc1"],
};

// Una guirnalda de lado a lado del cristal (comba de una sola curva).
function WindowString({ kind, y, sag }) {
  const colors = STRING_COLORS[kind];
  const count = kind === "bulbs" ? 9 : 7;
  const items = [];
  for (let index = 0; index < count; index += 1) {
    const t = (index + 0.5) / count;
    const x = t * 156;
    const at = y + 4 * t * (1 - t) * sag;
    const color = colors[index % colors.length];
    items.push(
      <g key={index} transform={`translate(${x} ${at})`}>
        {kind === "bulbs" ? <ellipse cx="0" cy="4" rx="2.6" ry="3.6" fill={color} /> : null}
        {kind === "farolillos" ? (
          <>
            <ellipse cx="0" cy="7" rx="5.4" ry="6.4" fill={color} />
            <path d="M0 1v12M-3.2 2.6c1.2 2.8 1.2 6 0 8.8M3.2 2.6c-1.2 2.8-1.2 6 0 8.8" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
          </>
        ) : null}
        {kind === "banderines" ? <path d="M-6 0h12L0 13z" fill={color} /> : null}
      </g>
    );
  }
  return (
    <g>
      <path d={`M-4 ${y}Q78 ${y + sag * 2} 160 ${y}`} fill="none" stroke="#4a4136" strokeWidth="1" />
      {items}
    </g>
  );
}

function placed(items) {
  return items.map(([shape, x, y, size, color, rotate], index) => (
    <g key={index} transform={rotate ? `rotate(${rotate} ${x + size / 2} ${y + size / 2})` : undefined} style={{ color }}>
      <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" overflow="visible">
        <g fill="currentColor">{SHAPES[shape]}</g>
      </svg>
    </g>
  ));
}

export function WindowScene({ seasonId, fiesta }) {
  const scene = WINDOW_SCENES[seasonId];
  if (!scene) return null;
  const items = fiesta && scene.fiesta ? scene.fiesta : scene.base;
  return (
    <svg className="yoshi-window__scene" viewBox="0 0 156 188" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {placed(items)}
      {scene.string ? <WindowString {...scene.string} /> : null}
      {scene.string2 ? <WindowString {...scene.string2} /> : null}
    </svg>
  );
}

export function WindowProps({ seasonId }) {
  const props = WINDOW_PROPS[seasonId];
  if (!props) return null;
  return props.map(([shape, side, size, color]) => (
    <svg
      key={side}
      className={`yoshi-window__prop yoshi-window__prop--${side}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ color }}
      aria-hidden="true"
    >
      <g fill="currentColor">{SHAPES[shape]}</g>
    </svg>
  ));
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
