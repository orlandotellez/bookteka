import type { Request } from "express";
import type { ROLE, user } from "@prisma/client";
import { AppError } from "@/core/errors/AppError.js";
import {
  hashPassword,
  verifyPassword,
  generateVerificationCode,
} from "@/modules/auth/application/common/crypto.utils.js";
import {
  tokenFromHeaders,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  REFRESH_TOKEN_SECONDS,
} from "@/modules/auth/application/common/token.utils.js";
import {
  setAuthCookies,
  clearAuthCookies,
} from "@/modules/auth/application/common/cookie.utils.js";
import { authPrismaRepository } from "@/modules/auth/infrastructure/auth.prisma.repository.js";
import type { IAuthRepository } from "@/modules/auth/domain/auth.interface.js";
import type {
  AuthHeaders,
  AuthResponse,
  HeaderMap,
  PublicUser,
  ResolvedSession,
} from "@/modules/auth/domain/auth.entities.js";

/** Vida del código de verificación: 15 minutos. */
const VERIFICATION_SECONDS = 15 * 60;

/** Proveedor usado para las contraseñas. */
const CREDENTIALS_PROVIDER = "credentials";

function requestHeaders(req: Request): HeaderMap {
  return req.headers as HeaderMap;
}

/**
 * Proyecta un usuario a su forma pública.
 *
 * Es la garantía de que `password` y los tokens de `account` nunca salen por
 * la API: lo que no está en este objeto, no se devuelve.
 */
function publicUser(u: user): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    email_verified: u.email_verified,
    phone: u.phone,
    image: u.image,
    role: u.role,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

export class AuthService {
  constructor(
    private readonly repo: IAuthRepository = authPrismaRepository,
  ) {}

  // ── sesiones ──────────────────────────────────────────────────────────

  /**
   * Registra el refresh token como sesión activa, guardando IP y user agent
   * para poder auditar accesos.
   */
  private async createSession(
    userId: string,
    refreshToken: string,
    headers?: HeaderMap,
    client: IAuthRepository = this.repo,
  ): Promise<void> {
    await client.createSession({
      user_id: userId,
      token: refreshToken,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_SECONDS * 1000),
      ip_address: headers?.["x-forwarded-for"]?.toString().split(",")[0]?.trim() ?? null,
      user_agent: headers?.["user-agent"]?.toString() ?? null,
    });
  }

  /** Emite el par de tokens y persiste la sesión del refresh token. */
  private async issueTokens(
    u: { id: string; email: string; role: ROLE },
    headers?: HeaderMap,
    client: IAuthRepository = this.repo,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = signAccessToken(u);
    const refreshToken = signRefreshToken(u.id);
    await this.createSession(u.id, refreshToken, headers, client);
    return { accessToken, refreshToken };
  }

  /**
   * Resuelve la sesión a partir de los headers de la request.
   *
   * El access token es stateless: se verifica firmando y no se persiste. La
   * "sesión" que se devuelve es el propio JWT, con un id sintético.
   */
  async getSession({ headers }: AuthHeaders): Promise<ResolvedSession | null> {
    const { accessToken } = tokenFromHeaders(headers);
    if (!accessToken) return null;

    const payload = verifyAccessToken(accessToken);
    if (!payload?.userId) return null;

    const found = await this.repo.findUserById(payload.userId);
    if (!found) return null;

    return {
      user: publicUser(found),
      session: {
        id: `access:${payload.jti ?? payload.userId}`,
        token: accessToken,
        expiresAt: new Date((payload.exp ?? 0) * 1000),
        userId: payload.userId,
      },
    };
  }

  // ── registro y login ──────────────────────────────────────────────────

  async login(
    data: { email: string; password: string },
    headers?: HeaderMap,
  ): Promise<AuthResponse> {
    const found = await this.repo.findUserByEmail(data.email.toLowerCase());
    if (!found) {
      throw new AppError("UNAUTHORIZED", 401, "Credenciales inválidas");
    }

    const account = await this.repo.findAccountByProvider(
      found.id,
      CREDENTIALS_PROVIDER,
    );
    if (!account?.password || !(await verifyPassword(data.password, account.password))) {
      throw new AppError("UNAUTHORIZED", 401, "Credenciales inválidas");
    }

    const tokens = await this.issueTokens(found, headers);
    return { message: "Login exitoso", user: publicUser(found), ...tokens };
  }

  /**
   * Registra un usuario. El `user` y su `account` se crean en la misma
   * transacción: una cuenta sin hash es un usuario que no puede entrar.
   */
  async register(
    data: { name: string; email: string; password: string },
    headers?: HeaderMap,
  ): Promise<AuthResponse> {
    const email = data.email.toLowerCase();

    if (await this.repo.userExistsByEmail(email)) {
      throw new AppError("CONFLICT", 409, "El correo ya está registrado");
    }

    const password = await hashPassword(data.password);

    const created = await this.repo.transaction(async (tx) => {
      const newUser = await tx.createUser({
        name: data.name,
        email,
        role: "user",
        email_verified: false,
      });
      await tx.createAccount({
        account_id: newUser.id,
        provider_id: CREDENTIALS_PROVIDER,
        user_id: newUser.id,
        password,
      });
      return newUser;
    });

    await this.createVerification(email);

    const tokens = await this.issueTokens(created, headers);
    return {
      message: "Usuario creado correctamente",
      user: publicUser(created),
      ...tokens,
    };
  }

  /**
   * Renueva los tokens con rotación de un solo uso.
   *
   * El compare-and-delete dentro de la transacción hace que un refresh token
   * no sirva dos veces, incluso si dos requests llegan concurrentemente con el
   * mismo token: solo una borra la fila y la otra recibe 401.
   */
  async refresh(
    refreshToken: string,
    headers?: HeaderMap,
  ): Promise<AuthResponse> {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload.userId) {
      throw new AppError("UNAUTHORIZED", 401, "Refresh token inválido o expirado");
    }

    const session = await this.repo.findSessionByToken(refreshToken);
    if (!session) {
      throw new AppError("UNAUTHORIZED", 401, "Sesión inválida");
    }
    if (session.expires_at <= new Date()) {
      await this.repo.deleteSessionsByToken(refreshToken);
      throw new AppError("UNAUTHORIZED", 401, "Sesión expirada");
    }

    const found = await this.repo.findUserById(payload.userId);
    if (!found) {
      throw new AppError("UNAUTHORIZED", 401, "Usuario no encontrado");
    }

    const tokens = await this.repo.transaction(async (tx) => {
      const deleted = await tx.deleteSessionByIdAndToken(session.id, refreshToken);
      if (deleted !== 1) {
        throw new AppError("UNAUTHORIZED", 401, "Sesión ya renovada o revocada");
      }
      return this.issueTokens(found, headers, tx);
    });

    return {
      message: "Token renovado correctamente",
      user: publicUser(found),
      ...tokens,
    };
  }

  /** Revoca la sesión del refresh token, si se recibió. */
  async logout(refreshToken: string | undefined): Promise<{ message: string }> {
    if (refreshToken) {
      await this.repo.deleteSessionsByToken(refreshToken);
    }
    return { message: "Sesión cerrada correctamente" };
  }

  // ── verificación de correo ────────────────────────────────────────────

  async verifyEmail(
    identifier: string,
    code: string,
  ): Promise<{ message: string }> {
    const verification = await this.repo.findVerification(identifier, code);
    if (!verification) {
      throw new AppError("UNAUTHORIZED", 401, "Código de verificación inválido");
    }

    if (verification.expires_at <= new Date()) {
      await this.repo.deleteVerificationsByIdentifier(identifier);
      throw new AppError("UNAUTHORIZED", 401, "Código de verificación expirado");
    }

    const found = await this.repo.findUserByEmail(identifier.toLowerCase());
    if (!found) {
      throw new AppError("NOT_FOUND", 404, "Usuario no encontrado");
    }

    await this.repo.markEmailVerified(found.id);
    await this.repo.deleteVerificationsByIdentifier(identifier);

    return { message: "Correo verificado correctamente" };
  }

  /**
   * Genera un código de verificación y lo persiste.
   *
   * ⚠️ **El código no se envía por email.** `sendEmail` existe en
   * `application/common/email.utils.ts` pero ningún módulo lo llama: el código
   * se registra en consola. Ver `specs/tasks/backend/02-email-verificacion.md`.
   *
   * El mensaje de respuesta es genérico a propósito: confirmar si un correo
   * está registrado filtraría qué cuentas existen.
   */
  async createVerification(
    identifier: string,
  ): Promise<{ message: string; expiresAt: Date }> {
    const value = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_SECONDS * 1000);

    await this.repo.deleteVerificationsByIdentifier(identifier);
    await this.repo.createVerification({ identifier, value, expires_at: expiresAt });

    // eslint-disable-next-line no-console
    console.info(`[auth] Código de verificación para ${identifier}: ${value}`);

    return { message: "Si el correo existe, se envió un código", expiresAt };
  }
}

/** Singleton que usan el controller y el guard. */
export const authService = new AuthService();

/**
 * Fachada que conserva la forma pública que usan el resto de módulos.
 * `auth.guard` y `auth.controller` no dependen de la clase directamente.
 */
export const auth = {
  api: {
    getSession: (headers: AuthHeaders) => authService.getSession(headers),
    login: (data: { email: string; password: string }, req: Request) =>
      authService.login(data, requestHeaders(req)),
    register: (
      data: { name: string; email: string; password: string },
      req: Request,
    ) => authService.register(data, requestHeaders(req)),
    refresh: (token: string, req: Request) =>
      authService.refresh(token, requestHeaders(req)),
    logout: (token: string | undefined) => authService.logout(token),
    verifyEmail: (identifier: string, code: string) =>
      authService.verifyEmail(identifier, code),
    createVerification: (identifier: string) =>
      authService.createVerification(identifier),
  },
  cookies: {
    set: setAuthCookies,
    clear: clearAuthCookies,
  },
  tokens: {
    fromHeaders: tokenFromHeaders,
  },
};

