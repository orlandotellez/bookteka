import crypto from "node:crypto";
import bcrypt from "bcrypt";

/** Costo de bcrypt. 10 es el default de la librería. */
const BCRYPT_COST = 10;

/** Longitud del código de verificación de correo. */
const VERIFICATION_CODE_LENGTH = 6;

/** Alfabeto del código: sin caracteres que se confunden (0/O, 1/I/L). */
const VERIFICATION_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Hashea una contraseña en texto plano. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/** Compara una contraseña en texto plano contra su hash. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Genera el código de verificación de correo: 6 caracteres de `A-Z0-9`. */
export function generateVerificationCode(): string {
  return Array.from(
    { length: VERIFICATION_CODE_LENGTH },
    () =>
      VERIFICATION_ALPHABET[
        Math.floor(Math.random() * VERIFICATION_ALPHABET.length)
      ]!,
  ).join("");
}

/** Identificador único para el claim `jti` del refresh token. */
export function generateTokenId(): string {
  return crypto.randomUUID();
}
