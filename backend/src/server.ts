import "dotenv/config";
import express, { type Express } from "express";
import cors from "cors";
import { env } from "@/config/env.js";
import { auth } from "@/lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import { book as bookRoutes } from "./routes/book.routes.js";
import { streak as streakRoutes } from "./routes/streak.routes.js";
import { bookmark as bookmarkRoutes } from "./routes/bookmark.routes.js";

const app: Express = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

// Limitar el tamaño del body a 25MB para permitir uploads de PDFs
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));


// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API working correctly",
    timestamp: new Date().toISOString(),
  });
});

// Otras rutas
app.use("/api/books", bookRoutes)
app.use("/api/books", bookmarkRoutes)
app.use("/api", streakRoutes)

if (import.meta.main) {
  app.listen(env.PORT, () =>
    console.log(`Server initialize in http://localhost:${env.PORT}`),
  );
}

export default app
