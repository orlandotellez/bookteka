import { AppError } from "@/helper/errors.js";
import { StreakRepository } from "@/repositories/streak.repository.js";
import { getUTCDateOnly, toDateString } from "@/helper/time.js";

const streakRepository = new StreakRepository();

export class StreakService {
  // Obtener la racha del usuario
  static getUserStreak = async (userId: string) => {
    let streak = await streakRepository.findByUserId(userId);

    // Si no existe, crear una nueva con valores por defecto
    if (!streak) {
      try {
        streak = await streakRepository.createStreak({
          userId,
          currentStreak: 0,
          startDate: null,
          lastActiveDate: null,
          createdAt: new Date(),
        });
      } catch (createError: any) {
        // Si falla por conflicto (otro request creó al mismo tiempo), buscar de nuevo
        if (createError.code === 'P2002') {
          streak = await streakRepository.findByUserId(userId);
        } else {
          throw createError;
        }
      }
    }

    if (!streak) {
      throw new AppError("INTERNAL_ERROR", 500, "Error al guardar la racha");
    }

    // Calcular si completó el día hoy
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
  };

  // Completar el día actual (avanza la racha)
  static completeDay = async (userId: string, clientDate?: string, clientTimestamp?: string) => {
    // Usar la fecha del cliente si se proporciona, sino usar la del servidor
    let today: Date;
    if (clientDate) {
      today = new Date(clientDate + "T12:00:00.000Z");
    } else {
      today = new Date();
      today.setHours(0, 0, 0, 0);
    }

    const timestamp = clientTimestamp ? new Date(clientTimestamp) : new Date();

    // Buscar racha existente
    let streak = await streakRepository.findByUserId(userId);

    if (!streak) {
      // Crear nueva racha
      streak = await streakRepository.createStreak({
        userId,
        currentStreak: 1,
        startDate: today,
        lastActiveDate: today,
        createdAt: timestamp,
      });

      return {
        currentStreak: streak.currentStreak,
        startDate: streak.startDate?.toDateString() || null,
        lastActiveDate: streak.lastActiveDate?.toDateString() || null,
        hasCompletedToday: true,
        isNew: true,
      };
    }


    // Verificar si ya completó hoy
    const lastActive = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;
    const todayDateOnly = getUTCDateOnly(today);

    if (lastActive) {
      const lastActiveDateOnly = getUTCDateOnly(lastActive);
      if (lastActiveDateOnly === todayDateOnly) {
        return {
          currentStreak: streak.currentStreak,
          startDate: streak.startDate?.toDateString() || null,
          lastActiveDate: streak.lastActiveDate?.toDateString() || null,
          hasCompletedToday: true,
          isNew: false,
        };
      }
    }

    // Calcular si es continua o se reinicia
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

    // Actualizar racha
    streak = await streakRepository.updateStreak(userId, {
      currentStreak: newStreak,
      lastActiveDate: today,
      startDate: newStreak === 1 ? today : streak.startDate,
      updatedAt: timestamp,
    });

    return {
      currentStreak: streak.currentStreak,
      startDate: streak.startDate?.toDateString() || null,
      lastActiveDate: streak.lastActiveDate?.toDateString() || null,
      hasCompletedToday: true,
      isNew: newStreak === 1 && lastActive !== null,
    };
  };

  // Inicializar la racha manualmente
  static initializeStreak = async (userId: string, startDate: string) => {
    // Obtener fecha de hoy en formato YYYY-MM-DD
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Calcular los días de racha basados en la fecha de inicio
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [todayYear, todayMonth, todayDay] = todayStr.split("-").map(Number);

    const startTimestamp = new Date(startYear, startMonth - 1, startDay).getTime();
    const todayTimestamp = new Date(todayYear, todayMonth - 1, todayDay).getTime();

    const diffDays = Math.floor((todayTimestamp - startTimestamp) / (1000 * 60 * 60 * 24));
    const calculatedStreak = diffDays < 0 ? 0 : diffDays + 1;

    // Guardar usando upsert
    const streak = await streakRepository.upsertStreak({
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
  };
}
