import crypto from "crypto";

export const normalizedFileName = (name: string) => {
  return name
    .replace(/\s+/g, "-")           // Reemplazar espacios por guiones
    .replace(/[^a-zA-Z0-9.\-_]/g, ""); // Eliminar caracteres especiales

}

export const generateFileHash = (file: any) => {
  return crypto.createHash("sha256").update(file.buffer).digest("hex")
}

