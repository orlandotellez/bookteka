import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2.js";
import { logger } from "@/lib/logger.js";
import { env } from "@/config/env.js";

export async function deleteR2Quietly(fileKey: string): Promise<void> {
  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: fileKey,
      }),
    );
  } catch (err) {
    const serializedErr =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : String(err);
    logger.error(
      { err: serializedErr, fileKey },
      "R2 delete error (file kept in DB)",
    );
  }
}
