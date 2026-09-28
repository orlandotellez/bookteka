import { dbPrisma } from "@/config/prisma.js";
import type { IAuthRepository } from "@/modules/auth/domain/auth.interface.js";
import type { PrismaClient } from "@prisma/client";

/**
 * Implementación Prisma del contrato de auth.
 *
 * Todos los métodos son arrow functions de instancia: se pasan bound a otras
 * capas (los services usan este mismo patrón para sus repositorios).
 */
class AuthPrismaRepository implements IAuthRepository {
  constructor(private readonly client: PrismaClient = dbPrisma) {}

  // ── usuarios ──
  findUserById = (id: string) =>
    this.client.user.findFirst({ where: { id, deleted_at: null } });

  findUserByEmail = (email: string) =>
    this.client.user.findFirst({ where: { email, deleted_at: null } });

  userExistsByEmail = async (email: string) => {
    const found = await this.client.user.findFirst({ where: { email } });
    return found !== null;
  };

  createUser = (data: {
    name: string;
    email: string;
    role: "user";
    email_verified: boolean;
  }) => this.client.user.create({ data });

  markEmailVerified = (userId: string) =>
    this.client.user.update({
      where: { id: userId },
      data: { email_verified: true },
    });

  // ── cuentas ──
  findAccountByProvider = (userId: string, providerId: string) =>
    this.client.account.findFirst({ where: { user_id: userId, provider_id: providerId } });

  createAccount = (data: {
    account_id: string;
    provider_id: string;
    user_id: string;
    password: string;
  }) => this.client.account.create({ data });

  // ── sesiones ──
  createSession = (data: {
    user_id: string;
    token: string;
    expires_at: Date;
    ip_address: string | null;
    user_agent: string | null;
  }) => this.client.session.create({ data });

  findSessionByToken = (token: string) =>
    this.client.session.findFirst({ where: { token } });

  deleteSessionByIdAndToken = async (id: string, token: string) => {
    const result = await this.client.session.deleteMany({ where: { id, token } });
    return result.count;
  };

  deleteSessionsByToken = async (token: string) => {
    const result = await this.client.session.deleteMany({ where: { token } });
    return result.count;
  };

  // ── verificación de correo ──
  findVerification = (identifier: string, value: string) =>
    this.client.verification.findFirst({ where: { identifier, value } });

  deleteVerificationsByIdentifier = async (identifier: string) => {
    const result = await this.client.verification.deleteMany({
      where: { identifier },
    });
    return result.count;
  };

  createVerification = (data: {
    identifier: string;
    value: string;
    expires_at: Date;
  }) => this.client.verification.create({ data });

  // ── transacción ──
  transaction = <T>(fn: (tx: IAuthRepository) => Promise<T>): Promise<T> =>
    this.client.$transaction(async (tx) =>
      fn(new AuthPrismaRepository(tx as unknown as PrismaClient)),
    );
}

export const authPrismaRepository = new AuthPrismaRepository();
