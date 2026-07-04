import { betterAuth } from "better-auth";
import { pool } from "@/config/db.js";
import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";
import { ALLOWED_ORIGINS, isProductionEnv, originsForRequest } from "@/lib/origins.js";
import { sendEmail } from "./email.js";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: pool,
  // IMPORTANTE: better-auth usa el array `trustedOrigins` directamente
  // para escribir `Access-Control-Allow-Origin` y Node lo serializa con
  // join(","), produciendo un header inválido ("http://a,http://b")
  // que el navegador siempre rechaza. Devolvemos SIEMPRE un array de
  // una sola entrada — el Origin que matchea —, o vacío si no matchea.
  // Así better-auth emite un header single-origin correcto.
  trustedOrigins: async (request?: Request) => {
    if (!request) return [];
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    const valid = originsForRequest({ headers } as Parameters<typeof originsForRequest>[0]);
    const reqOrigin = request.headers.get("origin");
    if (reqOrigin && valid.includes(reqOrigin)) {
      return [reqOrigin];
    }
    return [];
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      logger.info({ email: user.email }, "Sending password reset email");
      await sendEmail({
        to: user.email,
        subject: "🔐 Reset your password - Bookteka",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h1>Reset your password</h1>
            <p>Hi ${user.name || "there"},</p>
            <p>You requested to reset your password. Click the button below:</p>
            <a href="${url}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Reset Password
            </a>
            <p>Or copy this link: <br><small>${url}</small></p>
            <p>If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      logger.info({ email: user.email }, "Sending verification email");
      await sendEmail({
        to: user.email,
        subject: "✅ Verify your email - Bookteka",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h1>Verify your email</h1>
            <p>Hi ${user.name || "there"},</p>
            <p>Welcome to Bookteka! Click the button below to verify your email:</p>
            <a href="${url}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Verify Email
            </a>
            <p>Or copy this link: <br><small>${url}</small></p>
            <p>If you didn't create an account, ignore this email.</p>
          </div>
        `,
      });
    },
  },
  advanced: {
    useSecureCookies: isProductionEnv,
  },
  cookie: {
    name: "better-auth.session_token",
    secure: isProductionEnv,
    sameSite: isProductionEnv ? "none" : "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: false,
    },
  },
});
