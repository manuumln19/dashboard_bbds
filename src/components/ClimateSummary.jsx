import { ArrowUpRight } from "lucide-react";
import { ROOMS } from "../config";
import {
  getHomeHumiditySummary,
  getHumidityStatus,
  getRoomReading,
} from "../lib/climate";
import { formatAge, isStale } from "../lib/date";
import { RoomIcon } from "./RoomIcon";

export function ClimateSummary({ latest, now, onOpen }) {
  const summary = getHomeHumiditySummary(latest, ROOMS);

  return (
    <article className="card climate-summary">
      <header className="card-head card-head--tight">
        <div>
          <span className="eyebrow">Clima en casa</span>
          <h2>El aire</h2>
        </div>
        <button type="button" className="text-button" onClick={onOpen}>
          Ver casa
          <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      <div className={`climate-headline climate-headline--${summary.level}`}>
        <span className="status-dot" aria-hidden="true" />
        <div>
          <strong>{summary.title}</strong>
          <span>{summary.detail}</span>
        </div>
      </div>

      <div className="room-mini-grid">
        {ROOMS.map((room) => {
          const reading = getRoomReading(latest, room.id);
          const status = getHumidityStatus(
            room,
            reading ? reading.humidity : null
          );
          const stale = !reading || isStale(reading.recordedAt, 6, now);

          return (
            <div
              className={`room-mini${stale ? " is-stale" : ""}`}
              key={room.id}
            >
              <div className="room-mini__top">
                <span
                  className="room-mini__icon"
                  style={{ "--room-color": room.color }}
                >
                  <RoomIcon icon={room.icon} size={17} />
                </span>
                <span className="room-mini__name">{room.name}</span>
                <span
                  className={`mini-dot mini-dot--${status.tone}`}
                  title={status.label}
                />
              </div>
              <div className="room-mini__values">
                <strong>{reading ? `${Math.round(reading.humidity)}%` : "—"}</strong>
                <span>{reading ? `${reading.temperature.toFixed(1)}°` : "—"}</span>
              </div>
              <span className="room-mini__meta">
                {stale && reading
                  ? formatAge(reading.recordedAt, now)
                  : status.label}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}
