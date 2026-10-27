import { useEffect, useRef, useState } from "react";
import { Images, Settings2, X } from "lucide-react";
import { APP_NAME, LOCATION } from "../config";
import { formatClock, formatLongDate } from "../lib/date";
import { dateFormat } from "../lib/intl";
import { photoSrc } from "../hooks/usePhotos";
import { addDays, eventStartDate, eventTimeLabel, isSameDay } from "../lib/date";
import { moonPhase } from "../lib/moon";
import { MoonGlyph } from "./MoonGlyph";
import { PhotoAlbumSheet } from "./PhotoAlbumSheet";

const SLIDE_MS = 15000;
const SCREEN_RATIO = 1280 / 800;

// Las fotos con una proporción parecida a la pantalla la llenan; las
// verticales o muy panorámicas se ven enteras sobre fondo oscuro.
function fitFor(photo) {
  if (!photo.width || !photo.height) return "cover";
  return Math.abs(Math.log(photo.width / photo.height / SCREEN_RATIO)) < 0.28
    ? "cover"
    : "contain";
}

function photoDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return dateFormat({ month: "long", year: "numeric" }).format(date);
}

// De noche, en vez de fotos: la luna, la mínima de esta noche y lo primero
// de mañana. Todo estático y oscuro para no molestar.
function NightPanel({ now, weather, events }) {
  const moon = moonPhase(now);
  const days = (weather && weather.days) || [];
  // Pasado el mediodía, la mínima que importa es la de la madrugada siguiente.
  const night = now.getHours() >= 12 ? days[1] : days[0];
  const tomorrow = now.getHours() >= 12 ? addDays(now, 1) : now;
  const first = (events || [])
    .filter((event) => isSameDay(eventStartDate(event), tomorrow) && !event.allDay)
    .sort((a, b) => eventStartDate(a) - eventStartDate(b))[0];

  return (
    <div className="night-panel">
      <MoonGlyph phase={moon.phase} size={132} />
      <dl>
        <div>
          <dt>Esta noche</dt>
          <dd>{moon.name}</dd>
        </div>
        {night ? (
          <div>
            <dt>Mínima</dt>
            <dd>{Math.round(night.min)}°</dd>
          </div>
        ) : null}
        <div>
          <dt>{now.getHours() >= 12 ? "Mañana" : "Hoy"}</dt>
          <dd>{first ? `${eventTimeLabel(first)} · ${first.summary || "Sin título"}` : "Nada en la agenda"}</dd>
        </div>
      </dl>
    </div>
  );
}

export function Screensaver({ now, onClose, isNight, photos, weather, events }) {
  const list = photos.photos || [];
  const count = list.length;
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const failed = useRef(new Set());
  const showPhotos = !isNight && count > 0;

  // Cada foto se descarga y decodifica antes de mostrarse: en el marco, pintar
  // una imagen a medio cargar se ve a trozos.
  useEffect(() => {
    if (!showPhotos) return undefined;
    const photo = list[index % count];
    if (!photo) return undefined;
    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (!cancelled) setShown(photo);
    };
    image.onerror = () => {
      if (cancelled) return;
      failed.current.add(photo.id);
      if (failed.current.size < count) setIndex((current) => (current + 1) % count);
    };
    image.src = photoSrc(photo);
    return () => {
      cancelled = true;
    };
  }, [index, count, showPhotos, list]);

  useEffect(() => {
    if (!showPhotos || count < 2 || sheetOpen) return undefined;
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % count),
      SLIDE_MS
    );
    return () => window.clearTimeout(timer);
  }, [shown, count, showPhotos, sheetOpen]);

  useEffect(() => {
    function handleKey(event) {
      if (sheetOpen) return;
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex((current) => (current + 1) % Math.max(1, count));
      if (event.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + Math.max(1, count)) % Math.max(1, count));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [count, onClose, sheetOpen]);

  const photo = showPhotos ? shown : null;
  const caption = photo ? photo.caption || (photos.album && photos.album.name) || "" : "";
  const when = photo ? photoDate(photo.takenAt) : "";

  return (
    <div
      className={`screensaver${isNight ? " screensaver--night" : ""}${photo ? "" : " screensaver--empty"}`}
      role="dialog"
      aria-modal="true"
      aria-label="Fotos"
      onClick={(event) => {
        if (!sheetOpen && !event.target.closest("button")) onClose();
      }}
    >
      {photo ? (
        <div className="screensaver__photos" aria-hidden="true">
          <img
            key={photo.id}
            src={photoSrc(photo)}
            alt=""
            className={`screensaver__photo screensaver__photo--${fitFor(photo)}`}
            draggable="false"
          />
        </div>
      ) : null}
      <div className="screensaver__wash" aria-hidden="true" />

      <header className="screensaver__top">
        <div className="screensaver__brand">
          <span className="screensaver__mark" aria-hidden="true">
            B
          </span>
          <div>
            <strong>{APP_NAME}</strong>
            <span>{LOCATION.name}</span>
          </div>
        </div>
        <div className="screensaver__clock">
          <time dateTime={now.toISOString()}>{formatClock(now)}</time>
          <span>{formatLongDate(now)}</span>
        </div>
        {isNight ? null : (
          <button
            type="button"
            className="screensaver__close"
            onClick={() => setSheetOpen(true)}
            aria-label="Elegir el álbum de fotos"
            title="Álbum de fotos"
          >
            <Settings2 size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="screensaver__close"
          onClick={onClose}
          aria-label="Cerrar"
          title="Cerrar"
        >
          <X size={19} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      {isNight ? <NightPanel now={now} weather={weather} events={events} /> : null}

      {isNight ? null : (
        <footer className="screensaver__bottom">
          {photo ? (
            <div className="screensaver__caption">
              {caption ? <strong>{caption}</strong> : null}
              {when ? <small>{when}</small> : null}
            </div>
          ) : (
            <div className="screensaver__caption">
              <span className="eyebrow">Fotos</span>
              <strong>
                {photos.error
                  ? "No se pudo abrir el álbum"
                  : photos.configured
                    ? photos.loading
                      ? "Cargando el álbum…"
                      : "El álbum está vacío"
                    : "Elige un álbum de iCloud"}
              </strong>
              <small>
                {photos.error ||
                  (photos.configured
                    ? "Las fotos nuevas aparecen solas en unos minutos."
                    : "Toca el engranaje y pega el enlace de un álbum compartido.")}
              </small>
            </div>
          )}

          <div className="screensaver__hint">
            <Images size={15} strokeWidth={1.8} aria-hidden="true" />
            {photo && count > 1
              ? `${(index % count) + 1} / ${count} · toca para volver`
              : "Toca para volver"}
          </div>
        </footer>
      )}

      {sheetOpen ? (
        <PhotoAlbumSheet photos={photos} onClose={() => setSheetOpen(false)} />
      ) : null}
    </div>
  );
}
