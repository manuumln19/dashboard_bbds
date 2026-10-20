import { FlaskConical, MapPin } from "lucide-react";
import { DEMO_MODE, LOCATION } from "../config";
import {
  capitalize,
  formatAge,
  formatClock,
  formatEventTime,
  formatLongDate,
} from "../lib/date";
import { weatherLabel } from "../lib/weather";
import { RadarPanel } from "./RadarPanel";
import { WeatherGlyph } from "./WeatherGlyph";
import { WeeklyForecast } from "./WeeklyForecast";

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "—";
}

function sunTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return formatEventTime(date);
}

function daylightProgress(now, sunrise, sunset) {
  if (!sunrise || !sunset) return 0;
  const start = new Date(sunrise).getTime();
  const end = new Date(sunset).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

function sunTop(progress) {
  // La parábola del arco: y = 27 - 52·t·(1-t), dentro de una caja de 30 px.
  return ((27 - 52 * progress * (1 - progress)) / 30) * 100;
}

function isoWeek(date) {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  return Math.ceil(((day - yearStart) / 86400000 + 1) / 7);
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((today - start) / 86400000);
}

function coordinates() {
  const lat = `${Math.abs(LOCATION.latitude).toFixed(4)}° ${LOCATION.latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(LOCATION.longitude).toFixed(4)}° ${LOCATION.longitude >= 0 ? "E" : "O"}`;
  return `${lat}, ${lon}`;
}

export function WeatherView({ now, weather, error, loading }) {
  const current = weather && weather.current ? weather.current : null;
  const today = weather && weather.today ? weather.today : null;
  const days = weather && Array.isArray(weather.days) ? weather.days : [];
  const isDemo = DEMO_MODE || Boolean(weather && weather.demo);
  const progress = daylightProgress(
    now,
    today && today.sunrise,
    today && today.sunset
  );
  const weekday = capitalize(
    new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(now)
  );
  const month = new Intl.DateTimeFormat("es-ES", { month: "short" })
    .format(now)
    .replace(".", "");
  const updated = weather
    ? `Actualizado ${formatAge(weather.updatedAt, now).toLowerCase()}`
    : loading
      ? "Consultando el cielo…"
      : "Sin datos";

  return (
    <section className="view weather-view" aria-labelledby="weather-title">
      <header className="weather-head">
        <div>
          <p className="kicker">
            <i aria-hidden="true" />
            Fuera de casa · {weekday}
          </p>
          <h1 id="weather-title">El tiempo</h1>
          <p className="location">
            <MapPin size={11} strokeWidth={1.8} aria-hidden="true" />
            {LOCATION.name} · {coordinates()}
          </p>
        </div>

        <div className="weather-head__aside">
          <p className="updated">
            <i aria-hidden="true" />
            {updated}
          </p>
          <p className="weather-date">
            <strong>{now.getDate()}</strong>
            <span>
              {month}
              <br />
              {now.getFullYear()}
            </span>
          </p>
          <p className="weather-folio">
            Día {dayOfYear(now)} · Semana {isoWeek(now)}
          </p>
          {isDemo ? (
            <span className="weather-demo">
              <FlaskConical size={11} strokeWidth={1.9} aria-hidden="true" />
              Demo local
            </span>
          ) : null}
        </div>
      </header>

      {error && !DEMO_MODE ? (
        <div className="inline-alert" role="status">
          No se pudo actualizar el tiempo: {error}. Se reintentará solo.
        </div>
      ) : null}

      <div className="weather-layout">
        <article className="weather-now" aria-label="Tiempo actual">
          <span className="weather-now__glow" aria-hidden="true" />

          <div className="weather-now__top">
            <span>Ahora / exterior</span>
            <span>Observación {formatClock(now)}</span>
          </div>

          <div className="weather-now__main">
            <div className="weather-now__glyph" aria-hidden="true">
              <WeatherGlyph
                code={current ? current.weatherCode : 1}
                isDay={current ? current.isDay : true}
                size={43}
                strokeWidth={1.35}
              />
            </div>

            <div className="weather-now__temperature">
              {current ? round(current.temperature) : "—"}
              <span>°</span>
            </div>

            <div className="weather-now__copy">
              <h2>
                {current ? weatherLabel(current.weatherCode) : "Mirando al cielo"}
              </h2>
              <p>
                {current
                  ? `Sensación de ${round(current.apparentTemperature)}° · ${
                      current.windSpeed
                        ? `${round(current.windSpeed)} km/h`
                        : "sin viento"
                    }`
                  : "Esperando datos del exterior"}
              </p>
            </div>

            <div className="weather-now__extremes">
              <div>
                <span>Máx</span>
                <strong>{today ? `${round(today.max)}°` : "—"}</strong>
              </div>
              <div>
                <span>Mín</span>
                <strong>{today ? `${round(today.min)}°` : "—"}</strong>
              </div>
            </div>
          </div>

          <div
            className="daylight"
            aria-label={`Luz del día: amanece a las ${sunTime(
              today && today.sunrise
            )} y anochece a las ${sunTime(today && today.sunset)}`}
          >
            <span className="daylight-label">
              Amanece
              <strong>{sunTime(today && today.sunrise)}</strong>
            </span>
            <div className="daylight-track" aria-hidden="true">
              <svg
                className="daylight-arc"
                viewBox="0 0 600 30"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="daylight-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#edb387" />
                    <stop offset="0.4" stopColor="#e6c46f" />
                    <stop offset="0.74" stopColor="#e79a9f" />
                    <stop offset="0.9" stopColor="#cf1f5e" />
                  </linearGradient>
                </defs>
                <path
                  className="daylight-arc-glow"
                  d="M2 27 Q300 1 598 27"
                  pathLength="100"
                  stroke="url(#daylight-gradient)"
                />
                <path
                  className="daylight-arc-base"
                  d="M2 27 Q300 1 598 27"
                  pathLength="100"
                  stroke="rgba(49, 39, 33, 0.16)"
                />
                <path
                  className="daylight-arc-live"
                  d="M2 27 Q300 1 598 27"
                  pathLength="100"
                  stroke="url(#daylight-gradient)"
                  strokeDasharray={`${Math.max(0.01, progress * 100)} 100`}
                />
              </svg>
              <i
                className="daylight-sun"
                style={{ left: `${progress * 100}%`, top: `${sunTop(progress)}%` }}
              />
            </div>
            <span className="daylight-label daylight-label--end">
              Anochece
              <strong>{sunTime(today && today.sunset)}</strong>
            </span>
          </div>

          <dl className="weather-now__metrics">
            <div style={{ "--metric": "var(--mint)" }}>
              <dt>
                <i aria-hidden="true" />
                Humedad
              </dt>
              <dd>{current ? `${round(current.humidity)}%` : "—"}</dd>
            </div>
            <div style={{ "--metric": "var(--blue)" }}>
              <dt>
                <i aria-hidden="true" />
                Viento
              </dt>
              <dd>{current ? `${round(current.windSpeed)} km/h` : "—"}</dd>
            </div>
            <div style={{ "--metric": "var(--lilac)" }}>
              <dt>
                <i aria-hidden="true" />
                Lluvia
              </dt>
              <dd>
                {today
                  ? `${round(today.precipitationProbability)}%`
                  : current
                    ? `${round(current.precipitation)} mm`
                    : "—"}
              </dd>
            </div>
            <div style={{ "--metric": "var(--amber)" }}>
              <dt>
                <i aria-hidden="true" />
                UV
              </dt>
              <dd>{today ? round(today.uvIndex) : "—"}</dd>
            </div>
          </dl>
        </article>

        <WeeklyForecast days={days} now={now} />

        <RadarPanel now={now} today={today} isDemo={isDemo} />
      </div>
    </section>
  );
}
