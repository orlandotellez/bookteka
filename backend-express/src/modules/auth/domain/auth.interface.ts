import type { account, session, user, verification } from "@prisma/client";

/**
 * Contrato de persistencia del módulo de auth.
 *
 * La capa `application` depende de esta interfaz, nunca de Prisma directo.
 * `infrastructure/auth.prisma.repository.ts` es la única implementación.
 * Los tests inyectan un fake que cumple este contrato.
 */
export interface IAuthRepository {
  // ── usuarios ──
  /** Usuario activo por id. `deleted_at` debe quedar excluido. */
  findUserById: (id: string) => Promise<user | null>;
  /** Usuario activo por email. La comparación la hace el repositorio. */
  findUserByEmail: (email: string) => Promise<user | null>;
  /** Existe un usuario con ese email, aunque esté soft-deleted. */
  userExistsByEmail: (email: string) => Promise<boolean>;
  createUser: (data: {
    name: string;
    email: string;
    role: "user";
    email_verified: boolean;
  }) => Promise<user>;
  markEmailVerified: (userId: string) => Promise<user>;

  // ── cuentas ──
  /** Cuenta de un proveedor. `provider_id: "credentials"` para contraseñas. */
  findAccountByProvider: (
    userId: string,
    providerId: string,
  ) => Promise<account | null>;
  createAccount: (data: {
    account_id: string;
    provider_id: string;
    user_id: string;
    password: string;
  }) => Promise<account>;

  // ── sesiones ──
  createSession: (data: {
    user_id: string;
    token: string;
    expires_at: Date;
    ip_address: string | null;
    user_agent: string | null;
  }) => Promise<session>;
  findSessionByToken: (token: string) => Promise<session | null>;
  deleteSessionByIdAndToken: (id: string, token: string) => Promise<number>;
  deleteSessionsByToken: (token: string) => Promise<number>;

  // ── verificación de correo ──
  findVerification: (
    identifier: string,
    value: string,
  ) => Promise<verification | null>;
  deleteVerificationsByIdentifier: (identifier: string) => Promise<number>;
  createVerification: (data: {
    identifier: string;
    value: string;
    expires_at: Date;
  }) => Promise<verification>;

  // ── transacción ──
  /**
   * Cliente transaccional. `issueTokens` necesita escribir la sesión dentro de
   * la misma transacción que el compare-and-delete del refresh, así que las
   * operaciones de sesión aceptan un cliente inyectado.
   */
  transaction: <T>(fn: (tx: IAuthRepository) => Promise<T>) => Promise<T>;
}
