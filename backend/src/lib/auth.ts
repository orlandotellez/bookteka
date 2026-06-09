import { betterAuth } from "better-auth";
import { pool } from "@/config/db.js";
import { env } from "@/config/env.js";
import { sendEmail } from "./email.js";

// En producción (HTTPS) usamos cookies secure; en desarrollo (HTTP local) no
const isProduction = env.BETTER_AUTH_URL.startsWith("https");

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: pool,
  emailAndPassword: {
    enabled: true,
    // Password reset config
    sendResetPassword: async ({ user, url }) => {
      console.log(`📧 Enviando email de reset a ${user.email}`);
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
    }
  },
  // Email Verification config
  emailVerification: {
    sendOnSignUp: true, // Enviar email de verificación al registrarse
    autoSignInAfterVerification: true, // Auto loguear después de verificar
    sendVerificationEmail: async ({ user, url }) => {
      console.log(`📧 Enviando email de verificación a ${user.email}`);
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
  trustedOrigins: [
    ...env.FRONTEND_URL.split(",").map(s => s.trim()),
    "http://localhost:5173",
    "http://192.168.0.9:8081",
  ],
  advanced: {
    useSecureCookies: isProduction,
    disableOriginCheck: true,
  },
  cookie: {
    name: "better-auth.session_token",
    secure: isProduction,
    sameSite: isProduction ? "lax" : "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: false,
    },
  },
});
