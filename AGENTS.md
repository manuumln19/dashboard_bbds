# AGENTS.md

BBDS is a home dashboard for a 1280 x 800 wall touchscreen: React 18 + Vite SPA with Spanish UI, backed by a Cloudflare Worker/D1 API. Plain JSX, no TypeScript, no routing library, and no test/lint/CI setup.

`README.md` is the detailed source for setup, environment variables, API contract, and deployment. Keep it in sync with behavior changes.

## Commands

- `npm install` — Node >= 22.12 (declared in `package.json`).
- `npm run dev:demo` — fastest UI check. No Worker/D1; loads `.env.demo` (mode-specific values override `.env.local`) and uses local demo data.
- `npm run dev` — Vite on `5173`, proxying `/api` to the Worker on `8787`.
- `npm run api` — `wrangler dev` on `8787`. It serves the built app from `dist`, so run `npm run build` first and after asset changes.
- Full local stack: `npm run db:migrate:local` -> `npm run build` -> `npm run api` (terminal 1), then `npm run dev` (terminal 2).
- `npm run build` — production build; pair it with `npm run check:webview` for the Chrome 64 target. There is no test, lint, typecheck, or formatter command; do not claim to have run them.
- `npm run check:webview` — scans `dist` for syntax/CSS that the target WebView may not support.
- `npm run sensors:simulate -- --once` — sends one sensor reading to the local Worker. Set `SENSOR_TOKEN` if the Worker has one.
- `npm run deploy` — `vite build` + `wrangler deploy`.

## Architecture

- `src/App.jsx` owns navigation through the URL hash. To add or rename a view, update `VALID_VIEWS`, the rendering block in `App`, and `src/components/Rail.jsx`.
- `src/components/` contains views and presentation, `src/hooks/` owns data fetching/polling, and `src/lib/` contains helpers and integrations. Styling is global: `src/styles.css` for the theme, `src/views.css` for view rules, and `src/features.css` for the newer sheets and dashboard features. No CSS modules or Tailwind.
- `worker/index.js` is a hand-written router: only `/api/*` reaches the Worker (`run_worker_first` in `wrangler.jsonc`); everything else is served from `dist` as an SPA. Add API routes in `route()`.
- Lists, people, cleaning, calendars, and sensors go through the Worker. Weather is fetched directly from the browser to Open-Meteo (`src/lib/weather.js`), with a 24-hour `localStorage` cache. Cleaning and calendar data live in D1 in production and in `localStorage` in demo.
- Demo mode is compile-time: `DEMO_MODE` is true only when `VITE_DEMO_MODE` is exactly the string `true`. Demo data and browser persistence live in `src/lib/demo.js` and `src/lib/localStore.js`.
- D1 schema changes require a new numbered file in `migrations/`; never edit an already-applied migration. Apply with `db:migrate:local` or `db:migrate`.
- The `database_id` in `wrangler.jsonc` is a placeholder. Replace it with the real D1 id before remote migrations or deploy.
- `list_items.list_id` is constrained to `shopping` and `tasks`, list text is capped at 160 characters, and sensor room ids must match `^[a-z0-9_-]{1,32}$`. Keep client-side validation aligned with these limits. Task metadata uses `due_on`, `due_at`, and `person_id`.
- Calendars live in the `calendars` table and are managed from the Agenda sheet. `ICLOUD_ICS_URL` is only a one-time legacy seed for an empty table. The Worker converts `webcal://` to `https://`, rejects public Google pages and local/private hosts, caches results in isolate memory for 5 minutes, and returns at most 80 events.
- `VITE_CLIMATE_ENABLED` gates the Casa view, its rail link, and sensor polling. Preserve the `CLIMATE_ENABLED` / `useSensors(enabled)` checks when touching Home, Rail, or App.

## Conventions and gotchas

- Keep user-facing copy in Spanish and dates formatted as `es-ES`; the reference viewport is 1280 x 800 landscape.
- Cleaning task ids are persistence keys in D1 (`cleaning_tasks` and `cleaning_checks`) and in `localStorage` for demo. Changing or removing an id drops its checks; the week key resets state every Monday.
- List mutations are optimistic and use a `pending` ref to suppress polling while writes are in flight. Preserve that guard when adding mutations.
- Handwriting OCR is lazy-loaded. The first use downloads a ~70 MB model from Hugging Face; ONNX wasm files must stay in `public/ort/` because `wasmPaths` points there.
- The app targets Chrome 64 and no longer builds legacy variants. Keep `npm run check:webview` green; modern CSS (`color-mix()`, `dvh`, `backdrop-filter`, flex `gap`) may only degrade visually.
- The service worker is production-only (`src/main.jsx` registers it when `import.meta.env.PROD`). Test it with `npm run preview`, not `npm run dev`.
- Every `VITE_*` value is baked into the client bundle. Worker secrets belong in `.dev.vars` (gitignored). `.dev.vars.example` is tracked, so keep it placeholder-only; it currently contains a real-looking iCloud feed URL.
- `design/` contains static design studies that are not imported or built. Do not wire them into the app.
