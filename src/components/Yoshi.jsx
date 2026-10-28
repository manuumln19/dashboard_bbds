import { memo, useEffect, useRef, useState } from "react";
import { LITE_MODE } from "../lib/perf";
import { listenYoshi, parseDoneState } from "../lib/yoshiTalk";
import blinkSrc from "../assets/yoshi/blink.webp";
import cheerSrc from "../assets/yoshi/cheer.webp";
import coldSrc from "../assets/yoshi/cold.webp";
import cumpleSrc from "../assets/yoshi/cumple.webp";
import dizzySrc from "../assets/yoshi/dizzy.webp";
import halloweenSrc from "../assets/yoshi/halloween.webp";
import happySrc from "../assets/yoshi/happy.webp";
import hotSrc from "../assets/yoshi/hot.webp";
import hungrySrc from "../assets/yoshi/hungry.webp";
import idleSrc from "../assets/yoshi/idle.webp";
import navidadSrc from "../assets/yoshi/navidad.webp";
import rainSrc from "../assets/yoshi/rain.webp";
import runSrc from "../assets/yoshi/run.webp";
import sleepSrc from "../assets/yoshi/sleep.webp";
import stretchSrc from "../assets/yoshi/stretch.webp";
import trophySrc from "../assets/yoshi/trophy.webp";

// Sprites de 192 x 192 al estilo Yoshi's Island, todos mirando a la derecha
// y con los pies a la misma altura (src/assets/yoshi, ver
// scripts/yoshi-sprites.cjs). Se cambia el `src`: sin re-renders por fotograma.
export const YOSHI_SPRITES = {
  idle: idleSrc,
  blink: blinkSrc,
  stretch: stretchSrc,
  dizzy: dizzySrc,
  happy: happySrc,
  cheer: cheerSrc,
  run: runSrc,
  sleep: sleepSrc,
  rain: rainSrc,
  cold: coldSrc,
  hot: hotSrc,
  hungry: hungrySrc,
  trophy: trophySrc,
  halloween: halloweenSrc,
  navidad: navidadSrc,
  cumple: cumpleSrc,
};

const COSTUMES = { spooky: "halloween", halloween: "halloween", navidad: "navidad", cumple: "cumple" };

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

const TAP_LINES = {
  idle: ["¡Yoshi!", "¡Mlem!", "¿Jugamos?", "¡Hop, hop!", "¡Vamos, equipo!", "¿Has visto las notas?", "¡Hola, hola!"],
  hungry: ["¿Qué hay de comer?", "Huele a comida…", "¿Hay manzanas?", "Me como lo que sobre."],
  rain: ["¡Coge paraguas!", "Hoy no salgo sin él.", "Plic, plic, plic…"],
  cold: ["Brrr… ¡qué frío!", "Chaqueta, ¿eh?", "Me quedo en la manta."],
  hot: ["¡Uf, qué calor!", "Agua, mucha agua.", "Persianas abajo."],
  sleep: ["Zzz… cinco minutos más.", "Mmm… ¿ya es de día?", "¡Shhh! Que duermo."],
};

const HAPPY_LINES = ["¡Bien hecho!", "¡Una menos!", "¡Así se hace!", "¡Puntos!", "¡Toma ya!"];
const LOVE_LINES = ["¡Mimos!", "¡Qué gustito!", "Más, más…", "¡Te quiero!"];
const IDLE_LINES = ["Mmmh…", "¿Alguien tiene manzanas?", "¡Qué bien se está aquí!", "♪ La, la, la ♪"];

// Cómo está Yoshi: duerme de noche, saca el paraguas si llueve, bufanda con
// frío y abanico con calor; a la hora de comer o cenar, con hambre.
export function yoshiMood({ now, weather, isNight }) {
  const hour = now.getHours();
  if (isNight || hour >= 23 || hour < 7) return "sleep";
  const current = weather && weather.current ? weather.current : null;
  if (current && RAIN_CODES.has(Number(current.weatherCode))) return "rain";
  if (current && Number(current.temperature) <= 10) return "cold";
  if (current && Number(current.temperature) >= 31) return "hot";
  if ((hour >= 13 && hour < 15) || (hour >= 20 && hour < 22)) return "hungry";
  return "idle";
}

function restingSprite(mood, seasonId, holding) {
  if (holding === "trophy") return "trophy";
  if (mood === "idle") return COSTUMES[seasonId] || "idle";
  return YOSHI_SPRITES[mood] ? mood : "idle";
}

function pick(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

const HUNGRY_LINES = ["Tengo hambre… ¿y si hacéis una tarea? 🍎", "Una manzanita por tarea, ¿eh?", "Mi barriga ruge…"];
const FULL_LINES = ["¡Estoy lleno! Qué bien me cuidáis.", "Ñam… no me cabe ni una manzana más.", "¡Qué equipo! Hoy como como un rey."];
const MORNING_LINES = ["¡Buenos días!", "¡Buenos días! ¿Café?", "¡Arriba, que ya es de día!"];
const APPLES_MAX = 12;
const APPLES_FULL = 5;
const APPLES_KEY = "bbds.yoshi.apples";
const MORNING_KEY = "bbds.yoshi.morning";

function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function readStore(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function writeStore(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento, Yoshi olvida al recargar; nada más.
  }
}

// Manzanas de hoy: una por tarea hecha, apuntando cuál («c:3», «l:…») para
// devolverla si se desmarca. Se reinician cada día. `extra` son las guardadas
// antes de apuntar la tarea: cuentan, pero no se pueden devolver.
function todayEaten() {
  const saved = readStore(APPLES_KEY);
  if (!saved || saved.day !== dayKey()) return { keys: [], extra: 0 };
  if (!Array.isArray(saved.keys)) return { keys: [], extra: Number(saved.apples) || 0 };
  return { keys: saved.keys, extra: Number(saved.extra) || 0 };
}

function todayApples() {
  const eaten = todayEaten();
  return Math.min(APPLES_MAX, eaten.keys.length + eaten.extra);
}

// Cada cuánto parpadea y hace algo solo. En el marco (modo ligero), menos:
// cada cambio de pose es un repintado.
const BLINK_MS = LITE_MODE ? [9000, 7000] : [3200, 3600];
const IDLE_MS = LITE_MODE ? [35000, 30000] : [12000, 13000];

// Gestos por su cuenta cuando nadie le hace caso.
const IDLE_ACTIONS = ["hop", "turn", "stretch", "hop", "turn", "talk"];
const LONG_PRESS_MS = 650;

// La mascota de la casa. Respira, hace cosas solo, reacciona a los toques
// (uno, varios seguidos o mantener pulsado) y celebra cuando `cheer` sube.
// `greet` saluda al cambiar; `away` lo esconde mientras está de paseo y
// `onWander` lo manda de paseo cuando se harta de toques. El Yoshi de la
// barra es el de casa (`main`): habla de lo que pasa (`house`), come una
// manzana por tarea, da los buenos días y se alegra con las notas nuevas.
export const Yoshi = memo(function Yoshi({
  mood = "idle",
  seasonId,
  cheer = 0,
  size = 112,
  holding = null,
  line: fixedLine = null,
  greet = 0,
  away = false,
  onWander,
  lively = true,
  main = false,
  house = [],
}) {
  const [action, setAction] = useState(null);
  const [line, setLine] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const actionTimer = useRef(0);
  const idleTimer = useRef(0);
  const pressTimer = useRef(0);
  const pressed = useRef(false);
  const taps = useRef([]);
  const lastCheer = useRef(null);
  const lastGreet = useRef(greet);
  const flippedRef = useRef(false);
  const [apples, setApples] = useState(() => (main ? todayApples() : 0));
  const houseRef = useRef(house);
  houseRef.current = house;
  const applesRef = useRef(apples);
  applesRef.current = apples;

  const asleep = mood === "sleep";
  // Sin una sola manzana pasado el mediodía, tiene hambre aunque haga bueno.
  const starving = main && !asleep && mood === "idle" && apples === 0 && new Date().getHours() >= 12;
  const full = main && apples >= APPLES_FULL;
  const resting = starving ? "hungry" : restingSprite(mood, seasonId, holding);
  const [blinking, setBlinking] = useState(false);
  const blinkTimer = useRef(0);
  const sprite =
    action === "happy"
      ? "happy"
      : action === "dizzy"
        ? "dizzy"
        : action === "cheer" || action === "love"
          ? "cheer"
          : action === "eat"
            ? "hungry"
          : action === "stretch" || action === "wake"
            ? "stretch"
            : action === "run"
              ? "run"
              : blinking && resting === "idle"
                ? "blink"
                : resting;
  const canBlink = lively && resting === "idle" && !action && !away;

  function act(next, text, ms = 2400) {
    window.clearTimeout(actionTimer.current);
    setAction(next);
    setLine(text || null);
    actionTimer.current = window.setTimeout(() => {
      setAction(null);
      setLine(null);
    }, ms);
  }

  function face(value) {
    flippedRef.current = value;
    setFlipped(value);
  }

  // Celebra cada tarea marcada; el de casa, además, se come una manzana y la
  // devuelve si la tarea se desmarca. `cheer` es el estado de cada tarea (ver
  // doneState) y llega null mientras cargan los datos: lo que ya estaba hecho
  // al cargar no cuenta como nuevo.
  useEffect(() => {
    if (cheer === null || cheer === undefined) return;
    const state = parseDoneState(cheer);
    const before = lastCheer.current;
    lastCheer.current = state;
    const marked = before ? Object.keys(state).filter((key) => state[key] && !before[key]) : [];

    if (!main) {
      if (marked.length) {
        const count = Object.keys(state).filter((key) => state[key]).length;
        act(count % 2 ? "cheer" : "happy", HAPPY_LINES[count % HAPPY_LINES.length]);
      }
      return;
    }

    const eaten = todayEaten();
    // Tareas que siguen ahí pero ya no están hechas: su manzana fuera. También
    // al cargar, por si se desmarcó con la pantalla apagada. Una tarea borrada
    // ya no aparece y conserva la suya.
    const returned = eaten.keys.filter((key) => key in state && !state[key]);
    const fresh = marked.filter((key) => !eaten.keys.includes(key));
    if (!returned.length && !fresh.length) return;

    const keys = eaten.keys.filter((key) => !returned.includes(key));
    fresh.forEach((key) => {
      if (keys.length + eaten.extra < APPLES_MAX) keys.push(key);
    });
    writeStore(APPLES_KEY, { day: dayKey(), keys, extra: eaten.extra });
    const next = Math.min(APPLES_MAX, keys.length + eaten.extra);
    setApples(next);
    if (fresh.length) {
      act("eat", next >= APPLES_FULL ? `¡Ñam! ${next} 🍎 ¡Qué lleno!` : `¡Ñam! Van ${next} 🍎`, 2400);
    } else if (before) {
      act("dizzy", next ? `¿Me quitáis una? Me quedan ${next} 🍎` : "¡Eh, mi manzana! 🍎", 2400);
    }
  }, [cheer, main]);

  // Notas nuevas: se alegran todos los Yoshis a la vista (el del resumen
  // incluido, por si está abierto).
  useEffect(() => {
    if (!lively) return undefined;
    return listenYoshi((type) => {
      if (type === "note") act("cheer", pick(["¡Nota nueva en la nevera! 📌", "¡Uy, una nota! A ver qué pone…", "¡Correo en la nevera!"]), 2800);
    });
  }, [lively]);

  // A medianoche las manzanas vuelven a cero.
  useEffect(() => {
    if (!main) return undefined;
    const timer = window.setInterval(() => {
      const value = todayApples();
      if (value !== applesRef.current) setApples(value);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [main]);

  // Saluda al volver del salvapantallas o de un paseo.
  useEffect(() => {
    if (greet > lastGreet.current && !asleep) act("happy", pick(["¡Hola de nuevo!", "¡Ya estoy aquí!", "¿Me echabais de menos?"]), 2600);
    lastGreet.current = greet;
  }, [greet, asleep]);

  // Vida propia: cada 12–25 s (35–65 s en el marco) hace algo, si nadie le toca.
  useEffect(() => {
    if (!lively || away) return undefined;
    function schedule() {
      idleTimer.current = window.setTimeout(() => {
        if (!pressed.current) {
          if (asleep) {
            act("snore", null, 2600);
          } else {
            const next = pick(IDLE_ACTIONS);
            if (next === "turn") {
              face(!flippedRef.current);
            } else if (next === "stretch") {
              act("stretch", Math.random() < 0.4 ? "Aaah… (bostezo)" : null, 1800);
            } else if (next === "talk") {
              const own = houseRef.current;
              act("hop", own.length && Math.random() < 0.6 ? pick(own) : pick(IDLE_LINES), 3000);
            } else {
              act("hop", null, 700);
            }
          }
        }
        schedule();
      }, IDLE_MS[0] + Math.random() * IDLE_MS[1]);
    }
    schedule();
    return () => window.clearTimeout(idleTimer.current);
  }, [lively, away, asleep]);

  // Parpadeo: solo el sprite normal tiene su pareja con los ojos cerrados.
  useEffect(() => {
    if (!canBlink) return undefined;
    new Image().src = YOSHI_SPRITES.blink;
    let close = 0;
    function next() {
      blinkTimer.current = window.setTimeout(() => {
        setBlinking(true);
        close = window.setTimeout(() => {
          setBlinking(false);
          next();
        }, 140);
      }, BLINK_MS[0] + Math.random() * BLINK_MS[1]);
    }
    next();
    return () => {
      window.clearTimeout(blinkTimer.current);
      window.clearTimeout(close);
      setBlinking(false);
    };
  }, [canBlink]);

  // Las poses se precargan un rato después de arrancar: la primera vez que
  // cambiaba de pose decodificaba la imagen justo al tocarlo.
  useEffect(() => {
    if (!main) return undefined;
    const timer = window.setTimeout(() => {
      Object.keys(YOSHI_SPRITES).forEach((name) => {
        const image = new Image();
        image.src = YOSHI_SPRITES[name];
        if (typeof image.decode === "function") image.decode().catch(() => {});
      });
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [main]);

  useEffect(
    () => () => {
      window.clearTimeout(actionTimer.current);
      window.clearTimeout(idleTimer.current);
      window.clearTimeout(pressTimer.current);
    },
    []
  );

  function tap() {
    const now = Date.now();
    taps.current = taps.current.filter((at) => now - at < 2500).concat(now);
    const count = taps.current.length;
    if (asleep) {
      act("wake", pick(TAP_LINES.sleep), 2200);
      return;
    }
    if (count >= 7 && onWander) {
      taps.current = [];
      act("run", "¡Me voy a dar una vuelta!", 1200);
      window.setTimeout(onWander, 1100);
      return;
    }
    if (count >= 5) {
      act("dizzy", "¡Vale ya! 😤", 2200);
      return;
    }
    if (count >= 3) {
      act("dizzy", "¡Me mareo!", 1800);
      return;
    }
    // La primera vez que se le toca por la mañana, los buenos días.
    if (main) {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 12 && readStore(MORNING_KEY) !== dayKey()) {
        writeStore(MORNING_KEY, dayKey());
        act("happy", pick(MORNING_LINES), 2600);
        return;
      }
    }
    if (starving && Math.random() < 0.6) {
      act("happy", pick(HUNGRY_LINES), 2800);
      return;
    }
    if (full && Math.random() < 0.3) {
      act("cheer", pick(FULL_LINES), 2800);
      return;
    }
    if (house.length && Math.random() < 0.65) {
      act("happy", pick(house), 3200);
      return;
    }
    act("happy", pick(TAP_LINES[mood] || TAP_LINES.idle));
  }

  function pointerDown() {
    pressed.current = true;
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = 0;
      act("love", pick(LOVE_LINES), 2600);
    }, LONG_PRESS_MS);
  }

  function pointerUp() {
    pressed.current = false;
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = 0;
      tap();
    }
  }

  function pointerCancel() {
    pressed.current = false;
    window.clearTimeout(pressTimer.current);
    pressTimer.current = 0;
  }

  const bubble = line || fixedLine;

  return (
    <button
      type="button"
      className={`yoshi yoshi--${action || (asleep ? "sleep" : "rest")}${away ? " is-away" : ""}`}
      onPointerDown={pointerDown}
      onPointerUp={pointerUp}
      onPointerLeave={pointerCancel}
      onPointerCancel={pointerCancel}
      onContextMenu={(event) => event.preventDefault()}
      aria-label="Yoshi"
      style={{ width: size, height: size }}
    >
      {bubble && !away ? (
        <span className="yoshi__bubble" key={bubble}>
          {bubble}
        </span>
      ) : null}
      {action === "love" ? (
        <span className="yoshi__hearts" aria-hidden="true">
          <i>❤</i>
          <i>❤</i>
          <i>❤</i>
        </span>
      ) : null}
      {away ? (
        <span className="yoshi__away">
          <b aria-hidden="true">🐾</b>
          De paseo…
        </span>
      ) : null}
      {main && apples > 0 && !away ? (
        <span className="yoshi__apples" title="Manzanas de hoy">
          🍎 {apples}
        </span>
      ) : null}
      {asleep && !action ? (
        <span className="yoshi__zzz" aria-hidden="true">
          <i>z</i>
          <i>z</i>
          <i>Z</i>
        </span>
      ) : null}
      <span className="yoshi__shadow" aria-hidden="true" />
      <span className="yoshi__body">
        <img
          className={`yoshi__img${flipped ? " is-flipped" : ""}`}
          src={YOSHI_SPRITES[sprite]}
          alt=""
          width={size}
          height={size}
          draggable="false"
        />
      </span>
    </button>
  );
});

// El paseo: Yoshi sale de la barra y cruza la pantalla corriendo por abajo.
export function YoshiStroll({ onDone }) {
  return (
    <div className="yoshi-stroll" aria-hidden="true" onAnimationEnd={onDone}>
      <img src={YOSHI_SPRITES.run} alt="" width={120} height={120} draggable="false" />
    </div>
  );
}
