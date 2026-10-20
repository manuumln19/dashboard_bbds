import { useEffect, useState } from "react";
import { Images, X } from "lucide-react";
import { APP_NAME, LOCATION } from "../config";
import { formatClock, formatLongDate } from "../lib/date";
import { GALLERY_PHOTOS } from "../lib/gallery";

const SLIDE_MS = 12000;

export function Screensaver({ now, onClose }) {
  const [index, setIndex] = useState(0);
  const photo = GALLERY_PHOTOS[index];
  const count = GALLERY_PHOTOS.length;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [count]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setIndex((current) => (current + 1) % count);
      }
      if (event.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + count) % count);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [count, onClose]);

  return (
    <div
      className="screensaver"
      role="dialog"
      aria-modal="true"
      aria-label="Galería de fotos"
      onPointerDown={onClose}
    >
      <div className="screensaver__photos" aria-hidden="true">
        {GALLERY_PHOTOS.map((item, photoIndex) => (
          <img
            key={item.src}
            src={item.src}
            alt=""
            className={`screensaver__photo${
              photoIndex === index ? " is-active" : ""
            }`}
            draggable="false"
          />
        ))}
      </div>
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
        <button
          type="button"
          className="screensaver__close"
          onClick={onClose}
          aria-label="Cerrar galería"
          title="Cerrar galería"
        >
          <X size={19} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      <footer className="screensaver__bottom">
        <div className="screensaver__caption">
          <span className="eyebrow">Galería</span>
          <strong>{photo.caption}</strong>
          <small>{photo.credit}</small>
        </div>

        <div className="screensaver__hint">
          <Images size={15} strokeWidth={1.8} aria-hidden="true" />
          Toca cualquier punto para volver
        </div>

        <div className="screensaver__dots" aria-hidden="true">
          {GALLERY_PHOTOS.map((item, photoIndex) => (
            <span
              key={item.src}
              className={photoIndex === index ? "is-active" : ""}
            />
          ))}
          <small>
            {index + 1} / {count}
          </small>
        </div>
      </footer>
    </div>
  );
}
