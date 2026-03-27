import type { UserProfile } from "@/types/user";
import { getDatabase } from "../connection";
import { getCurrentUserId } from "../connection";

// Obtiene el perfil del usuario actual
export async function getUserProfile(): Promise<UserProfile | null> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return null;

  const db = await getDatabase();
  const profile = await db.get("userProfile", currentUserId);
  return profile || null;
}

// Obtiene el perfil del usuario o lo crea si no existe
export async function getOrCreateUserProfile(): Promise<UserProfile> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const db = await getDatabase();
  let profile = await db.get("userProfile", currentUserId);

  if (!profile) {
    profile = {
      id: currentUserId,
      createdAt: Date.now(),
      totalReadingTimeSeconds: 0,
    };
    await db.put("userProfile", profile);
  }

  return profile;
}

// Agrega tiempo de lectura al perfil del usuario
export async function updateUserReadingTime(
  additionalSeconds: number,
): Promise<void> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return;

  const profile = await getOrCreateUserProfile();
  profile.totalReadingTimeSeconds += additionalSeconds;

  const db = await getDatabase();
  await db.put("userProfile", profile);
}


// Obtiene el tiempo total de lectura de todos los libros del usuario
export async function getTotalReadingTime(): Promise<number> {
  const { getAllBooks } = await import("./books");
  const books = await getAllBooks();
  return books.reduce((total, book) => total + book.readingTimeSeconds, 0);
}
