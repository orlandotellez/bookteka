import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";

import { httpLogger } from "@/config/http-logger.js";
import { corsOptions, corsOriginGuard } from "@/config/cors.js";
import { registerRoutes } from "./http/routes.js";

const app: Express = express();

app.set("trust proxy", 1);

app.use(httpLogger);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(corsOriginGuard);
app.use(cors(corsOptions));

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

registerRoutes(app);

export default app;
