import type { Request, Response } from "express";
import { auth } from "@/modules/auth/application/auth.service.js";
import { AppError } from "@/core/errors/AppError.js";

/**
 * El cliente web puede enviar el refresh token en el body; Tauri lo envía
 * mediante `x-refresh-token`. La capa de presentación acepta ambos.
 */
function refreshTokenFromRequest(req: Request): string | undefined {
  const fromBody =
    typeof req.body?.refreshToken === "string" ? req.body.refreshToken : undefined;
  return fromBody ?? auth.tokens.fromHeaders(req.headers).refreshToken;
}

function setTokens(
  res: Response,
  result: { accessToken: string; refreshToken: string },
): void {
  auth.cookies.set(res, result.accessToken, result.refreshToken);
}

export const register = async (req: Request, res: Response): Promise<void> => {
  const result = await auth.api.register(req.body, req);
  setTokens(res, result);
  res.status(201).json(result);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const result = await auth.api.login(req.body, req);
  setTokens(res, result);
  res.json(result);
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const token = refreshTokenFromRequest(req);
  if (!token) throw new AppError("UNAUTHORIZED", 401, "Refresh token requerido");

  const result = await auth.api.refresh(token, req);
  setTokens(res, result);
  res.json(result);
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const result = await auth.api.logout(refreshTokenFromRequest(req));
  auth.cookies.clear(res);
  res.json(result);
};

export const getSession = async (req: Request, res: Response): Promise<void> => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    res.status(401).json({ error: "No autorizado", code: "UNAUTHORIZED" });
    return;
  }
  res.json(session);
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const result = await auth.api.verifyEmail(req.body.identifier, req.body.code);
  res.json(result);
};

export const resendVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await auth.api.createVerification(req.body.email);
  res.json(result);
};
