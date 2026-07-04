import { AppError } from "@/helper/errors.js";
import { StreakRepository } from "@/repositories/streak.repository.js";
import { getUTCDateOnly, toDateString } from "@/helper/time.js";
import { logger } from "@/lib/logger.js";
import { Prisma } from "@prisma/client";

const streakRepository = new StreakRepository();

export class StreakService {
  constructor(private readonly repo: StreakRepository = streakRepository) {}

  async getUserStreak(userId: string) {
    let streak = await this.repo.findByUserId(userId);

    if (!streak) {
      try {
        streak = await this.repo.createStreak({
          userId,
          currentStreak: 0,
          startDate: null,
          lastActiveDate: null,
          createdAt: new Date(),
        });
      } catch (createError) {
        if (
          createError instanceof Prisma.PrismaClientKnownRequestError &&
          createError.code === "P2002"
        ) {
          streak = await this.repo.findByUserId(userId);
        } else {
          throw createError;
        }
      }
    }

    if (!streak) {
      throw new AppError("INTERNAL_ERROR", 500, "Error al guardar la racha");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;

    let hasCompletedToday = false;
    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
      hasCompletedToday = lastActive.getTime() === today.getTime();
    }

    return {
      currentStreak: streak.currentStreak,
      startDate: toDateString(streak.startDate),
      lastActiveDate: toDateString(streak.lastActiveDate),
      hasCompletedToday,
    };
  }

  async completeDay(
    userId: string,
    clientDate?: string,
    clientTimestamp?: Date,
  ) {
    let today: Date;
    if (clientDate) {
      today = new Date(clientDate + "T12:00:00.000Z");
    } else {
      today = new Date();
      today.setHours(0, 0, 0, 0);
    }

    const timestamp = clientTimestamp ?? new Date();

    let streak = await this.repo.findByUserId(userId);

    if (!streak) {
      try {
        streak = await this.repo.createStreak({
          userId,
          currentStreak: 1,
          startDate: today,
          lastActiveDate: today,
          createdAt: timestamp,
        });
      } catch (createError) {
        if (
          createError instanceof Prisma.PrismaClientKnownRequestError &&
          createError.code === "P2002"
        ) {
          streak = (await this.repo.findByUserId(userId))!;
          return {
            currentStreak: streak.currentStreak,
            startDate: toDateString(streak.startDate),
            lastActiveDate: toDateString(streak.lastActiveDate),
            hasCompletedToday: true,
            isNew: false,
          };
        }
        throw createError;
      }

      return {
        currentStreak: streak.currentStreak,
        startDate: toDateString(streak.startDate),
        lastActiveDate: toDateString(streak.lastActiveDate),
        hasCompletedToday: true,
        isNew: true,
      };
    }

    const lastActive = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;
    const todayDateOnly = getUTCDateOnly(today);

    if (lastActive) {
      const lastActiveDateOnly = getUTCDateOnly(lastActive);
      if (lastActiveDateOnly === todayDateOnly) {
        return {
          currentStreak: streak.currentStreak,
          startDate: toDateString(streak.startDate),
          lastActiveDate: toDateString(streak.lastActiveDate),
          hasCompletedToday: true,
          isNew: false,
        };
      }
    }

    let newStreak = 1;
    if (lastActive) {
      const lastActiveDateOnly = getUTCDateOnly(lastActive);
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayDateOnly = getUTCDateOnly(yesterday);

      if (lastActiveDateOnly === yesterdayDateOnly) {
        newStreak = streak.currentStreak + 1;
      }
    }

    const updated = await this.repo.updateStreakConditionally(
      userId,
      {
        currentStreak: newStreak,
        lastActiveDate: today,
        startDate: newStreak === 1 ? today : streak.startDate,
        updatedAt: timestamp,
      },
      streak.lastActiveDate,
    );

    if (updated === null) {
      const peerWinner = (await this.repo.findByUserId(userId))!;
      return {
        currentStreak: peerWinner.currentStreak,
        startDate: toDateString(peerWinner.startDate),
        lastActiveDate: toDateString(peerWinner.lastActiveDate),
        hasCompletedToday: true,
        isNew: false,
      };
    }

    return {
      currentStreak: updated.currentStreak,
      startDate: toDateString(updated.startDate),
      lastActiveDate: toDateString(updated.lastActiveDate),
      hasCompletedToday: true,
      isNew: newStreak === 1 && lastActive !== null,
    };
  }

  async initializeStreak(userId: string, startDate: string) {
    logger.warn(
      { userId, startDate },
      "Streak manual initialization invoked",
    );
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [todayYear, todayMonth, todayDay] = todayStr.split("-").map(Number);

    const startTimestamp = new Date(startYear, startMonth - 1, startDay).getTime();
    const todayTimestamp = new Date(todayYear, todayMonth - 1, todayDay).getTime();

    const diffDays = Math.floor((todayTimestamp - startTimestamp) / (1000 * 60 * 60 * 24));
    const calculatedStreak = diffDays < 0 ? 0 : diffDays + 1;

    const streak = await this.repo.upsertStreak({
      where: { userId },
      update: {
        currentStreak: calculatedStreak,
        lastActiveDate: new Date(todayStr + "T12:00:00Z"),
        startDate: new Date(startDate + "T12:00:00Z"),
        updatedAt: new Date(),
      },
      create: {
        userId,
        currentStreak: calculatedStreak,
        startDate: new Date(startDate + "T12:00:00Z"),
        lastActiveDate: new Date(todayStr + "T12:00:00Z"),
        createdAt: new Date(),
      },
    });

    return {
      currentStreak: streak.currentStreak,
      startDate: toDateString(streak.startDate),
      lastActiveDate: toDateString(streak.lastActiveDate),
      hasCompletedToday: true,
    };
  }
}

export const streakService = new StreakService();
