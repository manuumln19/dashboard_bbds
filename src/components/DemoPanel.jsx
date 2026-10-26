import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bug,
  Check,
  Clock3,
  CloudOff,
  Copy,
  Database,
  FlaskConical,
  Gauge,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { getCompatReport } from "../lib/compat";
import { formatClock } from "../lib/date";
import {
  formatFreshnessAge,
  formatFreshnessTime,
} from "../lib/freshness";
import { deviceTimeZone, timeZoneMismatch } from "../lib/timezone";
import { DEMO_MODE, LOCATION } from "../config";

const TIME_PRESETS = [
  { label: "Ahora", value: null },
  { label: "07:30", value: { hour: 7, minute: 30 } },
  { label: "12:00", value: { hour: 12, minute: 0 } },
  { label: "18:00", value: { hour: 18, minute: 0 } },
  { label: "22:45", value: { hour: 22, minute: 45 } },
  { label: "03:00", value: { hour: 3, minute: 0 } },
];

const IDLE_PRESETS = [
  { label: "Normal", value: null },
  { label: "5 s", value: 5000 },
  { label: "30 s", value: 30000 },
  { label: "2 min", value: 120000 },
];

const SOURCE_LABELS = {
  weather: "Tiempo",
  lists: "Listas",
  cleaning: "Limpieza",
  calendar: "Agenda",
  electricity: "Energía",
};

function isSamePreset(date, preset) {
  if (!preset) return false;
  return date.getHours() === preset.hour && date.getMinutes() === preset.minute;
}

function Toggle({ pressed, onClick, children, tone = "" }) {
  return (
    <button
      type="button"
      className={`demo-toggle${pressed ? " is-on" : ""}${
        tone ? ` tone-${tone}` : ""
      }`}
      onClick={onClick}
      aria-pressed={pressed}
    >
      {children}
    </button>
  );
}

export function DemoPanel({
  open,
  onClose,
  timeOffset,
  onTimeOffset,
  idleMs,
  defaultIdleMs,
  onIdleMs,
  demoOffline,
  onDemoOffline,
  forceStale,
  onForceStale,
  onOpenDiagnostics,
}) {
  const [clearing, setClearing] = useState(false);
  const simulated = new Date(Date.now() + timeOffset);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function applyTime(preset) {
    if (!preset) {
      onTimeOffset(0);
      return;
    }
    const now = new Date();
    const target = new Date(now);
    target.setHours(preset.hour, preset.minute, 0, 0);
    onTimeOffset(target.getTime() - Date.now());
  }

  async function clearCaches() {
    setClearing(true);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith("bbds-"))
            .map((key) => caches.delete(key))
        );
      }
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) await registration.unregister();
      }
    } catch {
      // Se recarga igualmente: la próxima visita vuelve a instalar la copia.
    }
    window.location.reload();
  }

  return (
    <div
      className="ink-overlay demo-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="demo-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-title"
      >
        <header className="demo-panel__head">
          <span className="demo-panel__icon" aria-hidden="true">
            <FlaskConical size={22} strokeWidth={1.7} />
          </span>
          <div>
            <span className="eyebrow">Solo este navegador</span>
            <h2 id="demo-title">Panel de pruebas</h2>
            <p>Cambia la hora, el idle y la red sin esperar.</p>
          </div>
          <button
            type="button"
            className="icon-button demo-close"
            onClick={onClose}
            aria-label="Cerrar el panel de pruebas"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <div className="demo-panel__body">
          <section className="demo-block">
            <div className="demo-block__head">
              <span>
                <Clock3 size={15} strokeWidth={1.9} aria-hidden="true" />
                Hora simulada
              </span>
              <strong>{formatClock(simulated)}</strong>
            </div>
            <div className="demo-time-readout">
              <span>{timeOffset ? "Reloj adelantado" : "Hora real"}</span>
              <button
                type="button"
                className="demo-link"
                onClick={() => onTimeOffset(0)}
                disabled={!timeOffset}
              >
                Volver a ahora
              </button>
            </div>
            <div className="demo-presets">
              {TIME_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`demo-preset${
                    preset.value
                      ? isSamePreset(simulated, preset.value)
                        ? " is-active"
                        : ""
                      : !timeOffset
                        ? " is-active"
                        : ""
                  }`}
                  onClick={() => applyTime(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>

          <section className="demo-block">
            <div className="demo-block__head">
              <span>
                <Gauge size={15} strokeWidth={1.9} aria-hidden="true" />
                Inactividad
              </span>
              <strong>
                {idleMs === 0
                  ? "Sin salvapantallas"
                  : idleMs >= 60000
                    ? `${Math.round(idleMs / 60000)} min`
                    : `${Math.round(idleMs / 1000)} s`}
              </strong>
            </div>
            <div className="demo-presets">
              {IDLE_PRESETS.map((preset) => {
                const value = preset.value == null ? defaultIdleMs : preset.value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={`demo-preset${
                      idleMs === value ? " is-active" : ""
                    }`}
                    onClick={() => onIdleMs(value)}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="demo-block">
            <div className="demo-block__head">
              <span>
                <WifiOff size={15} strokeWidth={1.9} aria-hidden="true" />
                Red y datos
              </span>
            </div>
            <div className="demo-switches">
              <Toggle
                pressed={demoOffline}
                onClick={() => onDemoOffline(!demoOffline)}
                tone="pink"
              >
                <CloudOff size={15} strokeWidth={1.9} aria-hidden="true" />
                Simular sin conexión
              </Toggle>
              <Toggle
                pressed={forceStale}
                onClick={() => onForceStale(!forceStale)}
                tone="amber"
              >
                <Database size={15} strokeWidth={1.9} aria-hidden="true" />
                Datos de hace 2 h
              </Toggle>
            </div>
            <p className="demo-hint">
              Al simular sin conexión se mantienen los últimos datos y se
              muestra el aviso de copia guardada.
            </p>
          </section>

          <section className="demo-block demo-block--actions">
            <button
              type="button"
              className="demo-action"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={15} strokeWidth={1.9} aria-hidden="true" />
              Recargar ahora
            </button>
            <button
              type="button"
              className="demo-action"
              onClick={clearCaches}
              disabled={clearing}
            >
              <Trash2 size={15} strokeWidth={1.9} aria-hidden="true" />
              {clearing ? "Borrando…" : "Borrar caché y recargar"}
            </button>
            <button
              type="button"
              className="demo-action demo-action--accent"
              onClick={onOpenDiagnostics}
            >
              <Bug size={15} strokeWidth={1.9} aria-hidden="true" />
              Diagnóstico
            </button>
          </section>
        </div>

        <footer className="demo-panel__foot">
          Mantén pulsado el reloj o pulsa <kbd>D</kbd> para abrir esto.
        </footer>
      </section>
    </div>
  );
}

export function Diagnostics({ open, onClose, data, onOpenDemo }) {
  const [env, setEnv] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    (async () => {
      let cacheNames = [];
      let storage = null;
      let registration = null;
      try {
        cacheNames = "caches" in window ? await caches.keys() : [];
      } catch {
        cacheNames = [];
      }
      try {
        storage =
          navigator.storage && navigator.storage.estimate
            ? await navigator.storage.estimate()
            : null;
      } catch {
        storage = null;
      }
      try {
        registration =
          "serviceWorker" in navigator
            ? await navigator.serviceWorker.getRegistration()
            : null;
      } catch {
        registration = null;
      }
      if (!alive) return;
      setEnv({
        cacheNames,
        storage,
        controller:
          "serviceWorker" in navigator && navigator.serviceWorker.controller
            ? navigator.serviceWorker.controller.scriptURL
            : null,
        scope: registration ? registration.scope : null,
        swActive: Boolean(registration && registration.active),
      });
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  const sources = useMemo(
    () => Object.entries((data && data.freshness && data.freshness.sources) || {}),
    [data]
  );
  const compat = useMemo(() => (open ? getCompatReport() : null), [open]);

  if (!open) return null;

  const now = data && data.now ? data.now : new Date();
  const rows = [
    ["Vista", data ? data.view : "—"],
    ["Conexión", data && data.online ? "En línea" : "Sin conexión"],
    ["Sin conexión simulado", data && data.demoOffline ? "Sí" : "No"],
    ["Hora mostrada", formatClock(now)],
    ["Hora real", formatClock(new Date())],
    [
      "Zona horaria",
      `${deviceTimeZone() || "—"}${timeZoneMismatch() ? ` (se esperaba ${LOCATION.timezone})` : ""}`,
    ],
    [
      "Modo ligero",
      document.documentElement.classList.contains("is-lite") ? "Activo" : "No",
    ],
    ["Compilación", document.lastModified || "—"],
    [
      "Service worker",
      env
        ? env.swActive
          ? "Activo"
          : "No registrado"
        : "Comprobando…",
    ],
    ["Controlador", env && env.controller ? env.controller : "—"],
    ["Cachés", env ? env.cacheNames.join(", ") || "Ninguna" : "…"],
    [
      "Almacenamiento",
      env && env.storage
        ? `${Math.round(env.storage.usage / 1024)} KB de ${Math.round(
            env.storage.quota / 1024 / 1024
          )} MB`
        : "—",
    ],
    ["Ventana", `${window.innerWidth} × ${window.innerHeight}`],
    ["Pantalla", `${window.devicePixelRatio || 1}×`],
    ["Chromium", compat && compat.version ? String(compat.version) : "—"],
    [
      "Compatibilidad",
      compat
        ? compat.failures.length
          ? `${compat.failures.length} fallos críticos`
          : compat.warnings.length
            ? `${compat.warnings.length} avisos`
            : "Correcta"
        : "…",
    ],
    ["Navegador", navigator.userAgent],
  ];

  async function copy() {
    const text = [
      "BBDS · diagnóstico",
      ...rows.map(([key, value]) => `${key}: ${value}`),
      "",
      "Fuentes:",
      ...sources.map(
        ([key, source]) =>
          `${SOURCE_LABELS[key] || key}: ${
            source.ok ? "ok" : "error"
          } · ${source.at || "sin hora"}${
            source.detail ? ` · ${source.detail}` : ""
          }`
      ),
      "",
      "Compatibilidad del WebView:",
      ...(compat
        ? compat.items.map(
            (item) => `${item.ok ? "ok" : "aviso"} · ${item.label}`
          )
        : []),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="ink-overlay demo-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="demo-panel diag-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diag-title"
      >
        <header className="demo-panel__head">
          <span className="demo-panel__icon" aria-hidden="true">
            <Bug size={22} strokeWidth={1.7} />
          </span>
          <div>
            <span className="eyebrow">BBDS · soporte</span>
            <h2 id="diag-title">Diagnóstico</h2>
            <p>Lo que ve la pantalla y lo que tiene guardado.</p>
          </div>
          <button
            type="button"
            className="icon-button demo-close"
            onClick={onClose}
            aria-label="Cerrar el diagnóstico"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <div className="demo-panel__body">
          <dl className="diag-list">
            {rows.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd title={value}>{value}</dd>
              </div>
            ))}
          </dl>

          <section className="demo-block diag-sources">
            <div className="demo-block__head">
              <span>
                <HardDrive size={15} strokeWidth={1.9} aria-hidden="true" />
                Fuentes de datos
              </span>
            </div>
            {sources.length ? (
              <ul>
                {sources.map(([key, source]) => (
                  <li key={key}>
                    <strong>{SOURCE_LABELS[key] || key}</strong>
                    <span className={source.ok === false ? "is-bad" : ""}>
                      {source.ok === false ? "error" : "ok"} ·{" "}
                      {source.at ? formatFreshnessTime(source.at) : "sin hora"}
                    </span>
                    <small>
                      {source.detail || formatFreshnessAge(source.at)}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="demo-hint">Todavía no hay fuentes registradas.</p>
            )}
          </section>

          {compat ? (
            <section className="demo-block diag-compat">
              <div className="demo-block__head">
                <span>
                  <ShieldCheck size={15} strokeWidth={1.9} aria-hidden="true" />
                  Compatibilidad del WebView
                </span>
                <strong
                  className={
                    compat.failures.length
                      ? "is-bad"
                      : compat.warnings.length
                        ? "is-warn"
                        : ""
                  }
                >
                  {compat.failures.length
                    ? `${compat.failures.length} fallos`
                    : compat.warnings.length
                      ? `${compat.warnings.length} avisos`
                      : "Correcta"}
                </strong>
              </div>
              <ul className="compat-list">
                {compat.items.map((item) => (
                  <li
                    key={item.id}
                    className={item.ok ? "is-ok" : "is-bad"}
                    title={item.hint}
                  >
                    {item.ok ? (
                      <Check size={13} strokeWidth={2.2} aria-hidden="true" />
                    ) : (
                      <AlertTriangle
                        size={13}
                        strokeWidth={2.1}
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.ok ? "Disponible" : item.hint}</small>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="demo-hint">
                Esta prueba se hace en el navegador real de la pantalla, no por
                la versión que dice el sistema.
              </p>
            </section>
          ) : null}

          <div className="demo-panel__actions">
            <button type="button" className="demo-action" onClick={copy}>
              {copied ? (
                <Check size={15} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Copy size={15} strokeWidth={1.9} aria-hidden="true" />
              )}
              {copied ? "Copiado" : "Copiar diagnóstico"}
            </button>
            {DEMO_MODE ? (
              <button
                type="button"
                className="demo-action demo-action--accent"
                onClick={onOpenDemo}
              >
                <FlaskConical size={15} strokeWidth={1.9} aria-hidden="true" />
                Panel de pruebas
              </button>
            ) : null}
          </div>
        </div>

        <footer className="demo-panel__foot">
          <kbd>Shift</kbd> + <kbd>I</kbd> abre este panel. <kbd>Esc</kbd>{" "}
          cierra.
        </footer>
      </section>
    </div>
  );
}
