// La luna dibujada con la parte iluminada que toca: el borde es medio círculo
// y el terminador, una elipse cuyo ancho depende de la fase.
export function MoonGlyph({ phase, size = 120 }) {
  const r = 50;
  const waxing = phase < 0.5;
  const k = Math.cos(2 * Math.PI * phase); // 1 nueva, -1 llena
  const rx = Math.abs(k) * r;
  const outerSweep = waxing ? 1 : 0;
  // Si la parte iluminada pasa de la mitad, el terminador se curva hacia fuera.
  const innerSweep = k > 0 ? (waxing ? 0 : 1) : waxing ? 1 : 0;
  const lit = `M50 0 A${r} ${r} 0 0 ${outerSweep} 50 100 A${rx} ${r} 0 0 ${innerSweep} 50 0Z`;

  return (
    <svg className="moon-glyph" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r="49" fill="var(--moon-dark, #2a2b33)" />
      <path d={lit} fill="var(--moon-lit, #efe3bd)" />
      <circle cx="36" cy="38" r="6" fill="rgba(0,0,0,0.07)" />
      <circle cx="60" cy="64" r="9" fill="rgba(0,0,0,0.06)" />
      <circle cx="64" cy="30" r="4" fill="rgba(0,0,0,0.06)" />
    </svg>
  );
}
