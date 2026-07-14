import pkg from "pg";
import { env } from "./env.js";

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
