import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ExternalLink, MapPin, Smartphone } from "lucide-react";

export function EventQR({ location }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const mapsUrl = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location
      )}`
    : "";

  useEffect(() => {
    if (!mapsUrl) return undefined;
    let alive = true;
    setSrc(null);
    setFailed(false);
    QRCode.toDataURL(mapsUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: { dark: "#1f1c18", light: "#fffdf8" },
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [mapsUrl]);

  if (!location) return null;
  if (failed) return null;

  return (
    <div className="event-qr">
      <div className="event-qr__copy">
        <span className="eyebrow">Cómo llegar</span>
        <strong>
          <MapPin size={16} strokeWidth={1.9} aria-hidden="true" />
          {location}
        </strong>
        <span className="event-qr__hint">
          <Smartphone size={14} strokeWidth={1.9} aria-hidden="true" />
          Escanea el código con el móvil para abrir el mapa.
        </span>
        <a href={mapsUrl} target="_blank" rel="noreferrer">
          Abrir en Maps
          <ExternalLink size={13} strokeWidth={1.9} aria-hidden="true" />
        </a>
      </div>
      <div className="event-qr__code" aria-live="polite">
        {src ? (
          <img src={src} alt={`Código QR con la ubicación: ${location}`} />
        ) : (
          <span className="event-qr__loading">Generando…</span>
        )}
      </div>
    </div>
  );
}
