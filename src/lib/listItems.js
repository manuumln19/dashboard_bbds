const LEGACY_NOTE_TEXT = "Nota manuscrita";

export function isLegacyDrawing(item) {
  return (
    Boolean(item && item.drawing) &&
    (!item.text || item.text === LEGACY_NOTE_TEXT)
  );
}
