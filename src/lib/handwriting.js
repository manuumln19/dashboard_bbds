const MODEL_ID = "Xenova/trocr-small-handwritten";
const MAX_TEXT_LENGTH = 160;
const APPROX_MODEL_BYTES = 70_000_000;

let recognizerPromise = null;
const progressListeners = new Set();

function emitProgress(update) {
  progressListeners.forEach((listener) => {
    try {
      listener(update);
    } catch {
      // Un oyente roto no debe impedir el reconocimiento.
    }
  });
}

async function getRecognizer() {
  if (!recognizerPromise) {
    recognizerPromise = (async () => {
      // Se carga solo al pulsar «Reconocer texto»: la portada no paga este peso.
      const { env, pipeline } = await import("@xenova/transformers");

      env.allowLocalModels = false;
      env.useBrowserCache = true;

      // El WebView no está aislado con COOP/COEP: una sola hebra y sin proxy.
      if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
        env.backends.onnx.wasm.numThreads = 1;
        env.backends.onnx.wasm.proxy = false;
        // Copiamos los binarios de ONNX Runtime a public/ort para no depender
        // de un CDN adicional al reconocer la letra.
        env.backends.onnx.wasm.wasmPaths = `${import.meta.env.BASE_URL}ort/`;
      }

      // Sumamos los bytes de todos los archivos descargados para que la barra
      // no vuelva a cero cada vez que empieza el siguiente archivo del modelo.
      const downloads = new Map();

      return pipeline("image-to-text", MODEL_ID, {
        quantized: true,
        progress_callback: (event) => {
          if (!event || !event.status) return;

          if (
            event.status === "progress" &&
            event.file &&
            Number.isFinite(event.loaded)
          ) {
            downloads.set(event.file, {
              loaded: event.loaded,
              total: Number.isFinite(event.total) ? event.total : event.loaded,
            });
            let loadedBytes = 0;
            downloads.forEach((entry) => {
              loadedBytes += Math.min(entry.loaded, entry.total);
            });
            emitProgress({
              phase: "download",
              percent: Math.min(
                99,
                Math.round((loadedBytes / APPROX_MODEL_BYTES) * 100)
              ),
              loadedBytes,
            });
            return;
          }

          if (event.status === "ready") {
            emitProgress({ phase: "load", percent: 100 });
          }
        },
      });
    })().catch((error) => {
      // Permite reintentar si falla la descarga o la inicialización.
      recognizerPromise = null;
      throw error;
    });
  }

  return recognizerPromise;
}

function cleanRecognizedText(value) {
  const text = String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, MAX_TEXT_LENGTH);
}

export async function recognizeHandwriting(
  image,
  onProgress,
  generationOptions = {}
) {
  const listener = typeof onProgress === "function" ? onProgress : null;
  if (listener) progressListeners.add(listener);

  try {
    const recognizer = await getRecognizer();
    emitProgress({ phase: "infer", percent: 100 });

    const result = await recognizer(image, {
      max_new_tokens: 48,
      ...generationOptions,
    });

    const entry = Array.isArray(result) ? result[0] : result;
    const generated = entry && entry.generated_text ? entry.generated_text : "";
    return cleanRecognizedText(generated);
  } finally {
    if (listener) progressListeners.delete(listener);
  }
}
