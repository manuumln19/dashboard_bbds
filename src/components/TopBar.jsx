import {
  Droplets,
  FlaskConical,
  House,
  ListChecks,
  Moon,
  Wifi,
  WifiOff,
} from "lucide-react";
import { CLIMATE_ENABLED } from "../config";
import { formatClock } from "../lib/date";
import { Brand } from "./Brand";

const TABS = [
  { id: "home", label: "Hoy", Icon: House },
  { id: "lists", label: "Listas", Icon: ListChecks },
  ...(CLIMATE_ENABLED
    ? [{ id: "climate", label: "Casa", Icon: Droplets }]
    : []),
];

export function TopBar({
  now,
  view,
  onChange,
  isNight,
  onToggleNight,
  status,
}) {
  const StatusIcon =
    status.tone === "bad"
      ? WifiOff
      : status.tone === "demo"
        ? FlaskConical
        : Wifi;

  return (
    <header className="topbar">
      <Brand onClick={() => onChange("home")} />

      <nav className="tabs" aria-label="Vistas del dashboard">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`tab${view === id ? " is-active" : ""}`}
            onClick={() => onChange(id)}
            aria-current={view === id ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="topbar__actions">
        <span className="topbar__clock" aria-hidden="true">
          {formatClock(now)}
        </span>

        <span
          className={`status-chip status-chip--${status.tone}`}
          title={status.title || status.label}
        >
          <StatusIcon size={14} strokeWidth={2} aria-hidden="true" />
          <span>{status.label}</span>
        </span>

        <button
          type="button"
          className={`icon-button night-toggle${isNight ? " is-active" : ""}`}
          onClick={onToggleNight}
          aria-pressed={isNight}
          aria-label={
            isNight
              ? "Modo noche activo. Tocar para aclarar durante 2 horas"
              : "Activar modo noche durante 2 horas"
          }
          title={isNight ? "Aclarar 2 h" : "Atenuar 2 h"}
        >
          <Moon size={21} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
