#!/usr/bin/env node
// Comprobaciones del cálculo de PVPC y de las recomendaciones. No usan red:
// cubren formatos, horas de Madrid, cambios de hora, franjas completas,
// ahorro, impuestos y los dos parseadores del Worker.
//
// Uso: npm run check:energy

import assert from "node:assert/strict";
import {
  APPLIANCES,
  HOUR_MS,
  addDaysKey,
  applianceById,
  applianceWindows,
  bandCounts,
  bandForPrice,
  bestWindowOfDay,
  classifyPriceBands,
  computeRecommendations,
  consumptionKwh,
  currentPriceState,
  dayLabel,
  defaultConfigFor,
  findCurrentSlot,
  formatConsumption,
  formatHour,
  formatMoney,
  formatPercent,
  formatPrice,
  formatPriceUnit,
  formatWindow,
  madridDateKey,
  normalizeApplianceConfig,
  taxBreakdown,
  windowFor,
  zonedDateTimeToUtc,
} from "../src/lib/energy.js";
import {
  parseEsiosElectricity,
  parseReeElectricity,
} from "../worker/index.js";

let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`  x   ${name}`);
    throw error;
  }
}

function near(actual, expected, epsilon = 1e-9, message = "") {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= epsilon,
    `${message ? `${message}: ` : ""}${actual} no es ${expected}`
  );
}

function plain(value) {
  return String(value).replace(/[\u00a0\u202f]/g, " ");
}

function makeDay(dateKey, prices) {
  const start = zonedDateTimeToUtc(dateKey, 0);
  return {
    date: dateKey,
    hours: prices.map((price, index) => ({
      start: new Date(start.getTime() + index * HOUR_MS).toISOString(),
      price,
    })),
  };
}

function atLocal(dateKey, hour, minute = 0) {
  return new Date(
    zonedDateTimeToUtc(dateKey, hour).getTime() + minute * 60 * 1000
  );
}

function findDay(days, dateKey) {
  return days.find((day) => day.date === dateKey) || null;
}

const washer = applianceById("washer");
const heater = applianceById("heater");
const washerConfig = normalizeApplianceConfig(washer, {
  durationHours: 2,
  consumption: 1.2,
  flexibilityHours: 24,
});
const heaterConfig = normalizeApplianceConfig(heater, {
  durationHours: 2,
  consumption: 2,
  flexibilityHours: 0,
});

console.log("BBDS · comprobación de energía y PVPC");

test("formatos españoles y valores ausentes", () => {
  assert.equal(formatPrice(null), "—");
  assert.equal(formatPrice(undefined), "—");
  assert.equal(formatPrice(""), "—");
  assert.equal(formatMoney(null), "—");
  assert.equal(formatConsumption(null), "—");
  assert.equal(formatPercent(null), "—");
  assert.equal(formatPriceUnit(null), "—");

  assert.equal(formatPrice(0.1234), "0,123");
  assert.equal(formatPriceUnit(0.1234), "0,123 €/kWh");
  assert.equal(plain(formatMoney(0.05)), "0,050 €");
  assert.equal(plain(formatMoney(12.5)), "12,50 €");
  assert.equal(plain(formatPercent(0.8333)), "83 %");
  assert.equal(formatConsumption(1.2), "1,2 kWh");
});

test("horas y días en Europe/Madrid", () => {
  assert.equal(formatHour("2026-10-21T08:00:00.000Z"), "10:00");
  assert.equal(formatHour("2026-10-25T00:00:00.000Z"), "02:00");
  assert.equal(formatHour("2026-10-25T01:00:00.000Z"), "02:00");
  assert.equal(
    madridDateKey(new Date("2026-10-21T22:30:00.000Z")),
    "2026-10-22"
  );
  assert.equal(
    zonedDateTimeToUtc("2026-10-21", 10).toISOString(),
    "2026-10-21T08:00:00.000Z"
  );
  assert.equal(
    zonedDateTimeToUtc("2026-01-15", 10).toISOString(),
    "2026-01-15T09:00:00.000Z"
  );

  const now = new Date("2026-10-21T10:00:00.000Z");
  assert.equal(dayLabel("2026-10-21", now), "Hoy");
  assert.equal(dayLabel("2026-10-22", now), "Mañana");
  assert.equal(dayLabel("2026-10-20", now), "Ayer");
  assert.equal(addDaysKey("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysKey("2026-03-01", -1), "2026-02-28");
});

test("normalización de duración, consumo y margen", () => {
  assert.equal(APPLIANCES.length, 2);
  assert.deepEqual(
    APPLIANCES.map((appliance) => appliance.id),
    ["washer", "heater"]
  );

  const clamped = normalizeApplianceConfig(washer, {
    durationHours: 99,
    consumption: 99,
    flexibilityHours: 3,
  });
  assert.equal(clamped.durationHours, washer.maxHours);
  assert.equal(clamped.consumption, washer.maxConsumption);
  assert.equal(
    clamped.flexibilityHours,
    defaultConfigFor(washer).flexibilityHours
  );

  const low = normalizeApplianceConfig(washer, {
    durationHours: -3,
    consumption: -1,
    flexibilityHours: 0,
  });
  assert.equal(low.durationHours, washer.minHours);
  assert.equal(low.consumption, washer.minConsumption);
  assert.equal(low.flexibilityHours, 0);

  assert.equal(consumptionKwh(washer, washerConfig), 1.2);
  assert.equal(consumptionKwh(heater, heaterConfig), 4);
});

test("bandas relativas y métricas del día", () => {
  const prices = Array.from({ length: 24 }, (_, index) => (index + 1) / 100);
  const day = makeDay("2026-10-21", prices);
  const bands = classifyPriceBands(day);

  assert.ok(bands);
  near(bands.min, 0.01);
  near(bands.max, 0.24);
  near(bands.avg, 0.125);
  near(bands.low, 0.08);
  near(bands.high, 0.16);
  assert.equal(bands.count, 24);
  assert.equal(bands.minHour.start, day.hours[0].start);
  assert.equal(bands.maxHour.start, day.hours[23].start);
  assert.equal(bands.degenerate, false);

  assert.equal(bandForPrice(0.01, bands).id, "cheap");
  assert.equal(bandForPrice(0.08, bands).id, "cheap");
  assert.equal(bandForPrice(0.12, bands).id, "mid");
  assert.equal(bandForPrice(0.16, bands).id, "high");
  assert.equal(bandForPrice(0.24, bands).id, "high");
  assert.equal(bandForPrice(null, bands).id, "mid");

  assert.deepEqual(bandCounts(day, bands), { cheap: 8, mid: 7, high: 9 });

  const flat = classifyPriceBands(
    makeDay("2026-10-21", Array(24).fill(0.15))
  );
  assert.ok(flat);
  assert.equal(flat.degenerate, true);
  assert.deepEqual(bandCounts(makeDay("2026-10-21", Array(24).fill(0.15)), flat), {
    cheap: 0,
    mid: 24,
    high: 0,
  });
});

test("hora actual, próxima y ausencia de datos", () => {
  const day = makeDay("2026-10-21", Array(24).fill(0.1));
  const current = currentPriceState(
    { days: [day] },
    atLocal("2026-10-21", 10, 30)
  );
  assert.equal(current.status, "current");
  assert.equal(current.slot.start, day.hours[10].start);

  const startsAtNoon = {
    date: "2026-10-21",
    hours: day.hours.slice(12),
  };
  const upcoming = currentPriceState(
    { days: [startsAtNoon] },
    atLocal("2026-10-21", 10, 30)
  );
  assert.equal(upcoming.status, "upcoming");
  assert.equal(upcoming.slot.start, startsAtNoon.hours[0].start);

  const truncated = { date: "2026-10-21", hours: day.hours.slice(0, 10) };
  const ended = currentPriceState(
    { days: [truncated] },
    atLocal("2026-10-21", 10, 30)
  );
  assert.equal(ended.status, "ended");
  assert.equal(ended.slot, null);

  const missing = currentPriceState(
    { days: [day] },
    atLocal("2026-10-22", 10, 0)
  );
  assert.equal(missing.status, "missing");
  assert.equal(missing.latest.date, "2026-10-21");

  assert.equal(
    findCurrentSlot(day, atLocal("2026-10-21", 10, 30)).start,
    day.hours[10].start
  );
});

test("coste por horas completas y consumo del programa", () => {
  const day = makeDay("2026-10-21", Array(24).fill(0.1));

  const one = windowFor(day.hours, 10, washer, washerConfig);
  assert.ok(one);
  assert.equal(one.durationHours, 2);
  assert.equal(one.kwh, 1.2);
  near(one.cost, 0.12);
  near(one.averagePrice, 0.1);
  assert.equal(
    one.end,
    new Date(Date.parse(day.hours[10].start) + 2 * HOUR_MS).toISOString()
  );

  const hourly = windowFor(day.hours, 10, heater, heaterConfig);
  assert.ok(hourly);
  assert.equal(hourly.kwh, 4);
  near(hourly.cost, 0.4);

  assert.equal(windowFor(day.hours, 23, washer, washerConfig), null);
  assert.equal(windowFor(day.hours, -1, washer, washerConfig), null);
});

test("recomendación completa, ahorro y alternativas sin solape", () => {
  const day = makeDay("2026-10-21", Array(24).fill(0.2));
  day.hours[10].price = 0.3;
  day.hours[11].price = 0.3;
  day.hours[12].price = 0.05;
  day.hours[13].price = 0.05;

  const result = computeRecommendations({
    day,
    now: atLocal("2026-10-21", 10, 30),
    appliance: washer,
    config: washerConfig,
  });

  assert.equal(result.available, true);
  assert.equal(result.best.start, day.hours[12].start);
  near(result.best.cost, 0.06);
  assert.equal(result.immediate.start, day.hours[10].start);
  near(result.immediate.cost, 0.36);
  near(result.savings, 0.3);
  near(result.savingsPct, 0.3 / 0.36);
  assert.equal(result.immediateIsNow, true);
  assert.equal(result.durationHours, 2);
  assert.equal(result.kwh, 1.2);
  assert.ok(result.evaluated >= 3);

  for (let left = 0; left < result.options.length; left += 1) {
    for (let right = left + 1; right < result.options.length; right += 1) {
      const a = result.options[left];
      const b = result.options[right];
      const overlaps = a.startIndex < b.endIndex && a.endIndex > b.startIndex;
      assert.equal(overlaps, false, "las alternativas no deben solaparse");
    }
  }

  const bestOfDay = bestWindowOfDay(day, washer, washerConfig);
  assert.ok(bestOfDay);
  assert.equal(bestOfDay.start, day.hours[12].start);
});

test("resumen de Inicio: una franja completa por aparato y día correcto", () => {
  const today = makeDay("2026-10-21", Array(24).fill(0.2));
  today.hours[12].price = 0.05;
  today.hours[13].price = 0.05;
  const tomorrow = makeDay("2026-10-22", Array(24).fill(0.1));
  tomorrow.hours[3].price = 0.03;
  tomorrow.hours[4].price = 0.03;

  const previews = applianceWindows(
    { days: [today, tomorrow] },
    atLocal("2026-10-21", 10, 30)
  );
  assert.equal(previews.length, APPLIANCES.length);
  previews.forEach((entry) => {
    assert.equal(entry.day, "today");
    assert.ok(entry.best);
    assert.equal(entry.best.durationHours, entry.config.durationHours);
  });

  const washerPreview = previews.find(
    (entry) => entry.appliance.id === "washer"
  );
  assert.equal(washerPreview.best.start, today.hours[12].start);

  const configured = applianceWindows(
    { days: [today, tomorrow] },
    atLocal("2026-10-21", 10, 30),
    {
      washer: {
        ...washerConfig,
        durationHours: 3,
        flexibilityHours: 24,
      },
    }
  ).find((entry) => entry.appliance.id === "washer");
  assert.equal(configured.best.durationHours, 3);
  assert.equal(configured.best.start, today.hours[12].start);

  const tomorrowOnly = applianceWindows(
    { days: [tomorrow] },
    atLocal("2026-10-21", 10, 30)
  );
  tomorrowOnly.forEach((entry) => {
    assert.equal(entry.day, "tomorrow");
    assert.ok(entry.best);
  });

  const late = applianceWindows(
    { days: [today, tomorrow] },
    atLocal("2026-10-21", 23, 10)
  );
  late.forEach((entry) => {
    assert.equal(entry.day, "tomorrow");
    assert.ok(entry.best);
  });

  const empty = applianceWindows(null, atLocal("2026-10-21", 10, 30));
  assert.equal(empty.length, APPLIANCES.length);
  empty.forEach((entry) => {
    assert.equal(entry.day, null);
    assert.equal(entry.best, null);
  });
});

test("margen de maniobra y referencia inmediata", () => {
  const day = makeDay("2026-10-21", Array(24).fill(0.2));
  day.hours[10].price = 0.3;
  day.hours[11].price = 0.3;
  day.hours[12].price = 0.05;
  day.hours[13].price = 0.05;
  const now = atLocal("2026-10-21", 10, 30);

  const fixed = computeRecommendations({
    day,
    now,
    appliance: washer,
    config: { ...washerConfig, flexibilityHours: 0 },
  });
  assert.equal(fixed.available, true);
  assert.equal(fixed.best.start, day.hours[10].start);
  assert.equal(fixed.immediate.start, day.hours[10].start);
  assert.equal(fixed.savings, 0);
  assert.equal(fixed.options.length, 1);

  const twoHours = computeRecommendations({
    day,
    now,
    appliance: washer,
    config: { ...washerConfig, flexibilityHours: 2 },
  });
  assert.equal(twoHours.best.start, day.hours[11].start);
  near(twoHours.best.cost, 0.21);
  near(twoHours.savings, 0.15);

  const fourHours = computeRecommendations({
    day,
    now,
    appliance: washer,
    config: { ...washerConfig, flexibilityHours: 4 },
  });
  assert.equal(fourHours.best.start, day.hours[12].start);
  near(fourHours.best.cost, 0.06);

  const wholeDay = computeRecommendations({
    day,
    now: atLocal("2026-10-21", 22, 0),
    appliance: washer,
    config: washerConfig,
    fromStart: true,
  });
  assert.equal(wholeDay.best.start, day.hours[12].start);
  assert.equal(wholeDay.immediate, null);
});

test("regla de 30 minutos y final del día", () => {
  const day = makeDay("2026-10-21", Array(24).fill(0.1));
  const shortConfig = { ...washerConfig, flexibilityHours: 0 };

  const exact = computeRecommendations({
    day,
    now: atLocal("2026-10-21", 10, 30),
    appliance: washer,
    config: shortConfig,
  });
  assert.equal(exact.available, true);
  assert.equal(exact.immediateIsNow, true);
  assert.equal(exact.best.start, day.hours[10].start);

  const late = computeRecommendations({
    day,
    now: new Date(atLocal("2026-10-21", 10, 30).getTime() + 1000),
    appliance: washer,
    config: shortConfig,
  });
  assert.equal(late.available, true);
  assert.equal(late.immediateIsNow, false);
  assert.equal(late.best.start, day.hours[11].start);
  assert.equal(late.immediate.start, day.hours[11].start);

  const edge = computeRecommendations({
    day,
    now: atLocal("2026-10-21", 22, 30),
    appliance: washer,
    config: washerConfig,
  });
  assert.equal(edge.available, true);
  assert.equal(edge.best.start, day.hours[22].start);

  const tooLate = computeRecommendations({
    day,
    now: atLocal("2026-10-21", 23, 10),
    appliance: washer,
    config: washerConfig,
  });
  assert.equal(tooLate.available, false);
  assert.match(tooLate.reason, /Solo quedan 1 h/);

  const tooShort = computeRecommendations({
    day: { date: "2026-10-21", hours: day.hours.slice(0, 1) },
    now: atLocal("2026-10-21", 0, 10),
    appliance: washer,
    config: washerConfig,
  });
  assert.equal(tooShort.available, false);
  assert.match(tooShort.reason, /1 h/);
});

test("huecos: nunca se propone una franja incompleta", () => {
  const day = makeDay("2026-10-21", Array(24).fill(0.2));
  day.hours[12].price = 0.05;
  const withGap = day.hours.filter((_, index) => index !== 12);

  assert.equal(windowFor(withGap, 11, washer, washerConfig), null);
  assert.ok(windowFor(withGap, 10, washer, washerConfig));
  assert.ok(windowFor(withGap, 12, washer, washerConfig));

  const result = computeRecommendations({
    day: { date: "2026-10-21", hours: withGap },
    now: new Date(withGap[0].start),
    appliance: washer,
    config: washerConfig,
    fromStart: true,
  });
  assert.equal(result.available, true);

  result.options.forEach((option) => {
    for (let index = option.startIndex; index < option.endIndex - 1; index += 1) {
      assert.equal(
        Date.parse(withGap[index + 1].start) -
          Date.parse(withGap[index].start),
        HOUR_MS,
        "la franja debe ser consecutiva"
      );
    }
  });
});

test("cambios de hora: 23 y 25 horas, sin romper ventanas", () => {
  const spring = makeDay("2026-03-29", Array(23).fill(0.1));
  assert.equal(spring.hours.length, 23);
  assert.equal(spring.hours[0].start, "2026-03-28T23:00:00.000Z");
  assert.equal(spring.hours[22].start, "2026-03-29T21:00:00.000Z");

  const fall = makeDay("2026-10-25", Array(25).fill(0.1));
  assert.equal(fall.hours.length, 25);
  assert.equal(fall.hours[0].start, "2026-10-24T22:00:00.000Z");
  assert.equal(fall.hours[24].start, "2026-10-25T22:00:00.000Z");
  assert.equal(
    new Set(fall.hours.map((slot) => slot.start)).size,
    25
  );

  assert.equal(
    formatWindow("2026-10-21T08:00:00.000Z", 2),
    "10:00–12:00"
  );
  assert.equal(
    formatWindow("2026-03-29T00:00:00.000Z", 2),
    "01:00–04:00 · 2 h"
  );
  assert.equal(
    formatWindow("2026-10-24T23:00:00.000Z", 2),
    "01:00–02:00 · 2 h"
  );
  assert.equal(
    formatWindow("2026-10-25T00:00:00.000Z", 2),
    "02:00–03:00 · 2 h"
  );

  const firstPass = currentPriceState(
    { days: [fall] },
    new Date("2026-10-25T00:30:00.000Z")
  );
  assert.equal(firstPass.status, "current");
  assert.equal(firstPass.slot.start, "2026-10-25T00:00:00.000Z");

  const secondPass = currentPriceState(
    { days: [fall] },
    new Date("2026-10-25T01:30:00.000Z")
  );
  assert.equal(secondPass.status, "current");
  assert.equal(secondPass.slot.start, "2026-10-25T01:00:00.000Z");

  const window = windowFor(fall.hours, 2, washer, washerConfig);
  assert.ok(window);
  assert.equal(window.start, "2026-10-25T00:00:00.000Z");
  assert.equal(window.end, "2026-10-25T02:00:00.000Z");
  near(window.cost, 0.12);

  const springResult = computeRecommendations({
    day: spring,
    now: new Date(spring.hours[0].start),
    appliance: washer,
    config: washerConfig,
    fromStart: true,
  });
  assert.equal(springResult.available, true);
  assert.equal(springResult.best.start, spring.hours[0].start);
});

test("impuestos solo cuando la fuente y el coste lo permiten", () => {
  const tax = taxBreakdown(0.18, { priceType: "pvpc" });
  assert.equal(tax.available, true);
  near(tax.iee, 0.009198, 1e-12);
  near(tax.iva, 0.03973158, 1e-12);
  near(tax.total, 0.22892958, 1e-12);

  assert.equal(taxBreakdown(0.18, { priceType: "spot" }).available, false);
  assert.equal(taxBreakdown(0, { priceType: "pvpc" }).available, false);
  assert.equal(taxBreakdown(null, { priceType: "pvpc" }).available, false);
  assert.equal(taxBreakdown(-1, { priceType: "pvpc" }).available, false);
});

test("parseo de REE: serie 1001, €/kWh, duplicados y límites", () => {
  const payload = {
    included: [
      {
        id: 600,
        type: "Mercado spot",
        attributes: {
          values: [
            { datetime: "2026-10-21T00:00:00+02:00", value: 999999 },
          ],
        },
      },
      {
        id: 1001,
        type: "PVPC",
        attributes: {
          "last-update": "2026-10-21T10:05:00+02:00",
          values: [
            { datetime: "2026-10-21T00:00:00+02:00", value: 100 },
            { datetime: "2026-10-21T01:00:00+02:00", value: 200 },
            { datetime: "2026-10-21T00:00:00+02:00", value: 999 },
            { datetime: "2026-10-21T02:00:00+02:00", value: "roto" },
            { datetime: "2026-10-21T03:00:00+02:00", value: 4000 },
            { datetime: "2026-10-20T23:00:00+02:00", value: 50 },
          ],
        },
      },
    ],
  };

  const parsed = parseReeElectricity(
    payload,
    new Date("2026-10-21T08:30:00.000Z")
  );
  assert.equal(parsed.updatedAt, "2026-10-21T08:05:00.000Z");
  assert.equal(parsed.days.length, 2);

  const today = findDay(parsed.days, "2026-10-21");
  assert.ok(today);
  assert.equal(today.hours.length, 2);
  assert.equal(today.hours[0].start, "2026-10-20T22:00:00.000Z");
  near(today.hours[0].price, 0.1);
  near(today.hours[1].price, 0.2);

  const yesterday = findDay(parsed.days, "2026-10-20");
  assert.ok(yesterday);
  assert.equal(yesterday.hours.length, 1);
  near(yesterday.hours[0].price, 0.05);

  assert.throws(
    () => parseReeElectricity({ included: [] }),
    /no incluye la serie PVPC/
  );
});

test("parseo de ESIOS: Península y respaldo sin geo", () => {
  const payload = {
    indicator: {
      values_updated_at: "2026-10-21T10:10:00+02:00",
      values: [
        {
          geo_id: 8741,
          geo_name: "Península",
          datetime: "2026-10-21T00:00:00+02:00",
          value: 100,
        },
        {
          geo_id: 8742,
          geo_name: "Canarias",
          datetime: "2026-10-21T00:00:00+02:00",
          value: 300,
        },
        {
          geo_id: 8741,
          geo_name: "Península",
          datetime: "2026-10-21T01:00:00+02:00",
          value: 200,
        },
      ],
    },
  };

  const parsed = parseEsiosElectricity(
    payload,
    new Date("2026-10-21T08:30:00.000Z")
  );
  assert.equal(parsed.updatedAt, "2026-10-21T08:10:00.000Z");
  assert.equal(parsed.days.length, 1);
  assert.equal(parsed.days[0].hours.length, 2);
  near(parsed.days[0].hours[0].price, 0.1);
  near(parsed.days[0].hours[1].price, 0.2);

  const withoutGeo = {
    indicator: {
      values: [
        { datetime: "2026-10-21T00:00:00+02:00", value: 100 },
        { datetime: "2026-10-21T01:00:00+02:00", value: 150 },
      ],
    },
  };
  const fallback = parseEsiosElectricity(withoutGeo);
  assert.equal(fallback.days[0].hours.length, 2);
  near(fallback.days[0].hours[1].price, 0.15);

  assert.throws(
    () => parseEsiosElectricity({ indicator: { values: [] } }),
    /no contiene valores PVPC/
  );
});

test("parseo del día de 25 horas sin duplicar instantes", () => {
  const start = Date.parse("2026-10-24T22:00:00.000Z");
  const values = [];
  for (let index = 0; index < 25; index += 1) {
    values.push({
      datetime: new Date(start + index * HOUR_MS).toISOString(),
      value: 100 + index,
    });
  }

  const parsed = parseReeElectricity({
    included: [
      {
        id: 1001,
        type: "PVPC",
        attributes: {
          "last-update": "2026-10-25T23:05:00+01:00",
          values,
        },
      },
    ],
  });

  assert.equal(parsed.days.length, 1);
  assert.equal(parsed.days[0].date, "2026-10-25");
  assert.equal(parsed.days[0].hours.length, 25);
  assert.equal(
    new Set(parsed.days[0].hours.map((slot) => slot.start)).size,
    25
  );
  near(parsed.days[0].hours[0].price, 0.1);
  near(parsed.days[0].hours[24].price, 0.124);
});

console.log(`\n✓ ${passed} comprobaciones superadas.`);
