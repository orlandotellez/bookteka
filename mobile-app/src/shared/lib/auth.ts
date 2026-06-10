import * as SecureStore from "expo-secure-store"
import { setCurrentUserId } from "@/shared/database"
import { ENV } from "../constants/env"

// ─── Constants ─────────────────────────────────────────────────────────────

const AUTH_URL =
  ENV.BETTER_AUTH_URL ||
  ENV.API_URL ||
  "http://localhost:3000"

const SESSION_STORAGE_KEY = "bookteka-session"

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  email: string
  name: string
  emailVerified: boolean | null
  image?: string | null
}

export interface SessionInfo {
  id: string
  expiresAt: string
  token: string
  createdAt: string
  updatedAt: string
  ipAddress?: string
  userAgent?: string
}

export interface SessionData {
  user: SessionUser
  session: SessionInfo
}

// ─── Auth API ──────────────────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string,
): Promise<SessionData> {
  const response = await fetch(`${AUTH_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.message || errorData.error || "Error al iniciar sesión",
    )
  }

  const data = await response.json()
  const session: SessionData = {
    user: data.user,
    session: data.session,
  }

  await cacheSession(session)
  setCurrentUserId(session.user.id)

  return session
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  const response = await fetch(`${AUTH_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
    credentials: "include",
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.message || errorData.error || "Error al registrar",
    )
  }
}

export async function signOut(): Promise<void> {
  try {
    await fetch(`${AUTH_URL}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
    })
  } catch (error) {
    console.warn("Error durante sign-out request:", error)
    // Still clear local session even if server request fails
  }

  await clearCachedSession()
  setCurrentUserId(null as unknown as string)
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const response = await fetch(`${AUTH_URL}/api/auth/session`, {
      credentials: "include",
    })

    if (!response.ok) return null

    const data = await response.json()
    return data || null
  } catch (error) {
    console.warn("Error al obtener sesión:", error)
    return null
  }
}

// ─── Session Cache (SecureStore) ───────────────────────────────────────────

export async function getCachedSession(): Promise<SessionData | null> {
  try {
    const cached = await SecureStore.getItemAsync(SESSION_STORAGE_KEY)
    if (!cached) return null
    return JSON.parse(cached) as SessionData
  } catch (error) {
    console.warn("Error al leer sesión cacheada:", error)
    return null
  }
}

export async function cacheSession(session: SessionData): Promise<void> {
  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export async function clearCachedSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY)
}
