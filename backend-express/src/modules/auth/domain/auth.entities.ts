import type { ROLE } from "@prisma/client";

/** Mapa de headers tal como lo entrega Express. */
export type HeaderMap = Record<string, string | string[] | undefined>;

/** Entrada de `auth.api.getSession`. */
export interface AuthHeaders {
  headers?: HeaderMap;
}

/** Payload del access token. */
export interface TokenPayload {
  userId: string;
  email: string;
  role: ROLE;
}

/**
 * Payload del refresh token: solo necesita el `userId` para resolver al
 * usuario. El `jti` sirve para distinguir dos refresh del mismo usuario.
 */
export interface RefreshTokenPayload {
  userId: string;
  jti: string;
}

/**
 * Usuario tal como sale hacia el cliente.
 *
 * Deliberadamente NO incluye `password` ni ningún token de `account`: es la
 * forma de garantie de que las credenciales no se filtran por la API.
 */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  phone: string | null;
  image: string | null;
  role: ROLE;
  created_at: Date;
  updated_at: Date;
}

/** Respuesta de register / login / refresh. */
export interface AuthResponse {
  message: string;
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

/** Tokens emitidos junto a la respuesta. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Sesión resuelta por `auth.api.getSession`. */
export interface ResolvedSession {
  user: PublicUser;
  session: {
    id: string;
    token: string;
    expiresAt: Date;
    userId: string;
  };
}

/** Resultado de un refresh válido. */
export interface RefreshResult {
  session: { id: string; token: string; expires_at: Date };
  user: PublicUser;
}
