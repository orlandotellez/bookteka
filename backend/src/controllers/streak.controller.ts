import { Request, Response } from "express";
import { auth } from "@/lib/auth.js";
import { StreakService } from "@/services/streak.service.js";
import { AppError } from "@/helper/errors.js";

// Obtener la racha del usuario
export const getUserStreak = async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const result = await StreakService.getUserStreak(session.user.id);
    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Error getting streak:", err);
    res.status(500).json({ error: "Error al obtener la racha" });
  }
};

// Completar el día actual (avanza la racha)
export const completeDay = async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const clientTimestamp = req.body?.clientTimestamp;
    const clientDate = req.body?.clientDate;

    const result = await StreakService.completeDay(
      session.user.id,
      clientDate,
      clientTimestamp
    );

    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Error completing day:", err);
    res.status(500).json({ error: "Error al completar el día" });
  }
};

// Inicializar la racha manualmente (para testing/reset)
export const initializeStreak = async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const { startDate } = req.body;
    if (!startDate) {
      return res.status(400).json({ error: "Se requiere la fecha de inicio" });
    }

    const result = await StreakService.initializeStreak(session.user.id, startDate);
    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Error initializing streak:", err);
    res.status(500).json({ error: "Error al inicializar la racha" });
  }
};
