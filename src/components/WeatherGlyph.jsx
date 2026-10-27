import { weatherIconName } from "../lib/weather";

// Iconos del tiempo dibujados a mano, en la misma línea que SeasonDecor:
// formas rellenas sencillas con algún trazo. Sin animaciones, filtros ni
// degradados, para que el Frameo los pinte barato.

const SUN = "#e6a23c";
const SUN_SOFT = "#f3c34d";
const DROP = "#4f8fd6";
const CLOUD_FILL = "var(--weather-cloud, #c9d3dc)";
const MOON_FILL = "var(--weather-moon, #f1dfa6)";
const SNOW_FILL = "var(--weather-snow, #ffffff)";

// Nube grande y mullida (ocupa ~x 3-21, y 7-19).
const CLOUD = "M7 19h10.6a3.7 3.7 0 0 0 .4-7.4 5.5 5.5 0 0 0-10.4 1.2A3.1 3.1 0 0 0 7 19Z";
// Nube pequeña para "poco nuboso".
const CLOUD_SMALL = "M10.5 20h7.4a2.7 2.7 0 0 0 .3-5.4 4 4 0 0 0-7.6.9 2.3 2.3 0 0 0-.1 4.5Z";
const MOON = "M17.8 15.2A7.3 7.3 0 0 1 9.4 5a7.6 7.6 0 1 0 8.4 10.2Z";

const HEAVY_RAIN = new Set([63, 65, 67, 81, 82]);

function Cloud({ d = CLOUD, y = 0 }) {
  return (
    <path
      d={d}
      transform={y ? `translate(0 ${y})` : undefined}
      fill={CLOUD_FILL}
      stroke="currentColor"
    />
  );
}

function SunRays({ cx, cy, r, len }) {
  const out = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const r2 = r + len;
    out.push(
      `M${(cx + c * r).toFixed(2)} ${(cy + s * r).toFixed(2)}L${(cx + c * r2).toFixed(2)} ${(cy + s * r2).toFixed(2)}`,
    );
  }
  return <path d={out.join("")} stroke={SUN} />;
}

function Sun({ cx = 12, cy = 12, r = 4.6, ray = 2.4 }) {
  return (
    <>
      <SunRays cx={cx} cy={cy} r={r + 1.6} len={ray} />
      <circle cx={cx} cy={cy} r={r} fill={SUN_SOFT} stroke={SUN} />
    </>
  );
}

function Drops({ xs, y = 17.5, len = 2.6 }) {
  return (
    <path
      d={xs.map((x) => `M${x} ${y}l-.9 ${len}`).join("")}
      stroke={DROP}
      strokeWidth="1.7"
    />
  );
}

function Flake({ x, y }) {
  return (
    <g stroke="currentColor" strokeWidth="0.9">
      <circle cx={x} cy={y} r="1.5" fill={SNOW_FILL} />
    </g>
  );
}

function glyph(name, code) {
  switch (name) {
    case "sun":
      return <Sun r={4.4} ray={2.6} />;
    case "moon":
      return (
        <>
          <path d={MOON} fill={MOON_FILL} stroke="currentColor" />
          <path d="M19 4.5v2.4M17.8 5.7h2.4" stroke={SUN} />
        </>
      );
    case "cloud-sun":
      return code === 1 ? (
        <>
          <Sun cx={10.5} cy={9.5} r={4} ray={2} />
          <Cloud d={CLOUD_SMALL} />
        </>
      ) : (
        <>
          <Sun cx={8.5} cy={8} r={3.4} ray={1.8} />
          <Cloud y={1} />
        </>
      );
    case "cloud-moon":
      return code === 1 ? (
        <>
          <path d={MOON} transform="translate(-1.5 -1.5)" fill={MOON_FILL} stroke="currentColor" />
          <Cloud d={CLOUD_SMALL} />
        </>
      ) : (
        <>
          <path
            d={MOON}
            transform="translate(-2.2 -2.4) scale(0.8)"
            fill={MOON_FILL}
            stroke="currentColor"
          />
          <Cloud y={1} />
        </>
      );
    case "fog":
      return (
        <>
          <Cloud y={-4} />
          <path d="M4 18h16M6.5 21h11" stroke="currentColor" opacity="0.7" />
        </>
      );
    case "drizzle":
      return (
        <>
          <Cloud y={-4} />
          <Drops xs={[9, 13, 17]} y={17.5} len={1.6} />
        </>
      );
    case "rain":
      return HEAVY_RAIN.has(code) ? (
        <>
          <Cloud y={-5} />
          <Drops xs={[7.5, 11, 14.5, 18]} y={16} len={4} />
        </>
      ) : (
        <>
          <Cloud y={-4} />
          <Drops xs={[9, 13, 17]} y={17.2} len={3} />
        </>
      );
    case "snow":
      return (
        <>
          <Cloud y={-4.5} />
          <Flake x={8.5} y={18.4} />
          <Flake x={13} y={21} />
          <Flake x={17.2} y={18.4} />
        </>
      );
    case "storm":
      return (
        <>
          <Cloud y={-5} />
          <path
            d="M12.8 13.5 9.8 18.4h2.9l-1.6 4.4 4.4-6h-3l1.6-3.3Z"
            fill={SUN}
            stroke={SUN}
            strokeWidth="0.8"
          />
          <Drops xs={[7.6, 18]} y={16} len={2.4} />
        </>
      );
    default:
      return <Cloud />;
  }
}

export function WeatherGlyph({
  code,
  isDay = true,
  size = 48,
  strokeWidth = 1.55,
  className = "",
}) {
  const name = weatherIconName(code, isDay);
  // Los llamadores pasan grosores pensados para la rejilla de 48; aquí la
  // rejilla es de 24, así que se reduce un poco sin dejarlo demasiado fino.
  const sw = Math.max(1, strokeWidth * 0.78);
  return (
    <svg
      className={`weather-glyph ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyph(name, code)}
    </svg>
  );
}
