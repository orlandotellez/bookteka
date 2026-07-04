/**
 * Cache de sesión para evitar llamar a getSession() constantemente.
 *
 * Estrategia: stale-while-revalidate
 * - Dentro del TTL: devuelve el valor cacheado, 0 requests al backend
 * - Pasado el TTL: devuelve el valor cacheado PERO refresca en background
 * - Cache inválido (null): hace fetch síncrono
 *
 * Esto hace que el usuario NUNCA espere por la sesión, y el backend
 * recibe solo ~1 request cada 5 minutos (en vez de 6 por página).
 */

import { authClient } from "./auth-client";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionData {
  user: SessionUser;
  session: {
    id: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    userId: string;
  };
}

// Cache state

let cachedSession: SessionData | null | undefined = undefined;
let lastFetch = 0;
let pendingFetch: Promise<SessionData | null> | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const MIN_RETRY_MS = 30 * 1000; // si falló, esperar 30s antes de reintentar

// Public API 

/**
 * Devuelve la sesión cacheada. La primera vez hace fetch al backend.
 * Dentro del TTL devuelve siempre el cache (0 requests).
 * Pasado el TTL, devuelve el cache pero refresca en background.
 *
 * @param forceRefresh — si es true, ignora el cache y hace fetch
 */
export async function getCachedSession(
  forceRefresh = false,
): Promise<SessionData | null> {
  const now = Date.now();

  // ⚡ Si ya tenemos sesión y está fresh, devolver al toque
  if (
    !forceRefresh &&
    cachedSession !== undefined &&
    now - lastFetch < CACHE_TTL_MS
  ) {
    return cachedSession;
  }

  // Si está stale (pasó el TTL) pero tenemos cache, refrescar en background
  if (
    !forceRefresh &&
    cachedSession !== undefined &&
    now - lastFetch >= CACHE_TTL_MS
  ) {
    // Refrescar en background sin await
    refreshInBackground();
    return cachedSession;
  }

  // No hay cache o forceRefresh — hacer fetch síncrono
  return doFetch();
}

/**
 * Limpia el cache. Útil después de logout o login.
 */
export function invalidateSessionCache(): void {
  cachedSession = undefined;
  lastFetch = 0;
  pendingFetch = null;
}

// ---------- Internals ----------

async function doFetch(): Promise<SessionData | null> {
  // Si ya hay un fetch en curso, reusarlo (evita duplicados)
  if (pendingFetch) {
    return pendingFetch;
  }

  pendingFetch = doFetchInner();
  try {
    return await pendingFetch;
  } finally {
    pendingFetch = null;
  }
}

async function doFetchInner(): Promise<SessionData | null> {
  try {
    const { data } = await authClient.getSession();

    if (data) {
      cachedSession = data as SessionData;
      lastFetch = Date.now();
      return cachedSession;
    }

    // Sesión nula o no autenticado
    cachedSession = null;
    lastFetch = Date.now();
    return null;
  } catch (err) {
    console.warn("[sessionCache] Error fetching session:", err);

    // Si falló el fetch y teníamos cache, conservarlo
    if (cachedSession !== undefined) {
      return cachedSession;
    }

    // No había cache — marcar para reintentar pronto
    lastFetch = Date.now() - CACHE_TTL_MS + MIN_RETRY_MS;
    return null;
  }
}

let backgroundRefreshPromise: Promise<void> | null = null;

async function refreshInBackground(): Promise<void> {
  if (backgroundRefreshPromise) return;
  backgroundRefreshPromise = (async () => {
    try {
      await doFetch();
    } finally {
      backgroundRefreshPromise = null;
    }
  })();
}
