// BBDS · Bot de Telegram para la compra y las tareas.
// Telegram llama a POST /api/telegram con cada mensaje (webhook). Solo se
// atiende si trae la cabecera secreta y lo manda alguien de
// TELEGRAM_USERS (ids de Telegram separados por comas). Escribe en las
// mismas tablas que la pantalla, así que lo que se tacha aquí desaparece de
// la pared en el siguiente sondeo.
//
//   /lista            la compra por pasillos, con un botón por cosa
//   leche, pan y sal  texto suelto: se apunta en la compra
//   /t bajar la basura mañana   una tarea suelta (hoy, mañana o sin fecha)
import { AISLES, aisleFor } from "../src/lib/aisles.js";
import { BILL_KINDS, billStatus, compareBill, formatMoney, parseAmount } from "../src/lib/bills.js";
import { billLine, createBill, dailyNotices, madridDay, pendingBills, setPayment } from "./bills.js";

const API = "https://api.telegram.org/bot";
const MAX_ITEMS = 20;
const MAX_TEXT = 160;
const HELP = [
  "Soy el bot de BBDS.",
  "",
  "/lista · la compra por pasillos; toca una cosa para tacharla",
  "Escribe «leche, huevos y pan» para apuntarlo en la compra",
  "/t bajar la basura mañana · una tarea (hoy, mañana o sin fecha)",
  "/facturas · lo pendiente de pagar; toca tu nombre al pagar tu parte",
  "/factura luz 62,40 · apunta una factura de este mes (luz, agua, basura, gas, internet, comunidad u otro)",
].join("\n");

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// "123,456" → los ids de Telegram que pueden usar el bot.
function knownUsers(env) {
  return String(env.TELEGRAM_USERS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

async function telegram(env, method, payload) {
  // TELEGRAM_API solo para probar en local contra un Telegram simulado.
  const response = await fetch(`${env.TELEGRAM_API || API}${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    // «message is not modified» al pulsar Actualizar sin cambios: no es un fallo.
    const detail = await response.text();
    if (!detail.includes("message is not modified")) console.error("Telegram", method, response.status, detail);
  }
}

// Fecha de Madrid (YYYY-MM-DD), con `days` de más.
function madridDate(days = 0) {
  const at = new Date(Date.now() + days * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

// «leche, huevos y pan» → ["leche", "huevos", "pan"]. La «y» solo separa
// cuando hay comas: «Tomates y albahaca» sola es una cosa.
function splitItems(text) {
  const raw = String(text);
  const separator = /[\n,;]/.test(raw) ? /\n|,|;|\s+y\s+/i : /\n/;
  return raw
    .split(separator)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .map((part) => part.slice(0, MAX_TEXT))
    .slice(0, MAX_ITEMS);
}

// ["Leche", "Huevos", "Pan"] → «leche, huevos y pan» (la primera, como está).
function joinList(items) {
  const words = items.map((item, index) => (index ? item.charAt(0).toLowerCase() + item.slice(1) : item));
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} y ${words[words.length - 1]}` : words[0];
}

async function shoppingItems(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, text, done FROM list_items WHERE list_id = 'shopping' ORDER BY created_at ASC, id ASC"
  ).all();
  return (results || []).map((row) => ({ id: row.id, text: row.text, done: Boolean(row.done) }));
}

// El mensaje de la lista: pasillos en el texto y un botón por cosa (lo
// tachado, con ✓, se puede desmarcar). Abajo, actualizar y quitar tachados.
function listMessage(items) {
  const open = items.filter((item) => !item.done);
  const done = items.filter((item) => item.done);
  const lines = [`<b>Compra · ${open.length} ${open.length === 1 ? "pendiente" : "pendientes"}</b>`];
  const keyboard = [];

  AISLES.forEach((aisle) => {
    const here = open.filter((item) => aisleFor(item.text) === aisle.id);
    if (!here.length) return;
    lines.push("", `<b>${escapeHtml(aisle.label.toUpperCase())}</b>`, escapeHtml(here.map((item) => item.text).join(" · ")));
    for (let index = 0; index < here.length; index += 2) {
      keyboard.push(here.slice(index, index + 2).map((item) => ({ text: item.text.slice(0, 40), callback_data: `t:${item.id}` })));
    }
  });
  if (!open.length) lines.push("", "No falta nada.");

  if (done.length) {
    lines.push("", `<s>${escapeHtml(done.map((item) => item.text).join(" · "))}</s>`);
    for (let index = 0; index < done.length; index += 3) {
      keyboard.push(done.slice(index, index + 3).map((item) => ({ text: `✓ ${item.text.slice(0, 30)}`, callback_data: `t:${item.id}` })));
    }
  }
  keyboard.push([
    { text: "Actualizar", callback_data: "r" },
    ...(done.length ? [{ text: "Quitar tachados", callback_data: "c" }] : []),
  ]);
  return { text: lines.join("\n"), parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard } };
}

async function sendList(env, chatId) {
  await telegram(env, "sendMessage", { chat_id: chatId, ...listMessage(await shoppingItems(env)) });
}

async function addShopping(env, chatId, text) {
  const wanted = splitItems(text);
  if (!wanted.length) return;
  const items = await shoppingItems(env);
  const pending = new Set(items.filter((item) => !item.done).map((item) => item.text.toLowerCase()));
  const added = [];
  const already = [];
  const now = new Date().toISOString();
  const inserts = [];
  wanted.forEach((entry) => {
    const key = entry.toLowerCase();
    if (pending.has(key)) {
      already.push(entry);
      return;
    }
    pending.add(key);
    added.push(entry);
    inserts.push(
      env.DB.prepare(
        "INSERT INTO list_items (list_id, text, done, created_at, updated_at) VALUES ('shopping', ?, 0, ?, ?)"
      ).bind(entry, now, now)
    );
  });
  if (inserts.length) await env.DB.batch(inserts);
  const parts = [];
  if (added.length) parts.push(`Apuntado: ${joinList(added)}.`);
  if (already.length) parts.push(`Ya estaba: ${joinList(already)}.`);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: parts.join(" "),
    reply_markup: { inline_keyboard: [[{ text: "Ver la lista", callback_data: "l" }]] },
  });
}

// «/t bajar la basura mañana» → tarea libre para mañana. Sin «hoy» ni
// «mañana» al final, queda para cuando sea.
async function addTask(env, chatId, text) {
  let title = String(text).replace(/\s+/g, " ").trim();
  let dueOn = null;
  const when = title.match(/\s+(hoy|mañana|manana)$/i);
  if (when) {
    dueOn = madridDate(when[1].toLowerCase() === "hoy" ? 0 : 1);
    title = title.slice(0, when.index).trim();
  }
  if (!title) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "Escribe la tarea después de /t, por ejemplo: /t bajar la basura mañana" });
    return;
  }
  title = (title.charAt(0).toUpperCase() + title.slice(1)).slice(0, MAX_TEXT);
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO list_items (list_id, text, done, due_on, created_at, updated_at) VALUES ('tasks', ?, 0, ?, ?, ?)"
  )
    .bind(title, dueOn, now, now)
    .run();
  const label = !dueOn ? "para cuando sea" : dueOn === madridDate(0) ? "para hoy" : "para mañana";
  await telegram(env, "sendMessage", { chat_id: chatId, text: `Tarea apuntada ${label}: ${title}. Está en Tareas, libre para quien la haga.` });
}

// Cuentas: lo pendiente, con un botón por persona en cada factura para
// marcar (o desmarcar) su parte.
async function billsMessage(env) {
  const { people, bills, pending } = await pendingBills(env);
  const lines = [`<b>Cuentas · ${pending.length ? `${pending.length} por pagar` : "todo pagado"}</b>`];
  const keyboard = [];
  pending.forEach((bill) => {
    lines.push("", billLine(bill, people, bills));
    const status = billStatus(bill, people);
    keyboard.push(
      people.map((person) => ({
        text: `${status.paid.has(person.id) ? "✓" : "☐"} ${person.name} · ${bill.kind}`,
        callback_data: `p:${bill.id}:${person.id}`,
      }))
    );
  });
  if (!pending.length) lines.push("", "No hay nada pendiente.");
  keyboard.push([{ text: "Actualizar", callback_data: "f" }]);
  return { text: lines.join("\n"), parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard } };
}

// «/factura luz 62,40» → factura de este mes, a medias.
async function addBill(env, chatId, text) {
  const match = String(text).trim().match(/^(\S+)\s+([\d.,]+)\s*€?$/);
  const kind = match ? match[1].toLowerCase().replace("otra", "otro") : "";
  const amount = match ? parseAmount(match[2]) : null;
  if (!BILL_KINDS.some((item) => item.id === kind) || !amount) {
    await telegram(env, "sendMessage", {
      chat_id: chatId,
      text: `Escribe el tipo y el importe, por ejemplo: /factura luz 62,40\nTipos: ${BILL_KINDS.map((item) => item.id).join(", ")}.`,
    });
    return;
  }
  await createBill(env, { kind, period: madridDay().slice(0, 7), amount });
  const { people, bills } = await pendingBills(env);
  const bill = bills.find((item) => item.kind === kind && item.period === madridDay().slice(0, 7) && Number(item.amount) === amount);
  const compare = bill ? compareBill(bill, bills) : null;
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: [
      `Apuntada: ${kind} de este mes, ${formatMoney(amount)} (${formatMoney(amount / Math.max(1, people.length))} cada uno).`,
      compare ? `${compare.alert ? "⚠️ Ojo: " : ""}${compare.label}.` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    reply_markup: { inline_keyboard: [[{ text: "Ver cuentas", callback_data: "f" }]] },
  });
}

async function onCallback(env, query) {
  const data = String(query.data || "");
  const message = query.message;
  let notice = "";

  // Cuentas: pagar (o deshacer) la parte de alguien, o ver lo pendiente.
  if (data === "f" || data.startsWith("p:")) {
    if (data.startsWith("p:")) {
      const [, billId, personId] = data.split(":");
      const { bills, people } = await pendingBills(env);
      const bill = bills.find((item) => item.id === billId);
      if (bill) {
        const paid = billStatus(bill, people).paid.has(personId);
        await setPayment(env, billId, personId, !paid);
        const person = people.find((item) => item.id === personId);
        notice = `${person ? person.name : "Hecho"}: ${paid ? "vuelve a pendiente" : "pagado"}`;
      } else {
        notice = "Ya no está";
      }
    }
    await telegram(env, "answerCallbackQuery", { callback_query_id: query.id, text: notice || undefined });
    if (!message) return;
    if (data === "f" && message.text && !message.text.startsWith("Cuentas")) {
      await telegram(env, "sendMessage", { chat_id: message.chat.id, ...(await billsMessage(env)) });
      return;
    }
    await telegram(env, "editMessageText", { chat_id: message.chat.id, message_id: message.message_id, ...(await billsMessage(env)) });
    return;
  }

  if (data.startsWith("t:")) {
    const id = Number(data.slice(2));
    const row = await env.DB.prepare("SELECT id, text, done FROM list_items WHERE id = ? AND list_id = 'shopping'").bind(id).first();
    if (row) {
      const done = row.done ? 0 : 1;
      const now = new Date().toISOString();
      await env.DB.prepare("UPDATE list_items SET done = ?, done_at = ?, updated_at = ? WHERE id = ?")
        .bind(done, done ? now : null, now, id)
        .run();
      notice = done ? `Tachado: ${row.text}` : `Vuelve a la lista: ${row.text}`;
    } else {
      notice = "Ya no está en la lista";
    }
  } else if (data === "c") {
    await env.DB.prepare("DELETE FROM list_items WHERE list_id = 'shopping' AND done = 1").run();
    notice = "Tachados quitados";
  }

  await telegram(env, "answerCallbackQuery", { callback_query_id: query.id, text: notice || undefined });
  if (!message) return;
  if (data === "l") {
    await sendList(env, message.chat.id);
    return;
  }
  await telegram(env, "editMessageText", {
    chat_id: message.chat.id,
    message_id: message.message_id,
    ...listMessage(await shoppingItems(env)),
  });
}

async function onMessage(env, message) {
  const chatId = message.chat.id;
  const text = String(message.text || "").trim();
  if (!text) return;
  // En grupos, los comandos llegan como «/lista@NombreDelBot».
  const command = text.match(/^\/([a-z]+)(?:@\w+)?\s*([\s\S]*)$/i);
  if (command) {
    const name = command[1].toLowerCase();
    const rest = command[2].trim();
    if (name === "lista" || name === "compra") {
      if (rest) await addShopping(env, chatId, rest);
      else await sendList(env, chatId);
    } else if (name === "t" || name === "tarea") {
      await addTask(env, chatId, rest);
    } else if (name === "facturas" || name === "cuentas") {
      await telegram(env, "sendMessage", { chat_id: chatId, ...(await billsMessage(env)) });
    } else if (name === "factura") {
      await addBill(env, chatId, rest);
    } else if (name === "id") {
      // Para TELEGRAM_CHAT_ID: adónde manda el bot los avisos de cada mañana.
      await telegram(env, "sendMessage", { chat_id: chatId, text: `Este chat es ${chatId}. Guárdalo en TELEGRAM_CHAT_ID para recibir aquí los avisos de Cuentas.` });
    } else {
      await telegram(env, "sendMessage", { chat_id: chatId, text: HELP });
    }
    return;
  }
  await addShopping(env, chatId, text);
}

// Cada mañana (cron): resumen del mes el día 1, alquiler pendiente y
// facturas que vencen. Va al chat de TELEGRAM_CHAT_ID (el grupo de casa).
export async function sendDailyNotices(env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    const text = await dailyNotices(env);
    if (!text) return;
    await telegram(env, "sendMessage", {
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "Ver cuentas", callback_data: "f" }]] },
    });
  } catch (error) {
    console.error("BBDS avisos", error);
  }
}

export async function handleTelegram(request, env) {
  // Sin configurar, la ruta no existe.
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET || request.method !== "POST") {
    return new Response("Not found", { status: 404 });
  }
  const secret = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!safeEqual(secret, env.TELEGRAM_WEBHOOK_SECRET)) return new Response("Forbidden", { status: 403 });

  let update;
  try {
    update = await request.json();
  } catch {
    return new Response("ok");
  }
  const query = update.callback_query;
  const message = update.message;
  const from = (query && query.from) || (message && message.from);
  if (!from) return new Response("ok");

  // Siempre 200: si Telegram recibe un error, reintenta el mismo mensaje.
  try {
    const users = knownUsers(env);
    if (users.indexOf(String(from.id)) === -1) {
      // A un desconocido solo se le dice su id, para poder darlo de alta.
      if (message && message.chat.type === "private") {
        await telegram(env, "sendMessage", {
          chat_id: message.chat.id,
          text: `No te conozco todavía. Tu id de Telegram es ${from.id}: añádelo a TELEGRAM_USERS en el Worker.`,
        });
      } else if (query) {
        await telegram(env, "answerCallbackQuery", { callback_query_id: query.id, text: "Este bot es solo de casa" });
      }
      return new Response("ok");
    }
    if (query) await onCallback(env, query);
    else if (message) await onMessage(env, message);
  } catch (error) {
    console.error("BBDS Telegram", error);
  }
  return new Response("ok");
}
