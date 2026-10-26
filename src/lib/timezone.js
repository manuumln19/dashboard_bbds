import { LOCATION } from "../config";
import { dateFormat } from "./intl";

export function deviceTimeZone() {
  try {
    return dateFormat({}).resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

// El reloj, el saludo y la agenda usan la hora del aparato. Si su zona no da
// la misma hora que LOCATION (el Frameo venía en America/New_York), todo sale
// desplazado; se compara la hora, no el nombre, para no avisar por alias.
export function timeZoneMismatch(now = new Date()) {
  try {
    const there = dateFormat({
      timeZone: LOCATION.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(now);
    const here = dateFormat({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
    return there === here ? null : { device: deviceTimeZone(), expected: LOCATION.timezone };
  } catch {
    return null;
  }
}
