import { useCallback, useEffect, useState } from "react";
import { API_BASE, DEMO_MODE } from "../config";
import { apiRequest } from "../lib/api";
import { GALLERY_PHOTOS } from "../lib/gallery";

const CACHE_KEY = "bbds.photos.v1";
const REFRESH_MS = 30 * 60 * 1000;

function readCache() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null");
    return parsed && Array.isArray(parsed.photos) ? parsed : null;
  } catch {
    return null;
  }
}

function saveCache(payload) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Sin copia local: el salvapantallas espera a la red.
  }
}

// Orden aleatorio pero estable durante el día, para no repetir siempre las
// mismas primeras fotos y sin saltos cada vez que se refresca la lista.
function shuffleForDay(photos) {
  const day = new Date().toDateString();
  let seed = 0;
  for (const char of day) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const list = photos.slice();
  for (let index = list.length - 1; index > 0; index -= 1) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const other = seed % (index + 1);
    [list[index], list[other]] = [list[other], list[index]];
  }
  return list;
}

export function photoSrc(photo) {
  return photo.src || `${API_BASE}/api/photos/${encodeURIComponent(photo.id)}`;
}

const DEMO_STATE = {
  configured: true,
  album: { name: "Fotos de ejemplo", owner: "" },
  photos: GALLERY_PHOTOS.map((photo, index) => ({
    id: `demo-${index}`,
    src: photo.src,
    caption: photo.caption,
    width: 1600,
    height: 1000,
  })),
};

// El álbum solo se pide mientras el salvapantallas está abierto (`active`).
export function usePhotos(active) {
  const [state, setState] = useState(() =>
    DEMO_MODE ? DEMO_STATE : readCache() || { configured: false, photos: [] }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apply = useCallback((payload) => {
    const next = {
      configured: Boolean(payload.configured),
      source: payload.source || null,
      album: payload.album || null,
      photos: shuffleForDay(payload.photos || []),
      error: payload.error || null,
    };
    setState(next);
    saveCache(next);
    setError(payload.error || null);
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      if (DEMO_MODE) return;
      setLoading(true);
      try {
        apply(await apiRequest(`/api/photos${force ? "?refresh=1" : ""}`));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No se pudieron cargar las fotos");
      } finally {
        setLoading(false);
      }
    },
    [apply]
  );

  const saveAlbum = useCallback(
    async (url) => {
      apply(await apiRequest("/api/photos/album", { method: "PUT", body: { url }, timeout: 30000 }));
    },
    [apply]
  );

  const removeAlbum = useCallback(async () => {
    apply(await apiRequest("/api/photos/album", { method: "DELETE" }));
  }, [apply]);

  useEffect(() => {
    if (!active || DEMO_MODE) return undefined;
    refresh();
    const timer = window.setInterval(() => refresh(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [active, refresh]);

  return { ...state, loading, error, refresh, saveAlbum, removeAlbum };
}
