import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function normalizeCalendarUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) throw new Error("Falta la dirección del calendario");
  if (value.length > 2048) throw new Error("La dirección es demasiado larga");

  const normalized = value.startsWith("webcal://")
    ? `https://${value.slice(9)}`
    : value;
  let url;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("La dirección del calendario no es válida");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("El calendario debe usar http(s) o webcal");
  }

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    throw new Error("No se pueden leer calendarios de la red local");
  }

  if (/calendar\.google\.com$/i.test(host) && /[?&]cid=/i.test(url.search)) {
    throw new Error(
      "Ese es el enlace público de Google. Usa la dirección secreta en formato iCal (.ics)"
    );
  }

  return normalized;
}

// En `npm run dev:demo` no hay Worker, así que este middleware hace de proxy
// para los ICS reales y evita el bloqueo CORS de iCloud/Google. Solo se monta
// en modo demo; en el resto de modos /api sigue yendo al Worker.
function demoIcsProxy() {
  async function handle(req, res, next) {
    let requestUrl;
    try {
      requestUrl = new URL(req.url || "/", "http://localhost");
    } catch {
      next();
      return;
    }
    if (requestUrl.pathname !== "/api/ics") {
      next();
      return;
    }

    function fail(status, message) {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify({ error: message }));
    }

    let target;
    try {
      target = normalizeCalendarUrl(requestUrl.searchParams.get("url"));
    } catch (error) {
      fail(400, error.message);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(target, {
        headers: {
          Accept: "text/calendar, text/plain;q=0.8",
          "User-Agent": "BBDSDashboard/1.0",
        },
        signal: controller.signal,
        redirect: "follow",
      });
      if (!response.ok) {
        fail(502, `El calendario respondió ${response.status} al descargar el ICS`);
        return;
      }
      const text = await response.text();
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(text);
    } catch (error) {
      const message =
        error && error.name === "AbortError"
          ? "El calendario ha tardado demasiado en responder"
          : "No se pudo descargar el calendario";
      fail(502, message);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    name: "bbds-demo-ics",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

// El marco usa un WebView moderno (Chrome 64+). Sin plugin-legacy evitamos
// polyfills y un segundo bundle que nunca se ejecuta en el dispositivo.
// En el build, Preact (preact/compat) en lugar de React: ~120 KB menos que
// leer y compilar al arrancar y menos memoria en el marco (Cortex-A7, 1 GB).
// El código sigue siendo React; en desarrollo se usa React de verdad para la
// recarga en caliente. Para probar el build: `npm run build && npm run preview`.
const PREACT_ALIASES = [
  { find: /^react-dom\/client$/, replacement: "preact/compat/client" },
  { find: /^react-dom$/, replacement: "preact/compat" },
  { find: /^react\/jsx-runtime$/, replacement: "preact/jsx-runtime" },
  { find: /^react\/jsx-dev-runtime$/, replacement: "preact/jsx-dev-runtime" },
  { find: /^react$/, replacement: "preact/compat" },
];

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const demoMode = env.VITE_DEMO_MODE === "true";

  return {
    plugins: [react(), ...(demoMode ? [demoIcsProxy()] : [])],
    resolve: command === "build" ? { alias: PREACT_ALIASES } : undefined,
    build: {
      target: "chrome64",
      cssTarget: "chrome64",
      minify: "esbuild",
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
    },
  };
});
