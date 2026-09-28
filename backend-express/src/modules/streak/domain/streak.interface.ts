import type { user_streak } from "@prisma/client";
import type { CreateStreakInput, UpdateStreakInput } from "@/modules/streak/domain/streak.types.js";
/**
 * Contrato de persistencia de rachas de lectura.
 *
 * La capa `application` depende de esta interfaz, nunca de Prisma
 * directo. `infrastructure/<feature>.prisma.repository.ts` es la única
 * implementación, y los tests inyectan un fake que cumple el contrato.
 */
export interface IStreakRepository {
  findByUserId: (userId: string) => Promise<user_streak | null>;
  createStreak: (data: CreateStreakInput) => Promise<user_streak>;
  updateStreak: (userId: string, data: UpdateStreakInput) => Promise<user_streak>;
  updateStreakConditionally: (
    userId: string,
    data: UpdateStreakInput,
    previousLastActive: Date | null,
  ) => Promise<user_streak | null>;
  upsertStreak: (args: {
    where: { userId: string };
    update: UpdateStreakInput;
    create: CreateStreakInput;
  }) => Promise<user_streak>;
}
