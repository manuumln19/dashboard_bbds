import { ROOMS } from "../config";

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function at(now, dayOffset, hour, minute = 0) {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function createDemoWeather(now = new Date()) {
  const isDay = now.getHours() >= 7 && now.getHours() < 20;
  const day = (offset) => {
    const date = at(now, offset, 12);
    return dateKey(date);
  };
  const sunrise = at(now, 0, 7, 58).toISOString();
  const sunset = at(now, 0, 19, 12).toISOString();
  const hourly = Array.from({ length: 30 }, (_, index) => {
    const time = new Date(now);
    time.setMinutes(0, 0, 0);
    time.setHours(time.getHours() + index);
    const hour = time.getHours();
    const isHourDay = hour >= 7 && hour < 20;
    const rainChance = index >= 9 && index <= 13 ? 45 + (index % 3) * 10 : 10;
    return {
      time: time.toISOString(),
      temperature: Math.round((17 + Math.sin((hour - 6) / 24 * Math.PI * 2) * 4) * 10) / 10,
      apparentTemperature: Math.round((16 + Math.sin((hour - 6) / 24 * Math.PI * 2) * 4) * 10) / 10,
      precipitation: rainChance >= 45 ? 0.3 : 0,
      precipitationProbability: rainChance,
      weatherCode: rainChance >= 45 ? 61 : 1,
      isDay: isHourDay,
    };
  });

  return {
    current: {
      time: now.toISOString(),
      temperature: 21,
      apparentTemperature: 20.6,
      humidity: 46,
      isDay,
      precipitation: 0,
      weatherCode: 1,
      windSpeed: 11,
    },
    today: {
      date: day(0),
      weatherCode: 1,
      max: 23,
      min: 12,
      precipitationProbability: 10,
      sunrise,
      sunset,
      uvIndex: 4,
    },
    hourly,
    days: [
      {
        date: day(0),
        weatherCode: 1,
        max: 23,
        min: 12,
        precipitationProbability: 10,
        sunrise,
        sunset,
        uvIndex: 4,
      },
      {
        date: day(1),
        weatherCode: 2,
        max: 22,
        min: 13,
        precipitationProbability: 20,
        sunrise,
        sunset,
        uvIndex: 3,
      },
      {
        date: day(2),
        weatherCode: 61,
        max: 19,
        min: 12,
        precipitationProbability: 65,
        sunrise,
        sunset,
        uvIndex: 2,
      },
      {
        date: day(3),
        weatherCode: 3,
        max: 20,
        min: 11,
        precipitationProbability: 25,
        sunrise,
        sunset,
        uvIndex: 3,
      },
      {
        date: day(4),
        weatherCode: 0,
        max: 22,
        min: 12,
        precipitationProbability: 5,
        sunrise,
        sunset,
        uvIndex: 4,
      },
      {
        date: day(5),
        weatherCode: 2,
        max: 21,
        min: 13,
        precipitationProbability: 15,
        sunrise,
        sunset,
        uvIndex: 3,
      },
      {
        date: day(6),
        weatherCode: 61,
        max: 18,
        min: 11,
        precipitationProbability: 55,
        sunrise,
        sunset,
        uvIndex: 2,
      },
    ],
    updatedAt: now.toISOString(),
    demo: true,
  };
}

export function createDemoEvents(now = new Date()) {
  const firstStart = new Date(now.getTime() + 90 * 60000);
  const firstEnd = new Date(firstStart.getTime() + 60 * 60000);
  const concertDay = at(now, 4, 0);
  const concertEnd = new Date(concertDay);
  concertEnd.setDate(concertEnd.getDate() + 1);

  return [
    {
      id: "demo-e1",
      summary: "Clase de oboe",
      start: firstStart.toISOString(),
      end: firstEnd.toISOString(),
      allDay: false,
      location: "Aula 3 · Conservatorio",
    },
    {
      id: "demo-e2",
      summary: "Ensayo de viento-madera",
      start: at(now, 1, 9, 30).toISOString(),
      end: at(now, 1, 11, 0).toISOString(),
      allDay: false,
      location: "Sala grande",
    },
    {
      id: "demo-e3",
      summary: "Cena en casa de Marta",
      start: at(now, 2, 20, 0).toISOString(),
      end: at(now, 2, 22, 30).toISOString(),
      allDay: false,
      location: "Llevar vino",
    },
    {
      id: "demo-e4",
      summary: "Concierto de otoño",
      start: dateKey(concertDay),
      end: dateKey(concertEnd),
      allDay: true,
      location: "Auditorio municipal",
    },
    {
      id: "demo-e5",
      summary: "Revisión del oboe",
      start: at(now, 6, 17, 30).toISOString(),
      end: at(now, 6, 18, 15).toISOString(),
      allDay: false,
      location: "Taller",
    },
    {
      id: "demo-e6",
      summary: "Fisioterapia",
      start: at(now, 3, 18, 0).toISOString(),
      end: at(now, 3, 18, 45).toISOString(),
      allDay: false,
      location: "Centro de salud",
    },
    {
      id: "demo-e7",
      summary: "Comida de trabajo",
      start: at(now, 0, 13, 30).toISOString(),
      end: at(now, 0, 15, 0).toISOString(),
      allDay: false,
      location: "La Latina",
    },
    {
      id: "demo-e8",
      summary: "Panadería y mercado",
      start: at(now, 1, 11, 15).toISOString(),
      end: at(now, 1, 12, 15).toISOString(),
      allDay: false,
      location: "Mercado de Antón Martín",
    },
  ];
}

export function createDemoLists(now = new Date()) {
  const created = now.toISOString();
  return [
    {
      id: "demo-s1",
      listId: "shopping",
      text: "Leche de avena",
      done: false,
      createdAt: created,
    },
    {
      id: "demo-s2",
      listId: "shopping",
      text: "Tomates y albahaca",
      done: false,
      createdAt: created,
    },
    {
      id: "demo-s3",
      listId: "shopping",
      text: "Papel de cocina",
      done: false,
      createdAt: created,
    },
    {
      id: "demo-s4",
      listId: "shopping",
      text: "Café en grano",
      done: true,
      createdAt: created,
    },
    {
      id: "demo-t1",
      listId: "tasks",
      text: "Regar las plantas del salón",
      done: false,
      createdAt: created,
    },
    {
      id: "demo-t2",
      listId: "tasks",
      text: "Llamar al seguro",
      done: false,
      createdAt: created,
    },
    {
      id: "demo-t3",
      listId: "tasks",
      text: "Recoger el paquete en el portal",
      done: false,
      createdAt: created,
    },
    {
      id: "demo-t4",
      listId: "tasks",
      text: "Cambiar la bombilla del pasillo",
      done: true,
      createdAt: created,
    },
  ];
}

function sensorPoint(room, roomIndex, timestamp, span = "day") {
  const date = new Date(timestamp);
  const hour = date.getHours() + date.getMinutes() / 60;
  const dayOfWeek = date.getDay();
  const dailyWave = Math.sin(((hour - 9) / 24) * Math.PI * 2);
  const slowWave = Math.sin((dayOfWeek / 7) * Math.PI * 2 + roomIndex);

  const baseTemperature = [21.4, 20.1, 19.6][roomIndex] ?? 20.8;
  const baseHumidity = [51, 54, 47][roomIndex] ?? 50;
  const temperature =
    baseTemperature +
    dailyWave * 0.9 +
    (span === "week" ? slowWave * 0.45 : 0);
  const humidity =
    baseHumidity +
    dailyWave * 4.5 +
    (span === "week" ? slowWave * 3 : 0) +
    Math.sin((hour + roomIndex * 3) * 0.7) * 1.2;

  return {
    at: new Date(timestamp).toISOString(),
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(Math.max(32, Math.min(76, humidity)) * 10) / 10,
  };
}

function historyFor(now, hours, stepMinutes, span) {
  const end = now.getTime();
  const start = end - hours * 60 * 60 * 1000;
  const step = stepMinutes * 60 * 1000;
  const result = {};

  ROOMS.forEach((room, roomIndex) => {
    const points = [];
    for (let timestamp = start; timestamp <= end; timestamp += step) {
      points.push(sensorPoint(room, roomIndex, timestamp, span));
    }
    result[room.id] = points;
  });

  return result;
}

export function createDemoSensorSnapshot(now = new Date()) {
  const history24 = historyFor(now, 24, 15, "day");
  const history7 = historyFor(now, 24 * 7, 60, "week");

  const latest = ROOMS.map((room, index) => {
    const last = history24[room.id][history24[room.id].length - 1];
    return {
      roomId: room.id,
      temperature: last.temperature,
      humidity: last.humidity,
      pressure: 1014 - index * 0.6,
      battery: 88 - index * 7,
      recordedAt: new Date(now.getTime() - 2 * 60000).toISOString(),
    };
  });

  return {
    latest,
    history24,
    history7,
    updatedAt: now.toISOString(),
    demo: true,
  };
}
