import { useId, useMemo } from "react";

const WIDTH = 188;
const HEIGHT = 54;
const MIN_Y = 30;
const MAX_Y = 75;

export function RoomSparkline({ points, color = "#efa174" }) {
  const rawId = useId();
  const gradientId = `room-spark-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const plotted = useMemo(() => {
    const valid = (points || [])
      .filter(
        (point) =>
          point &&
          Number.isFinite(point.humidity) &&
          !Number.isNaN(new Date(point.at).getTime())
      )
      .sort((a, b) => new Date(a.at) - new Date(b.at));

    if (valid.length < 2) return [];
    const first = new Date(valid[0].at).getTime();
    const last = new Date(valid[valid.length - 1].at).getTime();
    const span = Math.max(1, last - first);

    return valid.map((point) => ({
      x: ((new Date(point.at).getTime() - first) / span) * WIDTH,
      y:
        ((MAX_Y - Math.max(MIN_Y, Math.min(MAX_Y, point.humidity))) /
          (MAX_Y - MIN_Y)) *
        (HEIGHT - 4),
    }));
  }, [points]);

  if (plotted.length < 2) {
    return <div className="room-sparkline room-sparkline--empty">Sin histórico</div>;
  }

  const line = plotted
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${plotted[plotted.length - 1].x.toFixed(1)} ${HEIGHT} L ${plotted[0].x.toFixed(1)} ${HEIGHT} Z`;

  return (
    <svg
      className="room-sparkline"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
