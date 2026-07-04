import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";

import { logger } from "@/lib/logger.js";

export const httpLogger = pinoHttp({
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
});
