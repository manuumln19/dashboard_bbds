import { memo } from "react";
import { dayPhase } from "../lib/date";
import { isFiesta } from "../lib/season";
import { WindowProps, WindowScene } from "./SeasonDecor";

// Ilustraciones del cristal (src/assets/ventana, ver README), por orden:
// la del día señalado (<temporada>-fiesta.webp), la de toda la temporada
// (<temporada>.webp) y la de diario según la hora y el tiempo
// (diario-<momento>-<cielo>.webp). Sin ninguna, se queda lo dibujado aquí.
const WINDOW_ART = import.meta.glob("../assets/ventana/*.webp", { eager: true, import: "default" });

function pickArt(name) {
  return WINDOW_ART[`../assets/ventana/${name}.webp`] || null;
}

function seasonArt(seasonId, fiesta) {
  if (!seasonId) return null;
  return (fiesta && pickArt(`${seasonId}-fiesta`)) || pickArt(seasonId);
}

// Códigos de Open-Meteo: lluvia/tormenta, nieve y nublado.
const RAIN = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW = new Set([71, 73, 75, 77, 85, 86]);
const CLOUD = new Set([2, 3, 45, 48]);

const MOOD_LABELS = {
  sleep: "Durmiendo",
  rain: "Viendo llover",
  cold: "Muerto de frío",
  hot: "Derritiéndose",
  hungry: "Con hambre",
  idle: "En casa",
};

// El cielo que se ve por la ventana: el momento del día y el tiempo de
// verdad. Solo fondos fijos (degradados y gotas o estrellas pintadas), nada
// animado: en el marco no cuesta nada.
export function windowScene(now, weather) {
  const code = weather && weather.current ? Number(weather.current.weatherCode) : 0;
  const phase = dayPhase(now);
  const sky = RAIN.has(code) ? "rain" : SNOW.has(code) ? "snow" : CLOUD.has(code) ? "cloud" : "clear";
  return `${phase} ${sky}`;
}

// La ventana de Yoshi: su rincón en Hoy, como un Tamagotchi en la pared.
export const YoshiWindow = memo(function YoshiWindow({ now, weather, mood, mascot, season }) {
  const [phase, sky] = windowScene(now, weather).split(" ");
  const seasonId = season ? season.id : null;
  const fiesta = isFiesta(season);
  const festive = seasonArt(seasonId, fiesta);
  const art = festive || pickArt(`diario-${phase}-${sky}`);
  const classes = [
    "card yoshi-window",
    `yoshi-window--${phase}`,
    `yoshi-window--${sky}`,
    seasonId ? `yoshi-window--season-${seasonId}` : "",
    fiesta ? "is-fiesta" : "",
  ];
  return (
    <section className={classes.join(" ").trim()} aria-label="La ventana de Yoshi">
      <div className="yoshi-window__sky" aria-hidden="true">
        {art ? (
          <>
            <img className="yoshi-window__art" src={art} alt="" />
            {/* Sobre el paisaje de diario, los detalles de la temporada. */}
            {festive ? null : <WindowScene seasonId={seasonId} fiesta={fiesta} />}
          </>
        ) : (
          <>
            <span className="yoshi-window__light" />
            <span className="yoshi-window__weather" />
            <span className="yoshi-window__hill" />
            <WindowScene seasonId={seasonId} fiesta={fiesta} />
          </>
        )}
      </div>
      <span className="yoshi-window__frame" aria-hidden="true" />
      <div className="yoshi-window__yoshi">{mascot}</div>
      <span className="yoshi-window__sill" aria-hidden="true" />
      <WindowProps seasonId={seasonId} />
      <p className="yoshi-window__label">
        <strong>Yoshi</strong>
        <span>{MOOD_LABELS[mood] || MOOD_LABELS.idle}</span>
      </p>
    </section>
  );
});
