import { useState } from "react";
import {
  AlertTriangle,
  Images,
  Link2,
  LoaderCircle,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { DEMO_MODE } from "../config";

export function PhotoAlbumSheet({ photos, onClose }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(null);
  const [localError, setLocalError] = useState(null);
  const fromEnv = photos.source === "env";

  async function run(kind, action) {
    setBusy(kind);
    setLocalError(null);
    try {
      await action();
      if (kind === "save") setUrl("");
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "No se pudo guardar");
    } finally {
      setBusy(null);
    }
  }

  const spinner = (
    <LoaderCircle className="feature-spin" size={16} strokeWidth={2} aria-hidden="true" />
  );

  return (
    <div
      className="ink-overlay feature-overlay"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="ink-sheet card calendar-sheet photo-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-sheet-title"
      >
        <header className="ink-head">
          <span className="ink-head__icon" aria-hidden="true">
            <Images size={23} strokeWidth={1.7} />
          </span>
          <div>
            <span className="eyebrow">Salvapantallas</span>
            <h2 id="photo-sheet-title">Álbum de fotos</h2>
            <p>
              Las fotos salen de un álbum compartido de iCloud. Lo que añadáis
              desde el iPhone aparece aquí solo.
            </p>
          </div>
          <button
            type="button"
            className="icon-button ink-close"
            onClick={onClose}
            aria-label="Cerrar el álbum"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        {localError || photos.error ? (
          <p className="feature-alert" role="alert">
            <AlertTriangle size={15} strokeWidth={1.9} aria-hidden="true" />
            {localError || photos.error}
          </p>
        ) : null}

        <div className="calendar-sheet__body">
          <section className="feature-section">
            <div className="feature-section__head">
              <h3>
                <Images size={16} strokeWidth={1.9} aria-hidden="true" />
                {photos.configured && photos.album ? photos.album.name : "Sin álbum"}
              </h3>
              <span>
                {photos.configured
                  ? `${(photos.photos || []).length} fotos${
                      photos.album && photos.album.owner ? ` · de ${photos.album.owner}` : ""
                    }`
                  : "Todavía no hay ningún álbum elegido"}
              </span>
            </div>
            {photos.configured && !DEMO_MODE ? (
              <div className="photo-sheet__actions">
                <button
                  type="button"
                  className="feature-mini-button"
                  onClick={() => run("refresh", () => photos.refresh(true))}
                  disabled={Boolean(busy)}
                >
                  {busy === "refresh" ? spinner : <RefreshCw size={15} strokeWidth={1.9} aria-hidden="true" />}
                  Buscar fotos nuevas
                </button>
                {fromEnv ? null : (
                  <button
                    type="button"
                    className="feature-mini-button"
                    onClick={() => run("remove", photos.removeAlbum)}
                    disabled={Boolean(busy)}
                  >
                    {busy === "remove" ? spinner : <Trash2 size={15} strokeWidth={1.9} aria-hidden="true" />}
                    Quitar álbum
                  </button>
                )}
              </div>
            ) : null}
          </section>

          {DEMO_MODE ? (
            <p className="calendar-sheet__empty">En la demo se usan fotos de ejemplo.</p>
          ) : (
            <section className="feature-section feature-section--new">
              <div className="feature-section__head">
                <h3>
                  <Link2 size={16} strokeWidth={1.9} aria-hidden="true" />
                  {photos.configured ? "Cambiar de álbum" : "Elegir álbum"}
                </h3>
                <span>Enlace del sitio web público del álbum</span>
              </div>
              <div className="calendar-add photo-sheet__form">
                <label className="calendar-add__url">
                  <span>Enlace de iCloud</span>
                  <input
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="https://photos.icloud.com/shared/album/…"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="feature-button"
                  onClick={() => run("save", () => photos.saveAlbum(url))}
                  disabled={!url.trim() || Boolean(busy)}
                >
                  {busy === "save" ? spinner : <Save size={16} strokeWidth={2} aria-hidden="true" />}
                  Guardar
                </button>
              </div>
              <p className="feature-hint">
                En el iPhone: Fotos → Álbumes → el álbum compartido → icono de
                personas → activa «Sitio web público» y copia el enlace. Para no
                teclearlo aquí, abre {window.location.host} en el móvil o el PC,
                toca el botón de fotos y pégalo allí: la pantalla lo recoge sola.
              </p>
            </section>
          )}
        </div>

        <footer className="calendar-sheet__foot">
          <span>De noche el salvapantallas solo muestra la hora, sin fotos.</span>
          <button type="button" className="feature-button" onClick={onClose}>
            Listo
          </button>
        </footer>
      </section>
    </div>
  );
}
