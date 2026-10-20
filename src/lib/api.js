import { API_BASE, DASHBOARD_TOKEN } from "../config";
import { isDemoOffline } from "./demoControls";

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, { method = "GET", body, timeout = 12000 } = {}) {
  if (isDemoOffline()) {
    throw new ApiError("Sin conexión (modo de prueba)");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const headers = { Accept: "application/json" };

  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (DASHBOARD_TOKEN) {
    headers.Authorization = `Bearer ${DASHBOARD_TOKEN}`;
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.status === 204) {
      return { payload: null, response };
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message =
        (payload && (payload.error || payload.message)) ||
        `La API respondió ${response.status}`;
      throw new ApiError(message, response.status);
    }

    return { payload, response };
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new ApiError("La API ha tardado demasiado en responder");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiRequest(path, options) {
  const { payload } = await request(path, options);
  return payload;
}

export async function apiRequestWithMeta(path, options) {
  const { payload, response } = await request(path, options);
  return {
    data: payload,
    meta: {
      cachedAt: response.headers.get("x-bbds-cached-at"),
      offline: response.headers.get("x-bbds-offline") === "1",
    },
  };
}
