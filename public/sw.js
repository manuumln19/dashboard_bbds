/* BBDS · service worker
 * Guarda el shell de la app y la última respuesta buena de cada fuente.
 * Cuando la red falla, la pantalla arranca con esa copia y avisa con la hora.
 */
const VERSION = "bbds-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_URL = "/index.html";
const CORE = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-180.png",
  "/icon-192.png",
  "/icon-512.png",
];

const STRIP_HEADERS = [
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "set-cookie",
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApi(url) {
  return isSameOrigin(url) && url.pathname.startsWith("/api/");
}

function isWeather(url) {
  return url.hostname === "api.open-meteo.com";
}

function isCacheable(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (!isSameOrigin(url)) return isWeather(url);
  if (url.pathname === "/sw.js") return false;
  // Las fotos del salvapantallas son grandes y no cambian: las guarda la caché
  // HTTP del navegador (immutable) sin el límite de 8 s de la API.
  if (/^\/api\/photos\/(?!album$)[^/]+$/.test(url.pathname)) return false;
  return true;
}

async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, {
      signal: controller.signal,
      credentials: request.credentials,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function cacheResponse(cacheName, request, response) {
  if (!response || !response.ok) return response;
  try {
    const headers = new Headers(response.headers);
    STRIP_HEADERS.forEach((name) => headers.delete(name));
    headers.set("X-BBDS-Cached-At", new Date().toISOString());
    const body = await response.clone().blob();
    const cache = await caches.open(cacheName);
    await cache.put(request, new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }));
  } catch {
    // Si el WebView no deja guardar una respuesta, la app sigue online.
  }
  return response;
}

async function fromCache(request) {
  const keys = [RUNTIME_CACHE, SHELL_CACHE];
  for (const cacheName of keys) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (!cached) continue;
    try {
      const headers = new Headers(cached.headers);
      STRIP_HEADERS.forEach((name) => headers.delete(name));
      headers.set("X-BBDS-Offline", "1");
      const body = await cached.blob();
      return new Response(body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      });
    } catch {
      return cached;
    }
  }
  return null;
}

async function cachedShell() {
  const cache = await caches.open(SHELL_CACHE);
  const cached =
    (await cache.match(OFFLINE_URL)) ||
    (await cache.match("/")) ||
    (await caches.match(OFFLINE_URL));
  if (!cached) return null;
  try {
    const headers = new Headers(cached.headers);
    STRIP_HEADERS.forEach((name) => headers.delete(name));
    headers.set("X-BBDS-Offline", "1");
    const body = await cached.blob();
    return new Response(body, {
      status: 200,
      statusText: "OK",
      headers,
    });
  } catch {
    return cached;
  }
}

async function precache() {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.allSettled(CORE.map((url) => cache.add(url)));

  // Los assets llevan hash: se descubren del index recién descargado.
  try {
    const response = await fetch(OFFLINE_URL, { cache: "no-store" });
    if (response.ok) {
      const html = await response.clone().text();
      await cacheResponse(SHELL_CACHE, OFFLINE_URL, response);
      const assets = new Set();
      const pattern = /(?:src|href)="(\/[^"]+)"/g;
      let match;
      while ((match = pattern.exec(html))) {
        const value = match[1];
        if (value.startsWith("/api/")) continue;
        if (value === "/" || value === OFFLINE_URL) continue;
        assets.add(value);
      }
      await Promise.allSettled([...assets].map((url) => cache.add(url)));
    }
  } catch {
    // Sin red en la instalación: el navegador reintentará en la próxima visita.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("bbds-") &&
              key !== SHELL_CACHE &&
              key !== RUNTIME_CACHE
          )
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!isCacheable(request)) return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetchWithTimeout(request, 4500);
          await cacheResponse(RUNTIME_CACHE, request, response.clone());
          await cacheResponse(SHELL_CACHE, OFFLINE_URL, response.clone());
          return response;
        } catch {
          // Tras un reinicio el Wi-Fi tarda en volver: la página se recarga sola
          // en vez de quedarse aquí hasta que alguien la toque.
          const shell = await cachedShell();
          return (
            shell ||
            new Response(
              "<!doctype html><meta charset=utf-8><title>BBDS</title><body style='font:16px system-ui;padding:2rem'>Sin conexión y sin copia guardada. Se reintenta solo cada 15 segundos.<script>setTimeout(function(){location.reload()},15000)</script></body>",
              { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
            )
          );
        }
      })()
    );
    return;
  }

  if (isApi(url) || isWeather(url)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetchWithTimeout(request, 8000);
          await cacheResponse(RUNTIME_CACHE, request, response.clone());
          return response;
        } catch {
          const cached = await fromCache(request);
          if (cached) return cached;
          throw new Error("Sin red y sin copia para esta petición");
        }
      })()
    );
    return;
  }

  // Estáticos propios: primero la copia, y se actualiza en segundo plano.
  event.respondWith(
    (async () => {
      const cached = await fromCache(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cacheResponse(RUNTIME_CACHE, request, response.clone());
          return response;
        })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })()
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "BBDS_SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (data.type === "BBDS_CLEAR_CACHES") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith("bbds-"))
            .map((key) => caches.delete(key))
        );
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ ok: true });
        }
      })()
    );
  }
});
