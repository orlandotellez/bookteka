import "dotenv/config";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { env } from "@/config/env.js";
import { dbPrisma } from "@/config/prisma.js";
import { httpLogger } from "@/config/http-logger.js";
import { corsOptions, corsOriginGuard } from "@/config/cors.js";
import {
  authLimiter,
  progressLimiter,
  globalLimiter,
  isProgressPath,
} from "@/config/rate-limit.js";
import { setupGracefulShutdown } from "@/config/shutdown.js";
import { auth } from "@/lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import { logger } from "@/lib/logger.js";
import { r2 } from "@/lib/r2.js";
import { book as bookRoutes } from "./routes/book.routes.js";
import { streak as streakRoutes } from "./routes/streak.routes.js";
import { bookmark as bookmarkRoutes } from "./routes/bookmark.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app: Express = express();

app.set("trust proxy", 1);

app.use(httpLogger);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(corsOriginGuard);
app.use(cors(corsOptions));

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use("/api/auth", authLimiter);

app.use("/api", (req, res, next) => {
  if (isProgressPath(req.path)) {
    return progressLimiter(req, res, next);
  }
  return next();
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

setupGracefulShutdown(server);

export default app;
