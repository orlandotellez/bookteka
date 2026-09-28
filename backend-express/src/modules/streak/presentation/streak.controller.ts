import type { RequestHandler } from "express";
import { streakService } from "@/modules/streak/application/streak.service.js";
import { bodyOf } from "@/core/http/express.utils.js";
import type {
  CompleteDayBodySchema,
  InitializeStreakBodySchema,
} from "@/modules/streak/presentation/streak.dto.js";

export const getUserStreak: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const result = await streakService.getUserStreak(userId);
  res.json(result);
};

export const completeDay: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const body = bodyOf<typeof CompleteDayBodySchema>(req);
  const result = await streakService.completeDay(
    userId,
    body.clientDate,
    body.clientTimestamp,
  );
  res.json(result);
};

export const initializeStreak: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const body = bodyOf<typeof InitializeStreakBodySchema>(req);
  const result = await streakService.initializeStreak(userId, body.startDate);
  res.json(result);
};
