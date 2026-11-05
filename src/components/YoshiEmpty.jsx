import { YOSHI_SPRITES } from "./Yoshi";

// Cuando no queda nada (compra, tareas, cuentas, el día), Yoshi en una pose
// propia en vez de un texto gris: el vacío también es buena noticia.
export function YoshiEmpty({ pose = "happy", title, text }) {
  return (
    <div className="yoshi-empty">
      <img src={YOSHI_SPRITES[pose] || YOSHI_SPRITES.happy} alt="" width={88} height={88} />
      <strong>{title}</strong>
      {text ? <span>{text}</span> : null}
    </div>
  );
}
