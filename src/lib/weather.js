import { LOCATION } from "../config";

const WEATHER_LABELS = {
  0: "Despejado",
  1: "Casi despejado",
  2: "Intervalos nubosos",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla helada",
  51: "Llovizna débil",
  53: "Llovizna",
  55: "Llovizna intensa",
  56: "Llovizna helada",
  57: "Llovizna helada",
  61: "Lluvia débil",
  63: "Lluvia",
  65: "Lluvia intensa",
  66: "Lluvia helada",
  67: "Lluvia helada",
  71: "Nieve débil",
  73: "Nieve",
  75: "Nieve intensa",
  77: "Granos de nieve",
  80: "Chubascos aislados",
  81: "Chubascos",
  82: "Chubascos fuertes",
  85: "Chubascos de nieve",
  86: "Chubascos de nieve",
  95: "Tormenta",
  96: "Tormenta con granizo",
  99: "Tormenta con granizo",
};

export function weatherLabel(code) {
  return WEATHER_LABELS[code] || "Tiempo variable";
}

export function weatherIconName(code, isDay = true) {
  if (code === 0) return isDay ? "sun" : "moon";
  if (code === 1 || code === 2) return isDay ? "cloud-sun" : "cloud-moon";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 85 && code <= 86) return "snow";
  if (code >= 95) return "storm";
  return "cloud";
}

export async function fetchWeather() {
  const params = new URLSearchParams({
    latitude: String(LOCATION.latitude),
    longitude: String(LOCATION.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    hourly:
      "temperature_2m,apparent_temperature,precipitation,precipitation_probability,weather_code,is_day",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
    timezone: LOCATION.timezone,
    forecast_days: "7",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    throw new Error(`Open-Meteo respondió ${response.status}`);
  }

  const payload = await response.json();
  const current = payload.current;
  const daily = payload.daily;
  const hourly = payload.hourly;

  if (!current || !daily) {
    throw new Error("Open-Meteo devolvió una respuesta incompleta");
  }

  const hours = hourly && hourly.time
    ? hourly.time.map((time, index) => ({
        time,
        temperature: hourly.temperature_2m[index],
        apparentTemperature: hourly.apparent_temperature[index],
        precipitation: hourly.precipitation[index],
        precipitationProbability: hourly.precipitation_probability[index],
        weatherCode: hourly.weather_code[index],
        isDay: hourly.is_day[index] === 1,
      }))
    : [];

  const days = (daily.time || []).map((date, index) => ({
    date,
    weatherCode: daily.weather_code[index],
    max: daily.temperature_2m_max[index],
    min: daily.temperature_2m_min[index],
    precipitationProbability: daily.precipitation_probability_max[index],
    sunrise: daily.sunrise[index],
    sunset: daily.sunset[index],
    uvIndex: daily.uv_index_max[index],
  }));

  return {
    current: {
      time: current.time,
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      isDay: current.is_day === 1,
      precipitation: current.precipitation,
      weatherCode: current.weather_code,
      windSpeed: current.wind_speed_10m,
    },
    today: days[0] || null,
    days,
    hourly: hours,
    updatedAt: new Date().toISOString(),
  };
}

export function nextHours(weather, now = new Date(), count = 6) {
  const hours = weather && Array.isArray(weather.hourly) ? weather.hourly : [];
  if (!hours.length) return [];
  const currentTime = now.getTime();
  const upcoming = hours.filter((hour) => {
    const time = new Date(hour.time).getTime();
    return Number.isFinite(time) && time >= currentTime - 30 * 60000;
  });
  return (upcoming.length ? upcoming : hours).slice(0, count);
}

export function getWeatherAdvice(weather, now = new Date()) {
  const current = weather ? weather.current : null;
  const today = weather ? weather.today : null;
  const hours = nextHours(weather, now, 8);
  const rainy = hours.find(
    (hour) =>
      Number(hour.precipitationProbability) >= 45 ||
      Number(hour.precipitation) >= 0.2
  );

  if (rainy) {
    const hour = new Date(rainy.time);
    const label = Number.isFinite(hour.getTime())
      ? `sobre las ${new Intl.DateTimeFormat("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(hour)}`
      : "en las próximas horas";
    return {
      icon: "umbrella",
      tone: "rain",
      title: "Coge paraguas",
      detail: `Probabilidad de lluvia ${label}.`,
    };
  }

  if (current && current.apparentTemperature <= 9) {
    return {
      icon: "jacket",
      tone: "cold",
      title: "Abrígate",
      detail: `Sensación de ${Math.round(current.apparentTemperature)}° fuera.`,
    };
  }

  if (current && current.apparentTemperature >= 28) {
    return {
      icon: "sun",
      tone: "warm",
      title: "Busca la sombra",
      detail: `Se sienten ${Math.round(current.apparentTemperature)}°.`,
    };
  }

  if (today && Number(today.uvIndex) >= 6) {
    return {
      icon: "sun",
      tone: "warm",
      title: "Protección solar",
      detail: `UV ${Math.round(today.uvIndex)} a mediodía.`,
    };
  }

  return {
    icon: "mild",
    tone: "mild",
    title: "Buen día para salir",
    detail: "Sin lluvia cercana y temperatura agradable.",
  };
}

// Humedad absoluta en g/m³. Permite comparar el aire interior y el exterior
// aunque estén a temperaturas distintas.
export function absoluteHumidity(temperature, relativeHumidity) {
  if (
    !Number.isFinite(temperature) ||
    !Number.isFinite(relativeHumidity) ||
    relativeHumidity < 0
  ) {
    return null;
  }
  const vaporPressure =
    (relativeHumidity / 100) *
    6.112 *
    Math.exp((17.62 * temperature) / (243.12 + temperature));
  return (216.7 * vaporPressure) / (temperature + 273.15);
}

export function dewPoint(temperature, relativeHumidity) {
  if (!Number.isFinite(temperature) || !Number.isFinite(relativeHumidity)) {
    return null;
  }
  const rh = Math.max(1, Math.min(100, relativeHumidity));
  const gamma =
    Math.log(rh / 100) +
    (17.62 * temperature) / (243.12 + temperature);
  return (243.12 * gamma) / (17.62 - gamma);
}
