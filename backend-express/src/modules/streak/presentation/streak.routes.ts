import { Router } from "express";
import {
  getUserStreak,
  completeDay,
  initializeStreak,
} from "@/modules/streak/presentation/streak.controller.js";
import { validate } from "@/core/http/validate.js";
import { requireAuth } from "@/modules/auth/application/common/auth.guard.js";
import {
  CompleteDayBodySchema,
  InitializeStreakBodySchema,
} from "@/modules/streak/presentation/streak.dto.js";

export const streakRoutes: Router = Router();

streakRoutes.use(requireAuth);

streakRoutes.get("/", getUserStreak);

streakRoutes.post(
  "/complete",
  validate({ body: CompleteDayBodySchema }),
  completeDay,
);

streakRoutes.post(
  "/initialize",
  validate({ body: InitializeStreakBodySchema }),
  initializeStreak,
);
