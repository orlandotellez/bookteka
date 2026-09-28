import { jest } from "@jest/globals";
import type { account, book, session, user, user_book, user_streak, verification, bookmark } from "@prisma/client";
import type { IAuthRepository } from "@/modules/auth/domain/auth.interface.js";
import type { IBooksRepository } from "@/modules/books/domain/books.interface.js";
import type { IBookmarksRepository } from "@/modules/bookmarks/domain/bookmarks.interface.js";
import type { IStreakRepository } from "@/modules/streak/domain/streak.interface.js";

/**
 * Fakes de los repositorios, para los tests de la capa `application`.
 *
 * Cada fake devuelve por defecto un valor inofensivo y usa `jest.fn()`, así que
 * un test solo declara los métodos que le interesan:
 *
 * ```ts
 * const repo = makeBooksRepo({ findUserBook: jest.fn(async () => ({ id: "ub1" })) });
 * ```
 */

// ── auth ──────────────────────────────────────────────────────────────────

export function makeUser(overrides: Partial<user> = {}): user {
  return {
    id: "user1",
    name: "Usuario",
    email: "user@test.com",
    email_verified: false,
    phone: null,
    image: null,
    role: "user",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-01T00:00:00.000Z"),
    deleted_at: null,
    ...overrides,
  } as user;
}

export function makeAccount(overrides: Partial<account> = {}): account {
  return {
    id: "acc1",
    account_id: "user1",
    provider_id: "credentials",
    user_id: "user1",
    access_token: null,
    refresh_token: null,
    id_token: null,
    scope: null,
    password: "hashed-not-valid",
    access_token_expires_at: null,
    refresh_token_expires_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as account;
}

export function makeSession(overrides: Partial<session> = {}): session {
  return {
    id: "sess1",
    user_id: "user1",
    token: "refresh-token",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ip_address: null,
    user_agent: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as session;
}

export function makeVerification(overrides: Partial<verification> = {}): verification {
  return {
    id: "v1",
    identifier: "user@test.com",
    value: "ABC123",
    expires_at: new Date(Date.now() + 15 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as verification;
}

export const makeAuthRepo = (
  overrides: Partial<IAuthRepository> = {},
): IAuthRepository => {
  // Por defecto la transacción ejecuta el callback con el mismo fake, así un
  // test puede observar las escrituras sin configurar nada. Referencia local:
  // los arrow functions no tienen `this` propio (ESM strict), así que el
  // "this" de un objeto literal no sirve acá.
  const base = {
    findUserById: jest.fn(async () => null),
    findUserByEmail: jest.fn(async () => null),
    userExistsByEmail: jest.fn(async () => false),
    createUser: jest.fn(async () => makeUser()),
    markEmailVerified: jest.fn(async () => makeUser({ email_verified: true })),
    findAccountByProvider: jest.fn(async () => null),
    createAccount: jest.fn(async () => makeAccount()),
    createSession: jest.fn(async () => makeSession()),
    findSessionByToken: jest.fn(async () => null),
    deleteSessionByIdAndToken: jest.fn(async () => 1),
    deleteSessionsByToken: jest.fn(async () => 1),
    findVerification: jest.fn(async () => null),
    deleteVerificationsByIdentifier: jest.fn(async () => 0),
    createVerification: jest.fn(async () => makeVerification()),
  };
  // El callback de la transacción recibe el objeto fusionado (base + overrides):
  // un test que overrideea un método tiene que ver ese override cuando el
  // service escribe dentro de la transacción.
  const merged = { ...base, ...overrides };
  const repo = {
    ...merged,
    transaction: jest.fn(
      (fn: (tx: IAuthRepository) => Promise<unknown>) => fn(merged as never),
    ) as unknown as IAuthRepository["transaction"],
  } as unknown as IAuthRepository;
  return repo;
};

// ── books ─────────────────────────────────────────────────────────────────

export function makeUserBook(overrides: Partial<user_book> = {}): user_book {
  return {
    id: "ub1",
    userId: "user1",
    bookId: "book1",
    currentPage: 0,
    scrollPosition: 0,
    readingTimeSeconds: 0,
    lastReadAt: null,
    createdAt: new Date(),
    ...overrides,
  } as user_book;
}

export function makeBook(overrides: Partial<book> = {}): book {
  return {
    id: "book1",
    title: "El Quijote",
    author: "Cervantes",
    fileUrl: "https://example.test/book.pdf",
    fileKey: "books/user1/1-quijote.pdf",
    fileHash: "hash1",
    size: 1000,
    createdAt: new Date(),
    ...overrides,
  } as book;
}

export const makeBooksRepo = (overrides: Partial<IBooksRepository> = {}): IBooksRepository =>
  ({
    getUserBooks: jest.fn(async () => []),
    findByHash: jest.fn(async () => null),
    createBook: jest.fn(async () => makeBook()),
    upsertUserBook: jest.fn(async () => makeUserBook()),
    findUserBook: jest.fn(async () => null),
    countOtherUsers: jest.fn(async () => 0),
    deleteUserBook: jest.fn(async () => makeUserBook()),
    deleteBook: jest.fn(async () => makeBook()),
    createAuditLog: jest.fn(async () => ({}) as never),
    updateUserBook: jest.fn(async () => makeUserBook()),
    ...overrides,
  }) as unknown as IBooksRepository;

// ── bookmarks ─────────────────────────────────────────────────────────────

export function makeBookmark(overrides: Partial<bookmark> = {}): bookmark {
  return {
    id: "bm1",
    userId: "user1",
    userBookId: "ub1",
    name: "Capítulo 1",
    pageNumber: 1,
    textPreview: null,
    createdAt: new Date(),
    ...overrides,
  } as bookmark;
}

export const makeBookmarksRepo = (
  overrides: Partial<IBookmarksRepository> = {},
): IBookmarksRepository =>
  ({
    findUserBookAccess: jest.fn(async () => null),
    getBookmarksByUserBookId: jest.fn(async () => []),
    createBookmark: jest.fn(async () => makeBookmark()),
    findBookmark: jest.fn(async () => null),
    updateBookmark: jest.fn(async () => makeBookmark()),
    deleteBookmark: jest.fn(async () => makeBookmark()),
    ...overrides,
  }) as unknown as IBookmarksRepository;

// ── streak ────────────────────────────────────────────────────────────────

export function makeStreak(overrides: Partial<user_streak> = {}): user_streak {
  return {
    id: "st1",
    userId: "user1",
    currentStreak: 0,
    startDate: null,
    lastActiveDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as user_streak;
}

export const makeStreakRepo = (overrides: Partial<IStreakRepository> = {}): IStreakRepository =>
  ({
    findByUserId: jest.fn(async () => null),
    createStreak: jest.fn(async () => makeStreak()),
    updateStreak: jest.fn(async () => makeStreak()),
    updateStreakConditionally: jest.fn(async () => makeStreak()),
    upsertStreak: jest.fn(async () => makeStreak()),
    ...overrides,
  }) as unknown as IStreakRepository;
