import { memo, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  WifiOff,
  X,
} from "lucide-react";
import { formatFreshnessTime } from "../lib/freshness";

// Se abre desde el punto del rail, ya desplegado, y se cierra solo cuando
// los avisos desaparecen.
export const StatusBanner = memo(function StatusBanner({ open, online, health, onClose, onOpenDiagnostics }) {
  const [expanded, setExpanded] = useState(true);
  const issues = health.issues;

  useEffect(() => {
    if (open) setExpanded(true);
  }, [open]);

  useEffect(() => {
    if (open && !issues.length) onClose();
  }, [open, issues.length, onClose]);

  if (!open || !issues.length) return null;

  const offline = !online;
  const first = issues[0];
  const summary = offline
    ? health.lastGoodAt
      ? `Sin conexión · última copia de ${formatFreshnessTime(
          health.lastGoodAt
        )}`
      : "Sin conexión · sin copia guardada"
    : issues.length === 1
      ? `${first.label}: ${first.detail}`
      : `${issues.length} avisos de datos`;

  return (
    <aside
      className={`status-banner${offline ? " is-offline" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="status-banner__bar">
        <button
          type="button"
          className="status-banner__main"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={`${summary}. ${expanded ? "Ocultar" : "Ver"} detalles`}
        >
          <span className="status-banner__icon" aria-hidden="true">
            {offline ? (
              <WifiOff size={17} strokeWidth={1.9} />
            ) : (
              <AlertTriangle size={17} strokeWidth={1.9} />
            )}
          </span>
          <span className="status-banner__copy">{summary}</span>
          {issues.length > 1 ? (
            <span className="status-banner__count">{issues.length}</span>
          ) : null}
          {expanded ? (
            <ChevronUp size={16} strokeWidth={1.9} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} strokeWidth={1.9} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="status-banner__close"
          onClick={onClose}
          aria-label="Cerrar el aviso"
        >
          <X size={15} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {expanded ? (
        <div className="status-banner__detail">
          <ul>
            {issues.map((issue) => (
              <li key={issue.id}>
                <strong>{issue.label}</strong>
                <span>{issue.detail}</span>
                {issue.at ? (
                  <time dateTime={issue.at}>
                    {formatFreshnessTime(issue.at)}
                  </time>
                ) : null}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="status-banner__diag"
            onClick={onOpenDiagnostics}
          >
            Abrir diagnóstico
          </button>
        </div>
      ) : null}
    </aside>
  );
});
