#!/usr/bin/env node
// Comprueba que el build de producción no se apoye en sintaxis que un
// WebView antiguo no entienda. No sustituye a probar en la pantalla real:
// las funciones CSS modernas solo se avisan porque el diseño se degrada.
//
// Uso:
//   npm run build
//   npm run check:webview
//   npm run check:webview -- --strict   (falla también con avisos)

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = path.join(root, "dist");
const strict = process.argv.includes("--strict");

const errors = [];
const warnings = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

if (!fs.existsSync(dist)) {
  console.error("✗ No existe dist/. Ejecuta primero: npm run build");
  process.exit(1);
}

const files = walk(dist);
const jsFiles = files.filter((file) => file.endsWith(".js"));
const cssFiles = files.filter((file) => file.endsWith(".css"));
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");

if (!jsFiles.length) errors.push("dist/ no contiene JavaScript compilado.");
if (!cssFiles.length) errors.push("dist/ no contiene CSS compilado.");

// 1. Sintaxis que esbuild debería haber transformado para Chrome 64.
const SYNTAX_RISKS = [
  { pattern: /\?\.[A-Za-z_$[(]/, label: "optional chaining (?.)" },
  { pattern: /\?\?/, label: "nullish coalescing (??)" },
  { pattern: /\|\|=|&&=|\?\?=/, label: "logical assignment" },
  { pattern: /\bstatic\s*\{/, label: "static initialization blocks" },
];

for (const file of jsFiles) {
  const text = fs.readFileSync(file, "utf8");
  // El OCR vive en un chunk aparte y ya es opcional: si su motor no cabe en
  // un WebView viejo, la libreta sigue funcionando con texto escrito a mano.
  const optionalChunk = /^(?:transformers|onnxruntime|ics)-/.test(
    path.basename(file)
  );
  for (const risk of SYNTAX_RISKS) {
    const matches = text.match(new RegExp(risk.pattern.source, "g"));
    if (matches) {
      const message = `${path.relative(root, file)}: ${matches.length}× ${risk.label}`;
      if (optionalChunk) warnings.push(`${message} (chunk opcional, OCR)`);
      else errors.push(message);
    }
  }
}

// 2. APIs que no existían en Chrome 64. Algunas están protegidas con try/catch,
// pero conviene saberlo antes de tocar la pantalla.
const API_RISKS = [
  { pattern: /\.replaceAll\s*\(/, label: "String.replaceAll (Chrome 85)" },
  { pattern: /structuredClone\s*\(/, label: "structuredClone (Chrome 98)" },
  { pattern: /crypto\.randomUUID\s*\(/, label: "crypto.randomUUID (Chrome 92)" },
  { pattern: /Object\.hasOwn\s*\(/, label: "Object.hasOwn (Chrome 93)" },
  { pattern: /\.at\s*\(\s*-?\d+\s*\)/, label: "Array.prototype.at (Chrome 92)" },
];

for (const file of jsFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const risk of API_RISKS) {
    if (risk.pattern.test(text)) {
      warnings.push(`${path.relative(root, file)}: ${risk.label}`);
    }
  }
}

// 3. CSS que puede degradar el diseño, no romper los datos.
const CSS_RISKS = [
  { pattern: /color-mix\s*\(/i, label: "color-mix() (Chrome 111)" },
  { pattern: /:has\s*\(/i, label: "selector :has() (Chrome 105)" },
  { pattern: /@container\b/i, label: "container queries (Chrome 105)" },
  { pattern: /\binset\s*:/i, label: "inset abreviado (Chrome 87)" },
  { pattern: /\b(?:min|max|clamp)\s*\(/i, label: "min()/max()/clamp() (Chrome 79)" },
  { pattern: /\b\d+(?:\.\d+)?dvh\b/i, label: "unidades dvh (Chrome 108)" },
  { pattern: /backdrop-filter\s*:/i, label: "backdrop-filter (Chrome 76)" },
  { pattern: /\bgap\s*:/i, label: "gap (revisar si es flex; Chrome 84)" },
];

for (const file of cssFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const risk of CSS_RISKS) {
    if (risk.pattern.test(text)) {
      warnings.push(`${path.relative(root, file)}: ${risk.label}`);
    }
  }
}

// 4. Piezas que hacen que la pantalla arranque sin red.
const required = [
  ["dist/sw.js", "service worker"],
  ["dist/manifest.webmanifest", "manifest"],
  ["dist/icon-180.png", "icono 180"],
  ["dist/icon-192.png", "icono 192"],
  ["dist/icon-512.png", "icono 512"],
];
for (const [relative, label] of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    errors.push(`Falta ${relative} (${label}).`);
  }
}

if (!/serviceWorker\.register\s*\(/.test(jsFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n"))) {
  warnings.push("No se encuentra serviceWorker.register() en el bundle.");
}
if (!/<script[^>]+type="module"/i.test(html)) {
  warnings.push("index.html no usa un script de módulo.");
}

// 5. El Worker también debe parsear.
const workerCheck = spawnSync(
  process.execPath,
  ["--check", path.join(root, "worker", "index.js")],
  { encoding: "utf8" }
);
if (workerCheck.status !== 0) {
  errors.push(`worker/index.js no parsea: ${workerCheck.stderr.trim()}`);
}

const totalKb = jsFiles.reduce(
  (sum, file) => sum + fs.statSync(file).size / 1024,
  0
);
console.log(
  `BBDS · revisión del build (${jsFiles.length} JS, ${cssFiles.length} CSS, ${totalKb.toFixed(
    1
  )} KB de JS)`
);
console.log(`  target esperado: Chrome 64 (vite.config.js)`);

if (warnings.length) {
  console.log("\nAvisos (degradación visual o API opcional):");
  for (const warning of [...new Set(warnings)]) console.log(`  ! ${warning}`);
}
if (errors.length) {
  console.log("\nErrores:");
  for (const error of errors) console.log(`  x ${error}`);
  process.exit(1);
}

console.log("\n✓ Sin errores de sintaxis para el WebView objetivo.");
if (strict && warnings.length) process.exit(1);
