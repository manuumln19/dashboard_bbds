import { absoluteHumidity, dewPoint } from "./weather";

export function getRoomReading(readings, roomId) {
  if (!Array.isArray(readings)) return null;
  return readings.find((reading) => reading.roomId === roomId) || null;
}

export function getHumidityStatus(room, humidity) {
  if (!Number.isFinite(humidity)) {
    return { level: "unknown", label: "Sin datos", tone: "muted" };
  }
  const min = room.targetMin ?? 40;
  const max = room.targetMax ?? 60;
  const alert = room.alertMax ?? 65;

  if (humidity > alert) {
    return { level: "alert", label: "Humedad alta", tone: "danger" };
  }
  if (humidity > max) {
    return { level: "warn", label: "Algo alta", tone: "warn" };
  }
  if (humidity < min) {
    return { level: "dry", label: "Aire seco", tone: "warn" };
  }
  return { level: "ok", label: "En rango", tone: "ok" };
}

export function getTemperatureStatus(room, temperature) {
  if (!Number.isFinite(temperature)) return null;
  if (Number.isFinite(room.minTemperature) && temperature < room.minTemperature) {
    return {
      level: "cold",
      label: `Frío para el instrumento (<${room.minTemperature}°)`,
    };
  }
  return null;
}

export function getMoldRisk(series, room) {
  const points = Array.isArray(series)
    ? series.filter((point) => Number.isFinite(point.humidity))
    : [];
  const threshold = room.alertMax ?? 65;
  const min = room.targetMin ?? 40;
  const max = room.targetMax ?? 60;

  if (points.length < 4) {
    return {
      level: "unknown",
      label: "Aún sin histórico",
      detail: "Necesitamos unas horas de datos para calcular el riesgo.",
      score: 0,
    };
  }

  const above = points.filter((point) => point.humidity > threshold).length;
  const aboveWarn = points.filter((point) => point.humidity > max).length;
  const highShare = above / points.length;
  const warnShare = aboveWarn / points.length;
  const average =
    points.reduce((sum, point) => sum + point.humidity, 0) / points.length;
  const latest = points[points.length - 1].humidity;

  if (highShare >= 0.25 || (latest > threshold && average > threshold)) {
    return {
      level: "high",
      label: "Riesgo alto",
      detail: `Ha pasado el ${Math.round(
        highShare * 100
      )}% del día por encima del ${threshold}%. Toca ventilar y revisar la ventilación.`,
      score: Math.min(1, 0.65 + highShare),
    };
  }

  if (warnShare >= 0.2 || latest > max) {
    return {
      level: "medium",
      label: "Vigilar",
      detail:
        average > 0
          ? `Media de ${Math.round(average)}%. Abre un poco si el aire de fuera está más seco.`
          : "La humedad ronda el límite alto.",
      score: 0.5,
    };
  }

  if (average < min) {
    return {
      level: "dry",
      label: "Aire seco",
      detail: `Media de ${Math.round(
        average
      )}%. Puede notarse en la garganta y en madera.`,
      score: 0.28,
    };
  }

  return {
    level: "low",
    label: "Bajo control",
    detail: `Media de ${Math.round(
      average
    )}%. La humedad se mantiene en una franja sana.`,
    score: 0.14,
  };
}

export function getVentilationAdvice(reading, outdoor) {
  if (!reading || !Number.isFinite(reading.humidity)) {
    return {
      level: "unknown",
      title: "Sin lectura interior",
      detail: "Cuando llegue el primer dato podremos comparar el aire.",
    };
  }

  const indoorHumidity = reading.humidity;
  if (indoorHumidity < 55) {
    return {
      level: "ok",
      title: "No hace falta ventilar",
      detail: "La humedad interior está por debajo del 55 %.",
    };
  }

  if (!outdoor || !Number.isFinite(outdoor.temperature)) {
    return {
      level: "unknown",
      title: "Humedad interior algo alta",
      detail: "No tenemos el tiempo exterior para comparar el aire ahora mismo.",
    };
  }

  const indoorAbsolute = absoluteHumidity(
    reading.temperature,
    reading.humidity
  );
  const outdoorAbsolute = absoluteHumidity(
    outdoor.temperature,
    outdoor.humidity
  );

  if (
    Number.isFinite(indoorAbsolute) &&
    Number.isFinite(outdoorAbsolute) &&
    outdoorAbsolute < indoorAbsolute - 0.8
  ) {
    return {
      level: "good",
      title: "Buen momento para ventilar",
      detail: `El aire de fuera está más seco (${outdoorAbsolute.toFixed(
        1
      )} g/m³ frente a ${indoorAbsolute.toFixed(
        1
      )} g/m³ dentro). Diez minutos bastan.`,
      indoorAbsolute,
      outdoorAbsolute,
    };
  }

  return {
    level: "warn",
    title: "Espera para ventilar",
    detail:
      Number.isFinite(indoorAbsolute) && Number.isFinite(outdoorAbsolute)
        ? `Fuera hay ${outdoorAbsolute.toFixed(
            1
          )} g/m³ y dentro ${indoorAbsolute.toFixed(
            1
          )} g/m³. Abrir ahora no bajaría la humedad.`
        : "El aire exterior no está más seco que el de casa.",
  };
}

export function getHomeHumiditySummary(latest, rooms) {
  const values = rooms
    .map((room) => ({ room, reading: getRoomReading(latest, room.id) }))
    .filter(({ reading }) => reading && Number.isFinite(reading.humidity));

  if (!values.length) {
    return {
      level: "unknown",
      title: "Esperando sensores",
      detail: "Aún no hay lecturas de humedad.",
    };
  }

  const highest = values.reduce((current, next) =>
    next.reading.humidity > current.reading.humidity ? next : current
  );
  const status = getHumidityStatus(highest.room, highest.reading.humidity);

  if (status.level === "alert") {
    return {
      level: "alert",
      title: `Humedad alta en ${highest.room.name.toLowerCase()}`,
      detail: `${Math.round(highest.reading.humidity)}%. Toca ventilar.`,
    };
  }
  if (status.level === "warn" || status.level === "dry") {
    return {
      level: "warn",
      title: `A vigilar en ${highest.room.name.toLowerCase()}`,
      detail: `${Math.round(highest.reading.humidity)}%. ${status.label}.`,
    };
  }
  return {
    level: "ok",
    title: "El aire está en rango",
    detail: `${Math.round(
      highest.reading.humidity
    )}% en ${highest.room.name.toLowerCase()}. Todo tranquilo.`,
  };
}

export function getAverageHumidity(series) {
  const values = (series || []).filter((point) =>
    Number.isFinite(point.humidity)
  );
  if (!values.length) return null;
  return (
    values.reduce((sum, point) => sum + point.humidity, 0) / values.length
  );
}

export function getHumidityTrend(series) {
  const points = (series || []).filter((point) =>
    Number.isFinite(point.humidity)
  );
  if (points.length < 2) return null;
  const first = points[0].humidity;
  const last = points[points.length - 1].humidity;
  return Math.round(last - first);
}

export function getDewPointForReading(reading) {
  if (!reading) return null;
  return dewPoint(reading.temperature, reading.humidity);
}
