import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const LoginSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const VerifyEmailSchema = z.object({
  identifier: z.string().trim().email("Correo inválido"),
  code: z.string().trim().min(6, "Código inválido"),
});

export const ResendVerificationSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
});

export const SessionIdSchema = z.object({
  sessionId: z.string().uuid("ID de sesión inválido"),
});
