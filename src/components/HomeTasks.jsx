import { ArrowUpRight, ShoppingBasket, Sparkles } from "lucide-react";
import { isLegacyDrawing } from "../lib/listItems";
import { CheckMark } from "./CheckMark";

export function HomeTasks({ items, onToggle, onOpen }) {
  const shopping = items.filter((item) => item.listId === "shopping");
  const tasks = items.filter((item) => item.listId === "tasks");
  const shoppingOpen = shopping.filter((item) => !item.done).length;
  const shoppingDone = shopping.length - shoppingOpen;
  const openTasks = tasks.filter((item) => !item.done).slice(0, 3);
  const taskOpen = tasks.filter((item) => !item.done).length;
  const progress = shopping.length
    ? Math.round((shoppingDone / shopping.length) * 100)
    : 0;

  return (
    <article className="card home-tasks">
      <header className="home-tasks__head">
        <div>
          <span className="eyebrow">En casa</span>
          <h2>Pendientes</h2>
        </div>
        <span className="home-tasks__count-pill">
          <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
          {taskOpen}
        </span>
      </header>

      <div className="home-tasks__shopping">
        <div className="home-tasks__number">
          <strong>{shoppingOpen}</strong>
          <span>{shoppingOpen === 1 ? "cosa" : "cosas"}</span>
        </div>
        <div className="home-tasks__shopping-copy">
          <span className="home-tasks__shopping-title">
            <ShoppingBasket size={16} strokeWidth={1.8} aria-hidden="true" />
            Para la compra
          </span>
          <div className="home-tasks__progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>
            {shoppingDone} de {shopping.length} hechas
          </small>
        </div>
      </div>

      <div className="home-tasks__list-head">
        <span>Tareas de casa</span>
        <span>{taskOpen} abiertas</span>
      </div>

      {openTasks.length ? (
        <ul className="home-task-list">
          {openTasks.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="home-task"
                onClick={() => onToggle(item)}
                aria-label={`Marcar como hecho: ${item.text}`}
              >
                <CheckMark />
                {isLegacyDrawing(item) ? (
                  <img
                    className="home-task__drawing"
                    src={item.drawing}
                    alt={item.text}
                  />
                ) : (
                  <span>{item.text}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="home-tasks__empty">
          <strong>Todo hecho por aquí.</strong>
          <span>Disfruta del sofá.</span>
        </div>
      )}

      <button type="button" className="home-tasks__link" onClick={onOpen}>
        Abrir listas
        <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </article>
  );
}
