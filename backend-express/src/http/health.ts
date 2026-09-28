import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { dbPrisma } from "@/config/prisma.js";
import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";
import { r2 } from "@/core/storage/s3.client.js";

const HEALTHCHECK_TIMEOUT_MS = 2_000;

const withTimeout = <T>(
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

  return Promise.race([promise, timeout]);
};

export async function healthHandler(_req: any, res: any) {
  let dbOk = false;

  try {
    await withTimeout(
      dbPrisma.$queryRaw`SELECT 1`,
      HEALTHCHECK_TIMEOUT_MS,
      "db",
    );
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
}
