import type { Express, Request, Response, NextFunction } from "express";

import {
  authLimiter,
  sessionLimiter,
  progressLimiter,
  globalLimiter,
  isProgressPath,
} from "@/config/rate-limit.js";

import { authRoutes } from "@/modules/auth/presentation/auth.routes.js";
import { booksRoutes } from "@/modules/books/presentation/books.routes.js";
import { bookmarksRoutes } from "@/modules/bookmarks/presentation/bookmarks.routes.js";
import { streakRoutes } from "@/modules/streak/presentation/streak.routes.js";

import { errorHandler } from "@/config/error-handler.js";
import { healthHandler } from "./health.js";

export function registerRoutes(app: Express) {
  app.get("/api/v1/health", healthHandler);

  app.use("/api/v1/auth/get-session", sessionLimiter);
  app.use("/api/v1/auth", authLimiter, authRoutes);

  app.use("/api/v1", (req, res, next) => {
    if (isProgressPath(req.path)) {
      return progressLimiter(req, res, next);
    }

    next();
  });

  app.use("/api/v1", globalLimiter);

  app.use("/api/v1/books", booksRoutes);
  app.use("/api/v1/books", bookmarksRoutes);
  app.use("/api/v1/streak", streakRoutes);

  app.use((_req: Request, res: Response, _next: NextFunction) => {
    res.status(404).json({
      error: "Ruta no encontrada",
    });
  });

  app.use(errorHandler);
}
