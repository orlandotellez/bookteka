import { Router } from "express";
import { getUserStreak, completeDay, initializeStreak } from "@/controllers/streak.controller.js";

export const streak: Router = Router();

// Obtener racha del usuario
streak.get("/streak", getUserStreak);

// Completar el día actual
streak.post("/streak/complete", completeDay);

// Inicializar racha manualmente
streak.post("/streak/initialize", initializeStreak);
