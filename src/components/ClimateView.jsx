import { useState } from "react";
import {
  BatteryMedium,
  Droplets,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  Wind,
} from "lucide-react";
import { ROOMS } from "../config";
import {
  getAverageHumidity,
  getHumidityStatus,
  getHumidityTrend,
  getMoldRisk,
  getRoomReading,
  getTemperatureStatus,
  getVentilationAdvice,
} from "../lib/climate";
import { formatAge, isStale } from "../lib/date";
import { RoomIcon } from "./RoomIcon";
import { HumidityGauge } from "./HumidityGauge";
import { HumidityChart } from "./HumidityChart";
import { RoomSparkline } from "./RoomSparkline";
import { WeatherGlyph } from "./WeatherGlyph";

function offlineNote(reading, now) {
  if (!reading) return "Sin lectura todavía";
  return `Actualizado ${formatAge(reading.recordedAt, now).toLowerCase()}`;
}

export function ClimateView({
  latest,
  history24,
  history7,
  weather,
  now,
  error,
}) {
  const [range, setRange] = useState("24h");
  const [selectedRoomId, setSelectedRoomId] = useState(
    ROOMS[0] ? ROOMS[0].id : ""
  );

  const selectedRoom =
    ROOMS.find((room) => room.id === selectedRoomId) || ROOMS[0] || null;
  const latestReading = selectedRoom
    ? getRoomReading(latest, selectedRoom.id)
    : null;
  const series = selectedRoom
    ? (range === "7d" ? history7 : history24)[selectedRoom.id] || []
    : [];
  const daySeries = selectedRoom
    ? history24[selectedRoom.id] || []
    : [];
  const moldRisk = selectedRoom
    ? getMoldRisk(daySeries, selectedRoom)
    : null;
  const ventilation = getVentilationAdvice(
    latestReading,
    weather ? weather.current : null
  );
  const average = getAverageHumidity(series);
  const trend = getHumidityTrend(series);
  const seriesValues = series
    .map((point) => point.humidity)
    .filter((value) => Number.isFinite(value));
  const outside = weather ? weather.current : null;

  if (!selectedRoom) {
    return (
      <section className="view climate-view">
        <div className="empty-state">
          <Droplets size={44} strokeWidth={1.3} aria-hidden="true" />
          <strong>No hay habitaciones configuradas</strong>
          <span>Añade sensores en src/config.js.</span>
        </div>
      </section>
    );
  }

  const selectedStatus = getHumidityStatus(
    selectedRoom,
    latestReading ? latestReading.humidity : null
  );
  const selectedStale =
    !latestReading || isStale(latestReading.recordedAt, 6, now);
  const temperatureWarning = latestReading
    ? getTemperatureStatus(selectedRoom, latestReading.temperature)
    : null;
  const RiskIcon =
    moldRisk && moldRisk.level === "high" ? ShieldAlert : ShieldCheck;

  return (
    <section className="view climate-view" aria-labelledby="climate-title">
      <header className="view-heading">
        <div>
          <span className="eyebrow">Sensores</span>
          <h1 id="climate-title">Clima en casa</h1>
          <p>Temperatura y humedad reales, con el histórico de cada rincón.</p>
        </div>

        {outside ? (
          <div className="outside-chip">
            <WeatherGlyph
              code={outside.weatherCode}
              isDay={outside.isDay}
              size={26}
              strokeWidth={1.5}
            />
            <div>
              <span>Fuera · {Math.round(outside.temperature)}°</span>
              <strong>{Math.round(outside.humidity)}% de humedad</strong>
            </div>
          </div>
        ) : (
          <span className="view-heading__aside">
            <Wind size={16} strokeWidth={1.8} aria-hidden="true" />
            Sin datos exteriores
          </span>
        )}
      </header>

      {error ? (
        <div className="inline-alert" role="status">
          Los sensores no responden: {error}. Se seguirá intentando cada minuto.
        </div>
      ) : null}

      <div className="room-grid">
        {ROOMS.map((room) => {
          const reading = getRoomReading(latest, room.id);
          const status = getHumidityStatus(
            room,
            reading ? reading.humidity : null
          );
          const stale = !reading || isStale(reading.recordedAt, 6, now);
          const coldWarning = reading
            ? getTemperatureStatus(room, reading.temperature)
            : null;
          const roomHistory = history24[room.id] || [];
          const roomTrend = getHumidityTrend(roomHistory);
          const isSelected = room.id === selectedRoom.id;

          return (
            <button
              key={room.id}
              type="button"
              className={`room-card${isSelected ? " is-selected" : ""}${
                stale ? " is-stale" : ""
              }`}
              onClick={() => setSelectedRoomId(room.id)}
              aria-pressed={isSelected}
              aria-label={`Ver histórico de ${room.name}`}
            >
              <div className="room-card__head">
                <span
                  className="room-card__icon"
                  style={{ "--room-color": room.color }}
                >
                  <RoomIcon icon={room.icon} size={19} />
                </span>
                <span className="room-card__name">{room.name}</span>
                <span className={`mini-dot mini-dot--${status.tone}`} />
              </div>

              <div className="room-card__body">
                <HumidityGauge
                  value={reading ? reading.humidity : null}
                  tone={stale ? "muted" : status.tone}
                  size={88}
                />
                <div className="room-card__reading">
                  <span className="room-card__temperature">
                    {reading ? (
                      <>
                        {reading.temperature.toFixed(1)}
                        <small>°C</small>
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className={`room-card__status is-${status.tone}`}>
                    {stale
                      ? reading
                        ? offlineNote(reading, now)
                        : "Sin señal"
                      : status.label}
                  </span>
                  <span className="room-card__target">
                    Objetivo {room.targetMin}–{room.targetMax} %
                  </span>
                  {coldWarning && !stale ? (
                    <span className="room-card__warning">
                      <Thermometer size={13} strokeWidth={2} />
                      {coldWarning.label}
                    </span>
                  ) : null}
                </div>

                <div className="room-card__side" aria-hidden="true">
                  <span className="room-card__side-label">Últimas 24 h</span>
                  <RoomSparkline points={roomHistory} color={room.color} />
                  <span className="room-card__side-meta">
                    <span>
                      {roomTrend === null
                        ? "Sin tendencia"
                        : `${roomTrend > 0 ? "+" : ""}${roomTrend} pts`}
                    </span>
                    <span>
                      {reading ? formatAge(reading.recordedAt, now) : "Sin datos"}
                    </span>
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="climate-bottom">
        <article className="card chart-card">
          <header className="chart-card__head">
            <div>
              <span className="eyebrow">Histórico</span>
              <h2>
                {selectedRoom.name} · humedad
                <span className={`mini-dot mini-dot--${selectedStatus.tone}`} />
              </h2>
            </div>
            <div className="range-switch" role="group" aria-label="Periodo">
              <button
                type="button"
                className={range === "24h" ? "is-active" : ""}
                onClick={() => setRange("24h")}
                aria-pressed={range === "24h"}
              >
                24 h
              </button>
              <button
                type="button"
                className={range === "7d" ? "is-active" : ""}
                onClick={() => setRange("7d")}
                aria-pressed={range === "7d"}
              >
                7 días
              </button>
            </div>
          </header>

          <div className="chart-frame">
            <HumidityChart
              series={series}
              room={selectedRoom}
              range={range}
            />
          </div>

          <footer className="chart-stats">
            <span>
              Media <strong>{average === null ? "—" : `${Math.round(average)}%`}</strong>
            </span>
            <span>
              Mín / máx{" "}
              <strong>
                {seriesValues.length
                  ? `${Math.round(Math.min(...seriesValues))}% / ${Math.round(
                      Math.max(...seriesValues)
                    )}%`
                  : "—"}
              </strong>
            </span>
            <span>
              Tendencia{" "}
              <strong>
                {trend === null
                  ? "—"
                  : `${trend > 0 ? "+" : ""}${trend} pts`}
              </strong>
            </span>
            <span className="chart-stats__note">
              <Droplets size={14} strokeWidth={1.9} aria-hidden="true" />
              {selectedStale ? "Sensor sin señal" : "Actualizado cada minuto"}
            </span>
          </footer>
        </article>

        <aside className="card advice-card">
          <span className="eyebrow">Consejo de casa</span>
          <div className={`advice-risk advice-risk--${moldRisk ? moldRisk.level : "unknown"}`}>
            <div className="advice-risk__head">
              <span className="advice-icon" aria-hidden="true">
                <RiskIcon size={20} strokeWidth={1.8} />
              </span>
              <div>
                <strong>{moldRisk ? moldRisk.label : "Sin datos"}</strong>
                <span>Riesgo de moho · 24 h</span>
              </div>
            </div>
            <div className="risk-bar" aria-hidden="true">
              <span style={{ width: `${Math.round((moldRisk ? moldRisk.score : 0) * 100)}%` }} />
            </div>
            <p>{moldRisk ? moldRisk.detail : "Esperando histórico del sensor."}</p>
          </div>

          <div className="advice-divider" />

          <div className="advice-vent">
            <div className="advice-vent__head">
              <span className="advice-icon" aria-hidden="true">
                <Wind size={20} strokeWidth={1.8} />
              </span>
              <strong>{ventilation.title}</strong>
            </div>
            <p>{ventilation.detail}</p>
          </div>

          {temperatureWarning ? (
            <>
              <div className="advice-divider" />
              <div className="advice-vent">
                <div className="advice-vent__head">
                  <span className="advice-icon" aria-hidden="true">
                    <Thermometer size={20} strokeWidth={1.8} />
                  </span>
                  <strong>Atención con el instrumento</strong>
                </div>
                <p>{temperatureWarning.label}.</p>
              </div>
            </>
          ) : null}

          <div className="advice-sensor">
            <div>
              <span className="eyebrow">Sensor</span>
              <strong>{selectedRoom.name}</strong>
            </div>
            <div className="advice-sensor__meta">
              <span>
                {latestReading
                  ? formatAge(latestReading.recordedAt, now)
                  : "Sin datos"}
              </span>
              {latestReading && Number.isFinite(latestReading.battery) ? (
                <span>
                  <BatteryMedium size={13} strokeWidth={1.9} aria-hidden="true" />
                  {Math.round(latestReading.battery)}%
                </span>
              ) : null}
              {latestReading && Number.isFinite(latestReading.pressure) ? (
                <span>
                  <Gauge size={13} strokeWidth={1.9} aria-hidden="true" />
                  {Math.round(latestReading.pressure)} hPa
                </span>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
