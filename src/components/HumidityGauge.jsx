const TONE_COLORS = {
  ok: "var(--sage)",
  warn: "var(--warm)",
  danger: "var(--danger)",
  dry: "var(--blue)",
  muted: "var(--muted)",
};

export function HumidityGauge({ value, tone = "unknown", size = 92 }) {
  const radius = 41;
  const circumference = 2 * Math.PI * radius;
  const safeValue = Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div
      className={`humidity-gauge humidity-gauge--${tone}`}
      style={{
        width: size,
        height: size,
        color: TONE_COLORS[tone] || TONE_COLORS.muted,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100">
        <circle className="humidity-gauge__track" cx="50" cy="50" r={radius} />
        <circle
          className="humidity-gauge__value"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="humidity-gauge__label">
        {Number.isFinite(value) ? Math.round(value) : "—"}
        <small>%</small>
      </span>
    </div>
  );
}
