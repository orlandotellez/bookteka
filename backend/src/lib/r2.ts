import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/config/env.js";

const R2_ACCESS_KEY = env.R2_ACCESS_KEY;
const R2_SECRET_KEY = env.R2_SECRET_KEY;
const R2_S3_API = env.R2_S3_API;
const R2_BUCKET = env.R2_BUCKET;

if (!R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_S3_API || !R2_BUCKET) {
  throw new Error("Faltan variables de entorno R2");
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: R2_S3_API,
  credentials: {
    accessKeyId: R2_ACCESS_KEY!,
    secretAccessKey: R2_SECRET_KEY!,
  },
});
