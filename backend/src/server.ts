import "dotenv/config";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import { HeadBucketCommand } from "@aws-sdk/client-s3";

import { env } from "@/config/env.js";
import { auth } from "@/lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import { logger } from "@/lib/logger.js";
import { isAllowedOrigin } from "@/lib/origins.js";
import { dbPrisma } from "@/config/prisma.js";
import { r2 } from "@/lib/r2.js";
import { AppError } from "@/helper/errors.js";

import { book as bookRoutes } from "./routes/book.routes.js";
import { streak as streakRoutes } from "./routes/streak.routes.js";
import { bookmark as bookmarkRoutes } from "./routes/bookmark.routes.js";

import { errorHandler } from "./middleware/errorHandler.js";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const fromHeader = req.headers["x-request-id"];
      const id =
        typeof fromHeader === "string" && fromHeader.length > 0
          ? fromHeader
          : randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    autoLogging: {
      ignore: (req) => req.url?.startsWith("/api/health") ?? false,
    },
    customLogLevel: (_req, res, err) => {
      if (err || (res.statusCode ?? 0) >= 500) return "error";
      if ((res.statusCode ?? 0) >= 400) return "warn";
      return "info";
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        id: req.id,
      }),
    },
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }),
);

const corsOriginGuard = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const origin = req.headers.origin;
  if (origin !== undefined && !isAllowedOrigin(origin)) {
    return next(
      new AppError(
        "FORBIDDEN",
        403,
        `Origin no permitido por CORS: ${origin}`,
      ),
    );
  }
  next();
};
app.use(corsOriginGuard);

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Inténtalo de nuevo más tarde." },
});
app.use("/api/auth", authLimiter);

const progressLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

const isProgressPath = (p: string): boolean =>
  /^\/books\/[^/]+\/progress\/?$/.test(p);

app.use("/api", (req, res, next) => {
  if (isProgressPath(req.path)) {
    return progressLimiter(req, res, next);
  }
  return next();
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === "/health" ||
    req.path.startsWith("/health/") ||
    req.path === "/auth" ||
    req.path.startsWith("/auth/") ||
    isProgressPath(req.path),
});
app.use("/api", globalLimiter);

app.all("/api/auth/*splat", toNodeHandler(auth));

const HEALTHCHECK_TIMEOUT_MS = 2_000;

const withTimeout = <T,>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timeout (${ms}ms)`)),
      ms,
    );
    timer.unref?.();
  });
  return Promise.race<T>([promise, timeout]);
};

app.get("/api/health", async (_req, res) => {
  let dbOk = false;
  try {
    await withTimeout(dbPrisma.$queryRaw`SELECT 1`, HEALTHCHECK_TIMEOUT_MS, "db");
    dbOk = true;
  } catch (err) {
    logger.warn({ err }, "Healthcheck: DB unreachable");
  }

  let r2Ok = false;
  try {
    await withTimeout(
      r2.send(new HeadBucketCommand({ Bucket: env.R2_BUCKET })),
      HEALTHCHECK_TIMEOUT_MS,
      "r2",
    );
    r2Ok = true;
  } catch (err) {
    logger.warn({ err }, "Healthcheck: R2 unreachable");
  }

  const ok = dbOk && r2Ok;
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "error",
    db: dbOk,
    r2: r2Ok,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/books", bookRoutes);
app.use("/api/books", bookmarkRoutes);
app.use("/api", streakRoutes);

app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use(errorHandler);

const server = app.listen(env.PORT, () =>
  logger.info(
    { port: env.PORT, env: process.env.NODE_ENV ?? "development" },
    `Server listening on http://localhost:${env.PORT}`,
  ),
);

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Graceful shutdown initiated");
  const isFatal = signal === "uncaughtException";
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "Error during server close");
      process.exit(1);
    }
    try {
      await dbPrisma.$disconnect();
      logger.info("Prisma disconnected");
    } catch (err) {
      logger.error({ err }, "Error disconnecting Prisma");
    }
    process.exit(isFatal ? 1 : 0);
  });

  setTimeout(() => {
    logger.warn("Forced shutdown after 10s timeout");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — exiting immediately");
  logger.flush?.();
  process.exit(1);
});

export default app;
