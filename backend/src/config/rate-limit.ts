import { rateLimit } from "express-rate-limit";

export const isProgressPath = (p: string): boolean =>
  /^\/books\/[^/]+\/progress\/?$/.test(p);

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Inténtalo de nuevo más tarde." },
});

export const progressLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === "/health" ||
    req.path.startsWith("/health/") ||
    req.path === "/auth" ||
    req.path.startsWith("/auth/") ||
    isProgressPath(req.path),
});
