import type { Server } from "node:http";

import { logger } from "@/lib/logger.js";
import { dbPrisma } from "@/config/prisma.js";

const FORCED_SHUTDOWN_TIMEOUT_MS = 10_000;

export function setupGracefulShutdown(server: Server): void {
  const shutdown = async (signal: string) => {
    const isFatal = signal === "uncaughtException";
    logger.info({ signal }, "Graceful shutdown initiated");

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
      logger.warn(`Forced shutdown after ${FORCED_SHUTDOWN_TIMEOUT_MS}ms timeout`);
      process.exit(1);
    }, FORCED_SHUTDOWN_TIMEOUT_MS).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception — exiting immediately");
    logger.flush?.();
    process.exit(1);
  });
}
