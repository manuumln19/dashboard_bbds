const SPOTS = {
  pink: "#e0457f",
  mint: "#2fae5a",
  amber: "#e39a1c",
  lilac: "#8a6fd6",
  ink: "#3a3a3a",
};

// El huevo evoluciona con el nivel de la semana (lib/points): crema, menta,
// cielo, lila y, para «Leyenda de casa», dorado con brillo.
const SHELLS = ["#fffdf6", "#effbe7", "#e7f2ff", "#f2eaff", "#fde7a0"];
const SHELL_LINES = ["rgba(40,30,20,0.35)", "rgba(40,30,20,0.35)", "rgba(40,30,20,0.35)", "rgba(40,30,20,0.35)", "#c9932a"];

// Avatar de cada persona: un huevo con lunares de su color y su inicial.
export function EggAvatar({ person, size = 40, cracked = false, level = 0 }) {
  const spot = SPOTS[person && person.tone] || SPOTS.ink;
  const tier = Math.max(0, Math.min(SHELLS.length - 1, level || 0));
  const initial = person ? person.initials || String(person.name || "?").charAt(0) : "?";
  return (
    <svg
      className="egg-avatar"
      width={size}
      height={size * 1.18}
      viewBox="0 0 40 47"
      aria-hidden="true"
    >
      <path
        d="M20 1.5C9.5 1.5 2 18 2 29c0 10 8 16.5 18 16.5S38 39 38 29C38 18 30.5 1.5 20 1.5z"
        fill={SHELLS[tier]}
        stroke={SHELL_LINES[tier]}
        strokeWidth={tier === SHELLS.length - 1 ? 1.8 : 1.2}
      />
      {tier === SHELLS.length - 1 ? (
        <path d="M33 5 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4z" fill="#f6c343" stroke="#c9932a" strokeWidth="0.6" />
      ) : null}
      <ellipse cx="11" cy="20" rx="4.2" ry="5" fill={spot} />
      <ellipse cx="29" cy="15" rx="3.4" ry="4" fill={spot} />
      <ellipse cx="31" cy="34" rx="4" ry="4.6" fill={spot} />
      <ellipse cx="9" cy="37" rx="3" ry="3.4" fill={spot} />
      {cracked ? (
        <path
          d="M4 25l5 3 4-4 5 4 4-4 5 4 4-4 5 3"
          fill="none"
          stroke="rgba(40,30,20,0.55)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      ) : null}
      <text
        x="20"
        y="32"
        textAnchor="middle"
        fontSize="15"
        fontWeight="800"
        fontFamily="Manrope, sans-serif"
        fill="#2a2116"
      >
        {initial}
      </text>
    </svg>
  );
}
