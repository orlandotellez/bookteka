import { authApi, type SessionData, type AuthUser } from "./auth-api";
import { setSessionTokens } from "./sessionToken";
import { LOCAL_USER_ID, useUserPreferences } from "@/store/userPreferencesStore";

const LOCAL_USER: AuthUser = {
  id: LOCAL_USER_ID,
  name: "Biblioteca local",
  email: "local@bookteka.local",
  email_verified: true,
  phone: null,
  image: null,
  role: "user",
  created_at: "",
  updated_at: "",
};

const LOCAL_SESSION: SessionData = {
  user: LOCAL_USER,
  session: {
    id: "local",
    token: "local",
    expiresAt: "",
    userId: LOCAL_USER_ID,
  },
};

let cachedSession: SessionData | null | undefined;
let lastFetch = 0;
let pendingFetch: Promise<SessionData | null> | null = null;
let backgroundRefreshPromise: Promise<void> | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_RETRY_MS = 30 * 1000;

export async function getCachedSession(forceRefresh = false): Promise<SessionData | null> {
  if (useUserPreferences.getState().authMode === "local") {
    return LOCAL_SESSION;
  }

  const now = Date.now();
  if (!forceRefresh && cachedSession !== undefined && now - lastFetch < CACHE_TTL_MS) {
    return cachedSession;
  }
  if (!forceRefresh && cachedSession !== undefined) {
    void refreshInBackground();
    return cachedSession;
  }
  return doFetch();
}

export function invalidateSessionCache(): void {
  cachedSession = undefined;
  lastFetch = 0;
  pendingFetch = null;
}

async function doFetch(): Promise<SessionData | null> {
  if (pendingFetch) return pendingFetch;
  pendingFetch = doFetchInner();
  try {
    return await pendingFetch;
  } finally {
    pendingFetch = null;
  }
}

async function doFetchInner(): Promise<SessionData | null> {
  try {
    const session = await authApi.getSession();
    cachedSession = session;
    lastFetch = Date.now();
    if (!session) setSessionTokens(null, null);
    return session;
  } catch (error) {
    console.warn("[sessionCache] Error fetching session:", error);
    if (cachedSession !== undefined) return cachedSession;
    lastFetch = Date.now() - CACHE_TTL_MS + MIN_RETRY_MS;
    return null;
  }
}

async function refreshInBackground(): Promise<void> {
  if (backgroundRefreshPromise) return backgroundRefreshPromise;
  backgroundRefreshPromise = doFetch().then(() => undefined).finally(() => {
    backgroundRefreshPromise = null;
  });
  return backgroundRefreshPromise;
}
