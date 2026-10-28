import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CALENDAR_DAYS, DEMO_MODE } from "../config";
import { apiRequest, apiRequestWithMeta } from "../lib/api";
import { useStableFns } from "./useStableFns";
import { createDemoEvents } from "../lib/demo";
import { reportFailure, reportSync } from "../lib/freshness";
import { normalizeIcsUrl } from "../lib/icsUrl";
import {
  DEMO_PEOPLE,
  loadDemoCalendars,
  saveDemoCalendars,
} from "../lib/localStore";
import { onPollingResume, pollingPaused, pollInterval } from "../lib/polling";

const REFRESH_MS = 5 * 60 * 1000;
const DEMO_FEED_HOST = "example.com";
const ICS_PROXY = "/api/ics";

function nowIso() {
  return new Date().toISOString();
}

function personFor(personId) {
  if (!personId) return null;
  return DEMO_PEOPLE.find((entry) => entry.id === personId) || null;
}

function demoCalendars() {
  return [
    {
      id: "demo-manu",
      name: "Manu",
      url: "https://example.com/manu.ics",
      color: "pink",
      personId: "manu",
      person: personFor("manu"),
      active: true,
      lastSyncAt: nowIso(),
      lastError: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: "demo-paco",
      name: "Paco",
      url: "https://example.com/paco.ics",
      color: "mint",
      personId: "paco",
      person: personFor("paco"),
      active: true,
      lastSyncAt: nowIso(),
      lastError: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: "demo-casa",
      name: "Casa",
      url: "https://example.com/casa.ics",
      color: "amber",
      personId: null,
      person: null,
      active: true,
      lastSyncAt: nowIso(),
      lastError: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];
}

function isDemoFeed(calendar) {
  try {
    const host = new URL(normalizeIcsUrl(calendar.url)).hostname.toLowerCase();
    return host === DEMO_FEED_HOST || host.endsWith(`.${DEMO_FEED_HOST}`);
  } catch {
    return false;
  }
}

function isDuplicateUrl(url, exceptId, calendars) {
  return calendars.some((calendar) => {
    if (calendar.id === exceptId) return false;
    try {
      return normalizeIcsUrl(calendar.url) === url;
    } catch {
      return false;
    }
  });
}

function calendarEvent(event, calendar) {
  return {
    ...event,
    id: `${calendar.id}::${event.id}`,
    calendarId: calendar.id,
    calendarName: calendar.name,
    calendarColor: calendar.color,
    personId: calendar.personId,
    personName: calendar.person ? calendar.person.name : null,
    personTone: calendar.person ? calendar.person.tone : null,
  };
}

function feedFrom(calendar, events, lastSyncAt, lastError) {
  return {
    id: calendar.id,
    name: calendar.name,
    color: calendar.color,
    personId: calendar.personId,
    person: calendar.person,
    active: calendar.active,
    lastSyncAt,
    lastError,
    eventCount: events.length,
    stale: Boolean(lastError),
  };
}

// Primer render de la demo: los feeds de ejemplo se generan al momento y los
// reales se rellenan en cuanto responde el proxy local.
function demoPreview(calendars) {
  const demoEvents = createDemoEvents();
  const events = [];
  const feeds = [];

  calendars.forEach((calendar) => {
    const feedEvents =
      calendar.active && isDemoFeed(calendar)
        ? demoEvents.filter((event) => event.calendarId === calendar.id)
        : [];
    feedEvents.forEach((event) => events.push(calendarEvent(event, calendar)));
    feeds.push(
      feedFrom(calendar, feedEvents, calendar.lastSyncAt, calendar.lastError)
    );
  });

  return { events, feeds, calendars };
}

async function fetchDemoFeed(rawUrl) {
  const url = normalizeIcsUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(
      `${ICS_PROXY}?url=${encodeURIComponent(url)}`,
      {
        headers: { Accept: "text/calendar, text/plain;q=0.8" },
        signal: controller.signal,
        cache: "no-store",
      }
    );

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new Error(
        "Abre la demo con «npm run dev:demo» para leer calendarios reales"
      );
    }

    if (!response.ok) {
      let message = `El calendario respondió ${response.status}`;
      try {
        const payload = await response.json();
        if (payload && payload.error) message = payload.error;
      } catch {
        // El proxy puede devolver una página de error sin JSON.
      }
      throw new Error(message);
    }

    return response.text();
  } catch (caught) {
    if (caught && caught.name === "AbortError") {
      throw new Error("El calendario ha tardado demasiado en responder");
    }
    throw caught;
  } finally {
    clearTimeout(timer);
  }
}

async function buildDemoSnapshot(calendars) {
  const demoEvents = createDemoEvents();
  const now = new Date();

  const outcomes = await Promise.all(
    calendars.map(async (calendar) => {
      if (!calendar.active) {
        return {
          calendar,
          events: [],
          lastSyncAt: calendar.lastSyncAt,
          lastError: null,
        };
      }

      if (isDemoFeed(calendar)) {
        return {
          calendar,
          events: demoEvents.filter(
            (event) => event.calendarId === calendar.id
          ),
          lastSyncAt: nowIso(),
          lastError: null,
        };
      }

      try {
        const text = await fetchDemoFeed(calendar.url);
        // ical.js solo se descarga si hay un feed real en la demo.
        const { parseIcsEvents } = await import("../lib/ics");
        return {
          calendar,
          events: parseIcsEvents(text, { days: CALENDAR_DAYS, now }),
          lastSyncAt: nowIso(),
          lastError: null,
        };
      } catch (caught) {
        return {
          calendar,
          events: [],
          lastSyncAt: calendar.lastSyncAt,
          lastError:
            caught instanceof Error
              ? caught.message
              : "No se pudo leer el calendario",
        };
      }
    })
  );

  const events = [];
  const feeds = [];
  const nextCalendars = outcomes.map(
    ({ calendar, events: feedEvents, lastSyncAt, lastError }) => {
      feedEvents.forEach((event) =>
        events.push(calendarEvent(event, calendar))
      );
      feeds.push(feedFrom(calendar, feedEvents, lastSyncAt, lastError));
      return {
        ...calendar,
        lastSyncAt,
        lastError,
        updatedAt: nowIso(),
      };
    }
  );

  events.sort((a, b) => {
    const aDate = a.allDay ? new Date(`${a.start}T00:00:00`) : new Date(a.start);
    const bDate = b.allDay ? new Date(`${b.start}T00:00:00`) : new Date(b.start);
    return aDate - bDate;
  });

  return { events, feeds, calendars: nextCalendars };
}

export function useCalendar() {
  const demoRef = useRef(null);
  if (DEMO_MODE && !demoRef.current) {
    demoRef.current = demoPreview(loadDemoCalendars(demoCalendars()));
  }
  const initial = demoRef.current;
  const calendarsRef = useRef(initial ? initial.calendars : []);
  const demoRunRef = useRef(0);

  const [events, setEvents] = useState(() =>
    initial ? initial.events : []
  );
  const [feeds, setFeeds] = useState(() => (initial ? initial.feeds : []));
  const [calendars, setCalendars] = useState(() =>
    initial ? initial.calendars : []
  );
  const [error, setError] = useState(null);
  const [calendarsError, setCalendarsError] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const eventsKey = useRef(null);
  const [lastUpdated, setLastUpdated] = useState(() =>
    initial ? nowIso() : null
  );

  const setCalendarList = useCallback((next) => {
    calendarsRef.current = next;
    setCalendars(next);
  }, []);

  const applyDemo = useCallback(async (nextCalendars = calendarsRef.current) => {
    // La lista se actualiza antes de esperar a la red: así dos acciones
    // seguidas (añadir y sincronizar) no se pisan entre ellas.
    const run = demoRunRef.current + 1;
    demoRunRef.current = run;
    calendarsRef.current = nextCalendars;
    setCalendars(nextCalendars);

    const snapshot = await buildDemoSnapshot(nextCalendars);
    if (run !== demoRunRef.current) return snapshot;

    calendarsRef.current = snapshot.calendars;
    setEvents(snapshot.events);
    setFeeds(snapshot.feeds);
    setCalendars(snapshot.calendars);
    setConfigured(snapshot.calendars.length > 0);
    const at = nowIso();
    setLastUpdated(at);
    setError(null);
    setLoading(false);

    const feedErrors = snapshot.feeds
      .filter((feed) => feed.lastError)
      .map((feed) => `${feed.name}: ${feed.lastError}`);
    reportSync("calendar", {
      at,
      detail: feedErrors.join(" · ") || null,
    });
    if (feedErrors.length) {
      reportFailure("calendar", feedErrors.join(" · "));
    }
    return snapshot;
  }, []);

  const refresh = useCallback(
    async (silent = false) => {
      if (DEMO_MODE) {
        await applyDemo();
        return;
      }
      if (!silent) setLoading(true);
      try {
        const { data, meta } = await apiRequestWithMeta(
          `/api/calendar?days=${encodeURIComponent(CALENDAR_DAYS)}`
        );
        const nextEvents = Array.isArray(data.events) ? data.events : [];
        const nextFeeds = Array.isArray(data.feeds) ? data.feeds : [];
        // Cada 5 min casi siempre llega lo mismo: sin cambios no se toca el
        // estado (cada set repintaba toda la app).
        const key = JSON.stringify([nextEvents, nextFeeds]);
        if (key !== eventsKey.current) {
          eventsKey.current = key;
          setEvents(nextEvents);
          setFeeds(nextFeeds);
        }
        setConfigured(true);
        const at = meta.cachedAt || data.updatedAt || nowIso();
        setLastUpdated(at);
        setError(null);
        const feedErrors = nextFeeds
          .filter((feed) => feed.lastError)
          .map((feed) => `${feed.name}: ${feed.lastError}`);
        reportSync("calendar", {
          at,
          cachedAt: meta.offline ? at : null,
          detail:
            meta.offline
              ? "Mostrando la última copia guardada"
              : feedErrors.join(" · ") || null,
        });
        if (feedErrors.length) {
          reportFailure("calendar", feedErrors.join(" · "));
        }
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "No se pudo cargar la agenda";
        setError(message);
        if (caught && caught.status === 503) setConfigured(false);
        reportFailure("calendar", message);
      } finally {
        setLoading(false);
      }
    },
    [applyDemo]
  );

  const refreshCalendars = useCallback(async (silent = true) => {
    if (DEMO_MODE) return calendarsRef.current;
    if (!silent) setCalendarsLoading(true);
    try {
      const payload = await apiRequest("/api/calendars");
      const next = Array.isArray(payload.calendars) ? payload.calendars : [];
      setCalendarList(next);
      setCalendarsError(null);
      return next;
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "No se pudieron cargar los calendarios";
      setCalendarsError(message);
      throw caught;
    } finally {
      if (!silent) setCalendarsLoading(false);
    }
  }, [setCalendarList]);

  useEffect(() => {
    refresh(false);
    // Sin sondeos con el salvapantallas abierto; al cerrarlo, uno al momento.
    const tick = () => refresh(true);
    const timer = setInterval(() => {
      if (!pollingPaused()) tick();
    }, pollInterval(REFRESH_MS));
    const stopResume = onPollingResume(tick);
    function handleVisibility() {
      if (document.visibilityState === "visible") refresh(true);
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(timer);
      stopResume();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  async function createCalendar(payload) {
    if (DEMO_MODE) {
      const url = normalizeIcsUrl(payload.url);
      if (isDuplicateUrl(url, null, calendarsRef.current)) {
        throw new Error("Ese calendario ya está añadido");
      }
      const person = personFor(payload.personId);
      const calendar = {
        id: `demo-cal-${Date.now()}`,
        name: payload.name,
        url,
        color: payload.color || "lilac",
        personId: person ? person.id : null,
        person,
        active: true,
        lastSyncAt: null,
        lastError: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      const next = [...calendarsRef.current, calendar];
      saveDemoCalendars(next);
      await applyDemo(next);
      return (
        calendarsRef.current.find((entry) => entry.id === calendar.id) ||
        calendar
      );
    }
    const response = await apiRequest("/api/calendars", {
      method: "POST",
      body: payload,
    });
    if (response && response.calendar) {
      setCalendarList([...calendarsRef.current, response.calendar]);
      await refresh(true);
      return response.calendar;
    }
    return null;
  }

  async function updateCalendar(id, payload) {
    if (DEMO_MODE) {
      let url = null;
      if (payload.url !== undefined) {
        url = normalizeIcsUrl(payload.url);
        if (isDuplicateUrl(url, id, calendarsRef.current)) {
          throw new Error("Ese calendario ya está añadido");
        }
      }
      const next = calendarsRef.current.map((calendar) => {
        if (calendar.id !== id) return calendar;
        const person = Object.prototype.hasOwnProperty.call(payload, "personId")
          ? personFor(payload.personId)
          : calendar.person;
        return {
          ...calendar,
          ...payload,
          url: url || calendar.url,
          personId: person ? person.id : null,
          person,
          updatedAt: nowIso(),
        };
      });
      saveDemoCalendars(next);
      await applyDemo(next);
      return next.find((calendar) => calendar.id === id) || null;
    }
    const response = await apiRequest(
      `/api/calendars/${encodeURIComponent(id)}`,
      { method: "PATCH", body: payload }
    );
    if (response && response.calendar) {
      setCalendarList(
        calendarsRef.current.map((calendar) =>
          calendar.id === id ? response.calendar : calendar
        )
      );
      await refresh(true);
      return response.calendar;
    }
    return null;
  }

  async function deleteCalendar(id) {
    if (DEMO_MODE) {
      const next = calendarsRef.current.filter((calendar) => calendar.id !== id);
      saveDemoCalendars(next);
      await applyDemo(next);
      return;
    }
    await apiRequest(`/api/calendars/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setCalendarList(
      calendarsRef.current.filter((calendar) => calendar.id !== id)
    );
    await refresh(true);
  }

  async function syncCalendar(id) {
    if (DEMO_MODE) {
      await applyDemo();
      return;
    }
    try {
      await apiRequest(`/api/calendars/${encodeURIComponent(id)}/sync`, {
        method: "POST",
      });
    } finally {
      await refreshCalendars(true);
      await refresh(true);
    }
  }

  const actions = useStableFns({ createCalendar, updateCalendar, deleteCalendar, syncCalendar });

  // Mismo objeto mientras no cambie nada: Hoy solo se repinta si cambia.
  return useMemo(
    () => ({
      events,
      feeds,
      calendars,
      error,
      calendarsError,
      configured,
      loading,
      calendarsLoading,
      lastUpdated,
      refresh,
      refreshCalendars,
      ...actions,
    }),
    [events, feeds, calendars, error, calendarsError, configured, loading, calendarsLoading, lastUpdated, refresh, refreshCalendars, actions]
  );
}
