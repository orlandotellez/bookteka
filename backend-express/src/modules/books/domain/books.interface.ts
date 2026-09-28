import type { audit_log, book, Prisma, user_book } from "@prisma/client";
import type { CreateBookInput, UpsertUserBookInput } from "@/modules/books/domain/books.types.js";
/**
 * Contrato de persistencia de libros y progreso de lectura.
 *
 * La capa `application` depende de esta interfaz, nunca de Prisma
 * directo. `infrastructure/<feature>.prisma.repository.ts` es la única
 * implementación, y los tests inyectan un fake que cumple el contrato.
 */
export interface IBooksRepository {
  transaction: <T>(fn: (tx: IBooksRepository) => Promise<T>) => Promise<T>;
  getUserBooks: (userId: string) => Promise<user_book[] | null>;
  findByHash: (fileHash: string) => Promise<book | null>;
  createBook: (data: CreateBookInput) => Promise<book>;
  upsertUserBook: (data: UpsertUserBookInput) => Promise<user_book>;
  findUserBook: (userId: string, bookId: string) => Promise<user_book | null>;
  countOtherUsers: (bookId: string, userId: string) => Promise<number | null>;
  deleteUserBook: (id: string) => Promise<user_book>;
  deleteBook: (id: string) => Promise<book>;
  createAuditLog: (data: Prisma.audit_logUncheckedCreateInput) => Promise<audit_log>;
  updateUserBook: (
    id: string,
    data: Prisma.user_bookUncheckedUpdateInput,
  ) => Promise<user_book>;
}
