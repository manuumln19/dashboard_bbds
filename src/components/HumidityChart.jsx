import { useId, useMemo } from "react";
import { dateFormat } from "../lib/intl";

const VIEW_WIDTH = 760;
const VIEW_HEIGHT = 390;
const MARGIN = { top: 16, right: 14, bottom: 28, left: 38 };
const MIN_Y = 25;
const MAX_Y = 80;
const Y_TICKS = [30, 40, 50, 60, 70, 80];

function formatAxisLabel(date, range) {
  if (range === "7d") {
    return dateFormat({ weekday: "short" })
      .format(date)
      .replace(/\.$/, "");
  }
  return dateFormat({
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function smoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const middleX = (previous.x + current.x) / 2;
    path += ` C ${middleX.toFixed(2)} ${previous.y.toFixed(
      2
    )}, ${middleX.toFixed(2)} ${current.y.toFixed(2)}, ${current.x.toFixed(
      2
    )} ${current.y.toFixed(2)}`;
  }
  return path;
}

export function HumidityChart({ series, room, range = "24h" }) {
  const rawId = useId();
  const gradientId = `humidity-fill-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const points = useMemo(
    () =>
      (series || [])
        .filter(
          (point) =>
            point &&
            Number.isFinite(point.humidity) &&
            !Number.isNaN(new Date(point.at).getTime())
        )
        .sort((a, b) => new Date(a.at) - new Date(b.at)),
    [series]
  );

  if (points.length < 2) {
    return (
      <div className="chart-empty">
        <strong>Aún no hay histórico suficiente</strong>
        <span>En cuanto el sensor envíe datos aparecerá aquí.</span>
      </div>
    );
  }

  const plotWidth = VIEW_WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = VIEW_HEIGHT - MARGIN.top - MARGIN.bottom;
  const bottom = MARGIN.top + plotHeight;
  const firstTime = new Date(points[0].at).getTime();
  const lastTime = new Date(points[points.length - 1].at).getTime();
  const span = Math.max(1, lastTime - firstTime);

  const xFor = (timestamp) =>
    MARGIN.left + ((timestamp - firstTime) / span) * plotWidth;
  const yFor = (value) =>
    MARGIN.top +
    ((MAX_Y - Math.max(MIN_Y, Math.min(MAX_Y, value))) / (MAX_Y - MIN_Y)) *
      plotHeight;

  const plotted = points.map((point) => ({
    x: xFor(new Date(point.at).getTime()),
    y: yFor(point.humidity),
    humidity: point.humidity,
    at: new Date(point.at),
  }));

  const linePath = smoothPath(plotted);
  const areaPath = `${linePath} L ${plotted[plotted.length - 1].x.toFixed(
    2
  )} ${bottom} L ${plotted[0].x.toFixed(2)} ${bottom} Z`;
  const targetTop = yFor(room.targetMax ?? 60);
  const targetBottom = yFor(room.targetMin ?? 40);
  const alertY = yFor(room.alertMax ?? 65);
  const latest = plotted[plotted.length - 1];
  const color = room.color || "#efa174";

  return (
    <svg
      className="humidity-chart"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label={`Humedad de ${room.name} en las últimas ${
        range === "7d" ? "7 días" : "24 horas"
      }`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      <rect
        x={MARGIN.left}
        y={targetTop}
        width={plotWidth}
        height={targetBottom - targetTop}
        rx="4"
        className="humidity-chart__target"
      />

      {Y_TICKS.map((tick) => {
        const y = yFor(tick);
        return (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={VIEW_WIDTH - MARGIN.right}
              y1={y}
              y2={y}
              className="humidity-chart__grid"
            />
            <text
              x={MARGIN.left - 9}
              y={y + 3.5}
              textAnchor="end"
              className="humidity-chart__axis"
            >
              {tick}
            </text>
          </g>
        );
      })}

      <line
        x1={MARGIN.left}
        x2={VIEW_WIDTH - MARGIN.right}
        y1={alertY}
        y2={alertY}
        className="humidity-chart__alert"
      />
      <text
        x={VIEW_WIDTH - MARGIN.right - 2}
        y={alertY - 5}
        textAnchor="end"
        className="humidity-chart__alert-label"
      >
        {room.alertMax ?? 65} %
      </text>

      <text
        x={MARGIN.left + 8}
        y={targetTop + 12}
        className="humidity-chart__target-label"
      >
        franja cómoda
      </text>

      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      <circle
        cx={latest.x}
        cy={latest.y}
        r="8"
        fill={color}
        opacity="0.16"
      />
      <circle
        cx={latest.x}
        cy={latest.y}
        r="3.6"
        fill={color}
        stroke="var(--surface)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />

      {[0, 1, 2, 3].map((index) => {
        const fraction = index / 3;
        const timestamp = firstTime + span * fraction;
        return (
          <text
            key={index}
            x={MARGIN.left + plotWidth * fraction}
            y={VIEW_HEIGHT - 5}
            textAnchor={index === 0 ? "start" : index === 3 ? "end" : "middle"}
            className="humidity-chart__axis humidity-chart__axis--x"
          >
            {formatAxisLabel(new Date(timestamp), range)}
          </text>
        );
      })}

      <title>
        Humedad de {room.name}: {Math.round(latest.humidity)} % al final del
        periodo
      </title>
    </svg>
  );
}
