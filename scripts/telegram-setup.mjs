// Conecta el bot de Telegram con el Worker (una sola vez, o al cambiar de URL
// o de secreto): le dice a Telegram adónde mandar los mensajes y qué comandos
// enseñar. Lee de las variables de entorno:
//   TELEGRAM_BOT_TOKEN       el token que da @BotFather
//   TELEGRAM_WEBHOOK_SECRET  el mismo que guardaste en el Worker
//   BBDS_URL                 la URL del Worker, p. ej. https://bbds.tu-cuenta.workers.dev
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = String(process.env.BBDS_URL || "").replace(/\/+$/, "");

if (!token || !secret || !base) {
  console.error("Faltan TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET o BBDS_URL.");
  process.exit(1);
}
if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
  console.error("TELEGRAM_WEBHOOK_SECRET solo admite letras, números, _ y - (hasta 256).");
  process.exit(1);
}

async function call(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data.result;
}

const me = await call("getMe", {});
await call("setWebhook", {
  url: `${base}/api/telegram`,
  secret_token: secret,
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: true,
});
await call("setMyCommands", {
  commands: [
    { command: "lista", description: "La compra por pasillos" },
    { command: "t", description: "Apuntar una tarea (hoy, mañana o sin fecha)" },
    { command: "ayuda", description: "Qué sabe hacer el bot" },
  ],
});
console.log(`Listo: @${me.username} manda los mensajes a ${base}/api/telegram`);
