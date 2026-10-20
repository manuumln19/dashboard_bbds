import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Eraser,
  LoaderCircle,
  PenLine,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { recognizeHandwriting } from "../lib/handwriting";

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 512;
const STROKE_WIDTH = 13;
const CROP_PADDING = 30;

const PEN_COLORS = [
  { value: "#f6ecdc", label: "Crema" },
  { value: "#9ae8cd", label: "Menta" },
  { value: "#c8b8ff", label: "Lavanda" },
  { value: "#ffc09b", label: "Melocotón" },
];

function isMouse(event) {
  return event.pointerType === "mouse" && event.button !== 0;
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function applyBrush(context, color, withGlow = true, lineWidth = STROKE_WIDTH) {
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = color;
  context.shadowBlur = withGlow ? 3 : 0;
}

function drawStroke(
  context,
  stroke,
  { color = stroke.color, withGlow = true, lineWidth = STROKE_WIDTH } = {}
) {
  const points = stroke.points;
  if (!points.length) return;
  applyBrush(context, color, withGlow, lineWidth);

  if (points.length === 1) {
    context.beginPath();
    context.arc(points[0].x, points[0].y, lineWidth / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const middle = midpoint(current, next);
    context.quadraticCurveTo(current.x, current.y, middle.x, middle.y);
  }
  const last = points[points.length - 1];
  context.lineTo(last.x, last.y);
  context.stroke();
}

function boundsFromStrokes(strokes) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  strokes.forEach((stroke) => {
    stroke.points.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
  });

  if (!Number.isFinite(minX)) return null;
  return { minX, maxX, minY, maxY };
}

function progressCopy(progress) {
  if (!progress) return "Preparando el reconocimiento…";
  if (progress.phase === "download") {
    return progress.percent > 0
      ? `Descargando el modelo (solo la primera vez) · ${progress.percent} %`
      : "Descargando el modelo (solo la primera vez)…";
  }
  if (progress.phase === "load") {
    return "Preparando el modelo en el dispositivo…";
  }
  if (progress.phase === "infer") {
    return "Reconociendo los trazos…";
  }
  return "Preparando el reconocimiento…";
}

export function HandwritingSheet({ open, listTitle, onClose, onSave }) {
  const canvasRef = useRef(null);
  const sheetRef = useRef(null);
  const strokesRef = useRef([]);
  const activeStrokeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const requestRef = useRef(0);
  const recognizingRef = useRef(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [penColor, setPenColor] = useState(PEN_COLORS[0].value);
  const [phase, setPhase] = useState("draw");
  const [recognizedText, setRecognizedText] = useState("");
  const [recognitionError, setRecognitionError] = useState("");
  const [progress, setProgress] = useState(null);
  onCloseRef.current = onClose;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    strokesRef.current.forEach((stroke) => drawStroke(context, stroke));
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    if (context) {
      context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      context.lineCap = "round";
      context.lineJoin = "round";
    }
    strokesRef.current = [];
    activeStrokeRef.current = null;
    requestRef.current += 1;
    recognizingRef.current = false;
    setStrokeCount(0);
    setPhase("draw");
    setRecognizedText("");
    setRecognitionError("");
    setProgress(null);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => sheetRef.current?.focus());

    function handleKeyDown(event) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      // Si se cierra durante el reconocimiento, ignoramos el resultado tardío.
      requestRef.current += 1;
      recognizingRef.current = false;
    };
  }, [open]);

  if (!open) return null;

  const isRecognizing = phase === "recognizing";
  const isReview = phase === "review";
  const canvasLocked = phase !== "draw";

  function pointFromEvent(event) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }

  function handlePointerDown(event) {
    if (isMouse(event) || canvasLocked) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Los eventos sintéticos o algunos lápices no permiten capturar el puntero.
    }
    const stroke = { color: penColor, points: [pointFromEvent(event)] };
    activeStrokeRef.current = stroke;
    strokesRef.current = [...strokesRef.current, stroke];
    setStrokeCount(strokesRef.current.length);

    const context = canvas.getContext("2d");
    if (context) {
      applyBrush(context, penColor, false);
      context.beginPath();
      context.arc(
        stroke.points[0].x,
        stroke.points[0].y,
        STROKE_WIDTH / 2,
        0,
        Math.PI * 2
      );
      context.fill();
    }
  }

  function handlePointerMove(event) {
    const stroke = activeStrokeRef.current;
    if (!stroke || canvasLocked) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const previous = stroke.points[stroke.points.length - 1];
    if (
      previous &&
      Math.abs(previous.x - point.x) < 1.4 &&
      Math.abs(previous.y - point.y) < 1.4
    ) {
      return;
    }
    stroke.points.push(point);

    // Trazo incremental: no repintamos toda la libreta en cada movimiento.
    // El suavizado y el brillo se aplican una sola vez al levantar el dedo.
    const context = canvasRef.current?.getContext("2d");
    if (context && previous) {
      applyBrush(context, stroke.color, false);
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    }
  }

  function finishStroke(event) {
    if (!activeStrokeRef.current) return;
    if (event.pointerId !== undefined) {
      try {
        canvasRef.current?.releasePointerCapture(event.pointerId);
      } catch {
        // El puntero ya puede haberse liberado solo.
      }
    }
    activeStrokeRef.current = null;
    redraw();
  }

  function undo() {
    if (canvasLocked) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    redraw();
  }

  function clear() {
    if (canvasLocked) return;
    strokesRef.current = [];
    activeStrokeRef.current = null;
    setStrokeCount(0);
    redraw();
  }

  function buildOcrImage() {
    const bounds = boundsFromStrokes(strokesRef.current);
    if (!bounds) return null;

    const output = document.createElement("canvas");
    output.width = Math.ceil(bounds.maxX - bounds.minX + CROP_PADDING * 2);
    output.height = Math.ceil(bounds.maxY - bounds.minY + CROP_PADDING * 2);
    const context = output.getContext("2d");
    if (!context) return null;

    // TrOCR espera tinta oscura sobre papel claro: la libreta es de cristal,
    // pero la imagen que se analiza se prepara en blanco y negro.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, output.width, output.height);
    context.translate(CROP_PADDING - bounds.minX, CROP_PADDING - bounds.minY);
    strokesRef.current.forEach((stroke) => {
      drawStroke(context, stroke, {
        color: "#111820",
        withGlow: false,
        lineWidth: STROKE_WIDTH,
      });
    });

    return output.toDataURL("image/png");
  }

  async function recognize() {
    if (recognizingRef.current || !strokesRef.current.length) return;
    const image = buildOcrImage();
    if (!image) return;

    recognizingRef.current = true;
    requestRef.current += 1;
    const requestId = requestRef.current;
    setPhase("recognizing");
    setRecognizedText("");
    setRecognitionError("");
    setProgress({ phase: "download", percent: 0 });

    // Deja que React pinte el estado de espera antes de la inferencia.
    await new Promise((resolve) => window.setTimeout(resolve, 40));
    if (requestRef.current !== requestId) return;

    try {
      const text = await recognizeHandwriting(image, (update) => {
        if (requestRef.current === requestId) setProgress(update);
      });
      if (requestRef.current !== requestId) return;
      setProgress(null);
      setRecognizedText(text);
      setPhase("review");
      if (!text) {
        setRecognitionError(
          "No se ha reconocido ningún texto. Puedes escribirlo a mano en la caja."
        );
      }
    } catch {
      if (requestRef.current !== requestId) return;
      setProgress(null);
      setPhase("review");
      setRecognitionError(
        "No se pudo usar el reconocimiento automático. Escribe el texto a mano; se guardará igual."
      );
    } finally {
      if (requestRef.current === requestId) {
        recognizingRef.current = false;
      }
    }
  }

  function backToDrawing() {
    requestRef.current += 1;
    recognizingRef.current = false;
    setPhase("draw");
    setProgress(null);
    setRecognitionError("");
  }

  function saveRecognizedText() {
    const value = recognizedText.replace(/\s+/g, " ").trim();
    if (!value) return;
    onSave(value);
  }

  return (
    <div
      className="ink-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="ink-sheet card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ink-title"
        tabIndex={-1}
        ref={sheetRef}
      >
        <header className="ink-head">
          <span className="ink-head__icon" aria-hidden="true">
            <PenLine size={23} strokeWidth={1.7} />
          </span>
          <div>
            <span className="eyebrow">Escribir a mano</span>
            <h2 id="ink-title">{listTitle}</h2>
            <p>
              Traza una línea. La convertiremos en texto editable en este
              dispositivo.
            </p>
          </div>
          <button
            type="button"
            className="icon-button ink-close"
            onClick={onClose}
            aria-label="Cerrar la libreta"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <div className="ink-paper">
          <canvas
            ref={canvasRef}
            className={`ink-canvas${canvasLocked ? " is-locked" : ""}`}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            aria-label={`Zona para escribir a mano en ${listTitle}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
            onPointerLeave={(event) => {
              if (event.buttons === 0) finishStroke(event);
            }}
          />
          {strokeCount === 0 ? (
            <span className="ink-hint" aria-hidden="true">
              Escribe una línea
            </span>
          ) : null}
          <span className="ink-paper__shine" aria-hidden="true" />
        </div>

        {isRecognizing ? (
          <div className="ink-recognition" role="status" aria-live="polite">
            <span className="ink-recognition__icon" aria-hidden="true">
              <LoaderCircle
                className="ink-spinner"
                size={22}
                strokeWidth={1.9}
              />
            </span>
            <div className="ink-recognition__copy">
              <strong>{progressCopy(progress)}</strong>
              <span>
                {progress && progress.phase === "download"
                  ? "Unos 70 MB; después queda guardado. La imagen no sale del dispositivo."
                  : "Puede tardar unos segundos en la tableta."}
              </span>
            </div>
          </div>
        ) : null}

        {isReview ? (
          <div className="ink-review">
            <div className="ink-review__head">
              <span>
                <Sparkles size={16} strokeWidth={1.9} aria-hidden="true" />
                Texto reconocido
              </span>
              <span>{recognizedText.length}/160</span>
            </div>
            <label className="sr-only" htmlFor="ink-recognized-text">
              Corrige el texto reconocido
            </label>
            <textarea
              id="ink-recognized-text"
              value={recognizedText}
              onChange={(event) => setRecognizedText(event.target.value)}
              maxLength={160}
              rows={2}
              placeholder="Escribe aquí lo que pone en la libreta…"
            />
            <p
              className={`ink-review__note${
                recognitionError ? " is-error" : ""
              }`}
            >
              {recognitionError ||
                "Revisa el texto y corrige tildes, ñ o palabras antes de añadirlo."}
            </p>
          </div>
        ) : null}

        <footer className="ink-actions">
          <div className="ink-tools">
            {isReview ? (
              <button
                type="button"
                className="ink-tool"
                onClick={backToDrawing}
              >
                <ArrowLeft size={17} strokeWidth={1.9} aria-hidden="true" />
                Volver a escribir
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="ink-tool"
                  onClick={undo}
                  disabled={strokeCount === 0 || canvasLocked}
                >
                  <Undo2 size={17} strokeWidth={1.9} aria-hidden="true" />
                  Deshacer
                </button>
                <button
                  type="button"
                  className="ink-tool"
                  onClick={clear}
                  disabled={strokeCount === 0 || canvasLocked}
                >
                  <Eraser size={17} strokeWidth={1.9} aria-hidden="true" />
                  Borrar
                </button>
                <div
                  className="ink-pens"
                  role="group"
                  aria-label="Color de la tinta"
                >
                  {PEN_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`ink-pen${
                        penColor === color.value ? " is-active" : ""
                      }`}
                      style={{ "--pen-color": color.value }}
                      onClick={() => setPenColor(color.value)}
                      disabled={canvasLocked}
                      aria-label={`Tinta ${color.label}`}
                      aria-pressed={penColor === color.value}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="ink-buttons">
            <button type="button" className="ink-cancel" onClick={onClose}>
              {isReview ? "Descartar" : "Cancelar"}
            </button>
            {isReview ? (
              <button
                type="button"
                className="ink-save"
                onClick={saveRecognizedText}
                disabled={!recognizedText.trim()}
              >
                <Check size={18} strokeWidth={2.3} aria-hidden="true" />
                Añadir a la lista
              </button>
            ) : (
              <button
                type="button"
                className="ink-save"
                onClick={recognize}
                disabled={strokeCount === 0 || isRecognizing}
              >
                {isRecognizing ? (
                  <LoaderCircle
                    className="ink-spinner"
                    size={18}
                    strokeWidth={2.3}
                    aria-hidden="true"
                  />
                ) : (
                  <Sparkles size={18} strokeWidth={2.3} aria-hidden="true" />
                )}
                {isRecognizing ? "Reconociendo…" : "Reconocer texto"}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
