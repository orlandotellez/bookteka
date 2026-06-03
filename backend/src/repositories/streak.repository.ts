import { dbPrisma } from "@/config/prisma.js";
import { CreateStreakInput, UpdateStreakInput } from "@/types/streak.js";
import { user_streak } from "@prisma/client";


interface IStreakRepository {
  findByUserId: (userId: string) => Promise<user_streak | null>;
  createStreak: (data: CreateStreakInput) => Promise<user_streak>;
  updateStreak: (userId: string, data: UpdateStreakInput) => Promise<user_streak>;
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

  upsertStreak = (args: {
    where: { userId: string };
    update: UpdateStreakInput;
    create: CreateStreakInput;
  }) => {
    return dbPrisma.user_streak.upsert(args);
  };
}
