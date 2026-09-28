import "dotenv/config";
import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";
import { setupGracefulShutdown } from "@/config/graceful-shutdown.js";
import app from "./app.js";

const server = app.listen(env.PORT, () =>
  logger.info(
    {
      port: env.PORT,
      env: process.env.NODE_ENV ?? "development",
    },
    `Server listening on http://localhost:${env.PORT}`,
  ),
);

setupGracefulShutdown(server);
