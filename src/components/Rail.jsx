import { memo } from "react";
import {
  CalendarDays,
  CloudSun,
  Droplets,
  FlaskConical,
  House,
  Images,
  ListChecks,
  Moon,
  ShoppingBasket,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { CLIMATE_ENABLED } from "../config";
import { formatClock } from "../lib/date";
import { Brand } from "./Brand";
import { SeasonBadge } from "./SeasonDecor";

const TABS = [
  { id: "home", label: "Hoy", Icon: House },
  { id: "agenda", label: "Agenda", Icon: CalendarDays },
  { id: "lists", label: "Compra", Icon: ShoppingBasket },
  { id: "cleaning", label: "Tareas", Icon: ListChecks },
  { id: "weather", label: "Tiempo", Icon: CloudSun },
  { id: "energy", label: "Energía", Icon: Zap },
  ...(CLIMATE_ENABLED
    ? [{ id: "climate", label: "Casa", Icon: Droplets }]
    : []),
];

export const Rail = memo(function Rail({
  now,
  view,
  onChange,
  isNight,
  onToggleNight,
  onOpenGallery,
  status,
  issueCount = 0,
  onStatus,
  seasonId,
}) {
  const StatusIcon =
    status.tone === "bad"
      ? WifiOff
      : status.tone === "demo"
        ? FlaskConical
        : Wifi;

  return (
    <aside className="rail" aria-label="BBDS">
      <Brand onClick={() => onChange("home")} />

      <nav className="rail__nav" aria-label="Vistas del dashboard">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`rail__item${view === id ? " is-active" : ""}`}
            onClick={() => onChange(id)}
            aria-current={view === id ? "page" : undefined}
          >
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <SeasonBadge seasonId={seasonId} />

      <div className="rail__bottom">
        <time className="rail__clock" dateTime={now.toISOString()}>
          {formatClock(now)}
        </time>

        {/* Con avisos de datos, un punto ámbar; al tocarlo se abre el detalle. */}
        <button
          type="button"
          className={`rail__status rail__status--${issueCount && status.tone === "good" ? "warn" : status.tone}`}
          title={status.title || status.label}
          onClick={onStatus}
          disabled={!issueCount && status.tone !== "bad"}
          aria-label={issueCount ? `${issueCount} ${issueCount === 1 ? "aviso" : "avisos"} de datos. Ver detalle` : status.label}
        >
          {issueCount ? <i className="rail__status-dot" aria-hidden="true" /> : null}
          <StatusIcon size={12} strokeWidth={2} aria-hidden="true" />
          <span>{issueCount && status.tone === "good" ? (issueCount === 1 ? "1 aviso" : `${issueCount} avisos`) : status.label}</span>
        </button>

        <div className="rail__actions">
          <button
            type="button"
            className={`rail__night${isNight ? " is-active" : ""}`}
            onClick={onToggleNight}
            aria-pressed={isNight}
            aria-label={
              isNight
                ? "Modo noche activo. Tocar para aclarar durante 2 horas"
                : "Activar modo noche durante 2 horas"
            }
            title={isNight ? "Aclarar 2 h" : "Atenuar 2 h"}
          >
            <Moon size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="rail__gallery"
            onClick={onOpenGallery}
            aria-label="Abrir galería de fotos"
            title="Galería de fotos"
          >
            <Images size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
});
