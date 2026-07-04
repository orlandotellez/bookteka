import { dbPrisma } from "@/config/prisma.js";
import { CreateStreakInput, UpdateStreakInput } from "@/types/streak.js";
import { user_streak } from "@prisma/client";

interface IStreakRepository {
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

export class StreakRepository implements IStreakRepository {
  findByUserId = (userId: string) => {
    return dbPrisma.user_streak.findUnique({
      where: { userId },
    });
  };

  createStreak = (data: CreateStreakInput) => {
    return dbPrisma.user_streak.create({
      data,
    });
  };

  updateStreak = (userId: string, data: UpdateStreakInput) => {
    return dbPrisma.user_streak.update({
      where: { userId },
      data,
    });
  };

  updateStreakConditionally = async (
    userId: string,
    data: UpdateStreakInput,
    previousLastActive: Date | null,
  ): Promise<user_streak | null> => {
    const result = await dbPrisma.user_streak.updateMany({
      where: {
        userId,
        lastActiveDate: previousLastActive,
      },
      data,
    });
    if (result.count === 0) return null;
    return (await this.findByUserId(userId))!;
  };

  upsertStreak = (args: {
    where: { userId: string };
    update: UpdateStreakInput;
    create: CreateStreakInput;
  }) => {
    return dbPrisma.user_streak.upsert(args);
  };
}
