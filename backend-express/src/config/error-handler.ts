import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { AppError } from "@/core/errors/AppError.js";
import { logger } from "@/config/logger.js";
import { MAX_UPLOAD_MB } from "@/core/upload.js";

// Códigos de error de Prisma más comunes -> mapeo HTTP seguro
const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: "Registro duplicado" },
  P2025: { status: 404, message: "Recurso no encontrado" },
  P2003: { status: 400, message: "Violación de clave foránea" },
};

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Errores de validación de Zod -> 400 con detalles. pino-http ya
  // registra la request con su status code, así que aquí NO duplicamos
  // el log (los 4xx no son ruido operacional interesante).
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }

  // Errores de aplicación esperados. Idem: pino-http ya los registra.
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  if (err instanceof multer.MulterError) {
    // El exceso de tamaño tiene status canónico 413 (Request Entity Too Large)
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: `El archivo excede el tamaño máximo permitido (${MAX_UPLOAD_MB}MB)`,
        code: err.code,
      });
    }
    return res.status(400).json({
      error: err.message,
      code: err.code,
    });
  }

  // Errores conocidos de Prisma -> mapeo a HTTP.
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = String((err as { code: unknown }).code);
    const mapped = PRISMA_ERROR_MAP[code];
    if (mapped) {
      return res.status(mapped.status).json({
        error: mapped.message,
        code,
      });
    }
  }

  // Error genérico -> 500 sin exponer detalles internos.
  // Este sí requiere log explícito porque pino-http no captura el error
  // lançado dentro del handler async.
  req.log.error({ err }, "Unhandled exception");

  return res.status(500).json({
    error: "Internal Server Error",
    // Mantiene un id del request para soporte
    requestId: req.id,
  });
}
