import { Router } from "express";
import { validate } from "@/core/http/validate.js";
import {
  LoginSchema,
  RegisterSchema,
  ResendVerificationSchema,
  VerifyEmailSchema,
} from "@/modules/auth/presentation/auth.dto.js";
import {
  register,
  login,
  refresh,
  logout,
  getSession,
  verifyEmail,
  resendVerification,
} from "@/modules/auth/presentation/auth.controller.js";

export const authRoutes: Router = Router();

authRoutes.post("/register", validate({ body: RegisterSchema }), register);

authRoutes.post("/login", validate({ body: LoginSchema }), login);

authRoutes.post("/refresh", refresh);

authRoutes.post("/logout", logout);

authRoutes.get("/get-session", getSession);

authRoutes.post("/verify-email", validate({ body: VerifyEmailSchema }), verifyEmail);

authRoutes.post(
  "/resend-verification",
  validate({ body: ResendVerificationSchema }),
  resendVerification,
);
