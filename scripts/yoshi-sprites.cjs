// Recorta la hoja de Yoshis (4x4, fondo magenta) en sprites WebP con alfa.
// Uso: node scripts/yoshi-sprites.cjs <hoja.jpg> src/assets/yoshi sharp
const path = require("path");
const fs = require("fs");
const [, , sheetPath, outDir, sharpPath] = process.argv;
const sharp = require(sharpPath);

// [fila, columna, nombre, voltear (mira a la izquierda)]
// Orden de la hoja de 16: ver README (sección Yoshi).
const CELLS = [
  [0, 0, "idle", false],
  [0, 1, "blink", false],
  [0, 2, "happy", false],
  [0, 3, "run", false],
  [1, 0, "sleep", false],
  [1, 1, "rain", false],
  [1, 2, "cold", false],
  [1, 3, "hot", false],
  [2, 0, "hungry", false],
  [2, 1, "cheer", false],
  [2, 2, "trophy", false],
  [2, 3, "halloween", false],
  [3, 0, "navidad", false],
  [3, 1, "cumple", false],
  [3, 2, "stretch", false],
  [3, 3, "dizzy", false],
];

const KEY = [255, 0, 255];
const NEAR = 95; // a esta distancia del magenta o menos, transparente
const FAR = 175; // a esta o más, opaco
const OUT = 192;
const FEET = 188; // línea de los pies en el lienzo de salida
const INSET = 4; // fuera las líneas de la rejilla
const LABEL = { w: 46, h: 36 }; // el número de la esquina de cada celda

(async () => {
  const { data, info } = await sharp(sheetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const cellW = width / 4;
  const cellH = height / 4;
  fs.mkdirSync(outDir, { recursive: true });

  for (const [row, col, name, flip] of CELLS) {
    const x0 = Math.round(col * cellW) + INSET;
    const y0 = Math.round(row * cellH) + INSET;
    const w = Math.floor(cellW) - INSET * 2;
    const h = Math.floor(cellH) - INSET * 2;
    const cell = Buffer.alloc(w * h * 4);
    let minX = w, minY = h, maxX = -1, maxY = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = ((y0 + y) * width + (x0 + x)) * 4;
        let r = data[si], g = data[si + 1], b = data[si + 2];
        const d = Math.sqrt((r - KEY[0]) ** 2 + (g - KEY[1]) ** 2 + (b - KEY[2]) ** 2);
        let a = Math.min(1, Math.max(0, (d - NEAR) / (FAR - NEAR)));
        if (a > 0 && a < 1) {
          // Separa el color real del magenta mezclado en el borde.
          r = Math.min(255, Math.max(0, (r - (1 - a) * KEY[0]) / a));
          g = Math.min(255, Math.max(0, (g - (1 - a) * KEY[1]) / a));
          b = Math.min(255, Math.max(0, (b - (1 - a) * KEY[2]) / a));
        }
        // El magenta se corre por la compresión y tiñe de rosa el borde
        // blanco: en los claros con rojo y azul por encima del verde, se
        // sube el verde. La silla (sin azul) y el paraguas (sin rojo), igual.
        if (r > g + 8 && b > g + 8 && Math.min(r, b) > 150) {
          const top = Math.min(r, b);
          r = Math.min(r, top + 10);
          b = Math.min(b, top + 10);
          g = top;
        }
        // Restos de rosa en bordes casi transparentes: fuera. Y el número.
        if (a < 0.08) a = 0;
        if (x < LABEL.w && y < LABEL.h) a = 0;
        const di = (y * w + (flip ? w - 1 - x : x)) * 4;
        cell[di] = r;
        cell[di + 1] = g;
        cell[di + 2] = b;
        cell[di + 3] = Math.round(a * 255);
        if (a > 0.5) {
          const fx = flip ? w - 1 - x : x;
          if (fx < minX) minX = fx;
          if (fx > maxX) maxX = fx;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Restos de la rejilla: manchas sueltas finas y largas (líneas) fuera.
    // El confeti y las estrellas son sueltos pero no finos y largos.
    const seen = new Uint8Array(w * h);
    for (let start = 0; start < w * h; start++) {
      if (seen[start] || !cell[start * 4 + 3]) continue;
      const stack = [start];
      const pixels = [];
      let cx0 = w, cy0 = h, cx1 = 0, cy1 = 0;
      seen[start] = 1;
      while (stack.length) {
        const i = stack.pop();
        pixels.push(i);
        const px = i % w;
        const py = (i - px) / w;
        if (px < cx0) cx0 = px;
        if (px > cx1) cx1 = px;
        if (py < cy0) cy0 = py;
        if (py > cy1) cy1 = py;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx;
            const ny = py + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const n = ny * w + nx;
            if (!seen[n] && cell[n * 4 + 3]) {
              seen[n] = 1;
              stack.push(n);
            }
          }
        }
      }
      const bw = cx1 - cx0 + 1;
      const bh = cy1 - cy0 + 1;
      const thin = Math.min(bw, bh) <= 4 && Math.max(bw, bh) >= 12;
      if (thin || pixels.length < 6) for (const i of pixels) cell[i * 4 + 3] = 0;
    }

    // Los dos píxeles del borde que tocan el fondo aún arrastran rosa: el
    // de fuera se quita y el siguiente se atenúa (el borde blanco es gordo).
    for (const keep of [0, 0.45]) {
      const alpha = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) alpha[i] = cell[i * 4 + 3];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!alpha[i]) continue;
          if (!alpha[i - 1] || !alpha[i + 1] || !alpha[i - w] || !alpha[i + w]) {
            cell[i * 4 + 3] = Math.round(alpha[i] * keep);
          }
        }
      }
    }

    // Caja del personaje, ya limpia.
    minX = w; minY = h; maxX = -1; maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (cell[(y * w + x) * 4 + 3] > 127) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Pies a la misma altura y el personaje centrado en un lienzo fijo.
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const trimmed = await sharp(cell, { raw: { width: w, height: h, channels: 4 } })
      .extract({ left: minX, top: minY, width: bw, height: bh })
      .png()
      .toBuffer();
    const scale = Math.min(1, (OUT - 4) / bw, (FEET - 2) / bh);
    const sw = Math.round(bw * scale);
    const sh = Math.round(bh * scale);
    const sprite = await sharp(trimmed).resize(sw, sh).toBuffer();
    const left = Math.round((OUT - sw) / 2);
    const top = FEET - sh;
    const file = path.join(outDir, `${name}.webp`);
    await sharp({ create: { width: OUT, height: OUT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: sprite, left, top }])
      .webp({ quality: 84, alphaQuality: 90, effort: 6 })
      .toFile(file);
    console.log(name, `${bw}x${bh}`, `${fs.statSync(file).size} B`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
