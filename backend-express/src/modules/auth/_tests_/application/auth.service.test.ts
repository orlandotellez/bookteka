/**
 * Tests de `AuthService` con un repositorio fake.
 *
 * Cubre lo que no tenía ninguna cobertura: la rotación de refresh token, el
 * isolate de la transacción en `register`, y el doble filtro de transporte.
 */
import { jest } from "@jest/globals";

jest.unstable_mockModule("@/config/prisma.js", () => ({
  dbPrisma: {},
}));

const sendEmailMock = jest.fn(async () => undefined);
jest.unstable_mockModule(
  "@/modules/auth/application/common/email.utils.js",
  () => ({
    sendEmail: sendEmailMock,
  }),
);

const { AuthService } = await import("@/modules/auth/application/auth.service.js");
const { signAccessToken, signRefreshToken } = await import(
  "@/modules/auth/application/common/token.utils.js"
);
const { AppError } = await import("@/core/errors/AppError.js");
const { makeAuthRepo, makeUser, makeAccount, makeSession, makeVerification } =
  await import("@/tests/fakes.js");

const svc = (repo: unknown) => new AuthService(repo as never);

beforeEach(() => {
  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue(undefined);
});

// ── login ─────────────────────────────────────────────────────────────────

describe("AuthService.login", () => {
  it("devuelve tokens y el usuario público con credenciales válidas", async () => {
    const { hashPassword } = await import(
      "@/modules/auth/application/common/crypto.utils.js"
    );
    const passwordHash = await hashPassword("MiPassword123");

    const user = makeUser();
    const repo = makeAuthRepo({
      findUserByEmail: jest.fn(async () => user),
      findAccountByProvider: jest.fn(async () =>
        makeAccount({ password: passwordHash }),
      ),
    });

    const result = await svc(repo).login({
      email: user.email,
      password: "MiPassword123",
    });

    expect(result.user.id).toBe("user1");
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    // El hash no vuelve al cliente
    expect(JSON.stringify(result)).not.toContain("hashed");
  });

  it("normaliza el email a minúsculas al buscar", async () => {
    const repo = makeAuthRepo({
      findUserByEmail: jest.fn(async () => null),
    });

    await expect(
      svc(repo).login({ email: "USER@Test.COM", password: "x" }),
    ).rejects.toThrow(new AppError("UNAUTHORIZED", 401, "Credenciales inválidas"));

    expect(repo.findUserByEmail).toHaveBeenCalledWith("user@test.com");
  });

  it("rechaza con 401 si el usuario no existe", async () => {
    const repo = makeAuthRepo({ findUserByEmail: jest.fn(async () => null) });

    await expect(
      svc(repo).login({ email: "nadie@test.com", password: "x" }),
    ).rejects.toThrow(new AppError("UNAUTHORIZED", 401, "Credenciales inválidas"));
  });

  it("rechaza con 401 si la cuenta no tiene password", async () => {
    const repo = makeAuthRepo({
      findUserByEmail: jest.fn(async () => makeUser()),
      findAccountByProvider: jest.fn(async () =>
        makeAccount({ password: null }),
      ),
    });

    await expect(
      svc(repo).login({ email: "user@test.com", password: "x" }),
    ).rejects.toThrow(new AppError("UNAUTHORIZED", 401, "Credenciales inválidas"));
  });
});

// ── register ──────────────────────────────────────────────────────────────

describe("AuthService.register", () => {
  it("rechaza con 409 si el correo ya está registrado", async () => {
    const repo = makeAuthRepo({ userExistsByEmail: jest.fn(async () => true) });

    await expect(
      svc(repo).register({
        name: "Carlos",
        email: "carlos@test.com",
        password: "MiPassword123",
      }),
    ).rejects.toThrow(
      new AppError("CONFLICT", 409, "El correo ya está registrado"),
    );
    expect(repo.createUser).not.toHaveBeenCalled();
  });

  it("crea el user y su account dentro de la misma transacción", async () => {
    const repo = makeAuthRepo({ userExistsByEmail: jest.fn(async () => false) });

    await svc(repo).register({
      name: "Carlos",
      email: "Carlos@Test.com",
      password: "MiPassword123",
    });

    expect(repo.transaction).toHaveBeenCalled();
    expect(repo.createUser).toHaveBeenCalledWith({
      name: "Carlos",
      email: "carlos@test.com", // normalizado
      role: "user",
      email_verified: false,
    });
    expect(repo.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({ provider_id: "credentials" }),
    );
  });

  it("crea un código de verificación después de crear la cuenta", async () => {
    const repo = makeAuthRepo({ userExistsByEmail: jest.fn(async () => false) });

    await svc(repo).register({
      name: "Carlos",
      email: "carlos@test.com",
      password: "MiPassword123",
    });

    expect(repo.createVerification).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "carlos@test.com" }),
    );
  });
});

// ── refresh ───────────────────────────────────────────────────────────────

describe("AuthService.refresh", () => {
  it("rota el token: borra la sesión vieja y emite una nueva", async () => {
    const token = signRefreshToken("user1");
    const repo = makeAuthRepo({
      findSessionByToken: jest.fn(async () => makeSession({ id: "s1", token })),
      findUserById: jest.fn(async () => makeUser()),
    });

    const result = await svc(repo).refresh(token);

    expect(repo.deleteSessionByIdAndToken).toHaveBeenCalledWith("s1", token);
    expect(repo.createSession).toHaveBeenCalled();
    expect(result.message).toBe("Token renovado correctamente");
    expect(result.accessToken).toBeDefined;
    expect(result.refreshToken).not.toBe(token); // el token nuevo es distinto
  });

  it("falla con 401 si otro request ya consumió el token", async () => {
    const token = signRefreshToken("user1");
    const repo = makeAuthRepo({
      findSessionByToken: jest.fn(async () => makeSession({ id: "s1", token })),
      findUserById: jest.fn(async () => makeUser()),
      // compare-and-delete devuelve 0: la fila ya no existe
      deleteSessionByIdAndToken: jest.fn(async () => 0),
    });

    await expect(svc(repo).refresh(token)).rejects.toThrow(
      new AppError("UNAUTHORIZED", 401, "Sesión ya renovada o revocada"),
    );
  });

  it("rechaza un token mal firmado", async () => {
    const repo = makeAuthRepo();

    await expect(svc(repo).refresh("no-es-un-jwt")).rejects.toThrow(
      new AppError("UNAUTHORIZED", 401, "Refresh token inválido o expirado"),
    );
  });

  it("borra la sesión y falla si ya expiró", async () => {
    const token = signRefreshToken("user1");
    const repo = makeAuthRepo({
      findSessionByToken: jest.fn(async () =>
        makeSession({ token, expires_at: new Date(Date.now() - 1000) }),
      ),
    });

    await expect(svc(repo).refresh(token)).rejects.toThrow(
      new AppError("UNAUTHORIZED", 401, "Sesión expirada"),
    );
    expect(repo.deleteSessionsByToken).toHaveBeenCalledWith(token);
  });

  it("falla si la sesión no está en la base", async () => {
    const token = signRefreshToken("user1");
    const repo = makeAuthRepo({ findSessionByToken: jest.fn(async () => null) });

    await expect(svc(repo).refresh(token)).rejects.toThrow(
      new AppError("UNAUTHORIZED", 401, "Sesión inválida"),
    );
  });
});

// ── getSession ────────────────────────────────────────────────────────────

describe("AuthService.getSession", () => {
  it("resuelve la sesión con un access token válido en el header", async () => {
    const user = makeUser();
    const token = signAccessToken(user);
    const repo = makeAuthRepo({ findUserById: jest.fn(async () => user) });

    const session = await svc(repo).getSession({
      headers: { "x-session-token": token },
    });

    expect(session?.user.id).toBe("user1");
    expect(session?.session.userId).toBe("user1");
    // El access token es stateless: el id de sesión es sintético
    expect(session?.session.id.startsWith("access:")).toBe(true);
  });

  it("acepta el token por Authorization: Bearer", async () => {
    const user = makeUser();
    const token = signAccessToken(user);
    const repo = makeAuthRepo({ findUserById: jest.fn(async () => user) });

    const session = await svc(repo).getSession({
      headers: { authorization: `Bearer ${token}` },
    });

    expect(session?.user.id).toBe("user1");
  });

  it("acepta el token por cookie", async () => {
    const user = makeUser();
    const token = signAccessToken(user);
    const repo = makeAuthRepo({ findUserById: jest.fn(async () => user) });

    const session = await svc(repo).getSession({
      headers: { cookie: `otro=1; accessToken=${token}` },
    });

    expect(session?.user.id).toBe("user1");
  });

  it("devuelve null si no hay token", async () => {
    const repo = makeAuthRepo();

    expect(await svc(repo).getSession({ headers: {} })).toBeNull();
  });

  it("devuelve null si el token está mal firmado", async () => {
    const repo = makeAuthRepo();

    expect(
      await svc(repo).getSession({ headers: { "x-session-token": "basura" } }),
    ).toBeNull();
  });

  it("devuelve null si el usuario fue borrado lógicamente", async () => {
    const user = makeUser();
    const token = signAccessToken(user);
    // findUserById filtra deleted_at: si está soft-deleted devuelve null
    const repo = makeAuthRepo({ findUserById: jest.fn(async () => null) });

    expect(
      await svc(repo).getSession({ headers: { "x-session-token": token } }),
    ).toBeNull();
  });
});

// ── logout ────────────────────────────────────────────────────────────────

describe("AuthService.logout", () => {
  it("revoca la sesión del refresh token", async () => {
    const repo = makeAuthRepo();

    const result = await svc(repo).logout("refresh-abc");

    expect(repo.deleteSessionsByToken).toHaveBeenCalledWith("refresh-abc");
    expect(result.message).toBe("Sesión cerrada correctamente");
  });

  it("no falla si no viene refresh token", async () => {
    const repo = makeAuthRepo();

    const result = await svc(repo).logout(undefined);

    expect(repo.deleteSessionsByToken).not.toHaveBeenCalled();
    expect(result.message).toBe("Sesión cerrada correctamente");
  });
});

// ── verificación de correo ────────────────────────────────────────────────

describe("AuthService.verifyEmail", () => {
  it("marca el email como verificado y borra el código", async () => {
    const repo = makeAuthRepo({
      findVerification: jest.fn(async () => makeVerification()),
      findUserByEmail: jest.fn(async () => makeUser()),
    });

    const result = await svc(repo).verifyEmail("user@test.com", "ABC123");

    expect(repo.markEmailVerified).toHaveBeenCalledWith("user1");
    expect(repo.deleteVerificationsByIdentifier).toHaveBeenCalledWith(
      "user@test.com",
    );
    expect(result.message).toBe("Correo verificado correctamente");
  });

  it("rechaza un código inexistente", async () => {
    const repo = makeAuthRepo({ findVerification: jest.fn(async () => null) });

    await expect(
      svc(repo).verifyEmail("user@test.com", "NOPE00"),
    ).rejects.toThrow(
      new AppError("UNAUTHORIZED", 401, "Código de verificación inválido"),
    );
  });

  it("borra el código y falla si expiró", async () => {
    const repo = makeAuthRepo({
      findVerification: jest.fn(async () =>
        makeVerification({ expires_at: new Date(Date.now() - 1000) }),
      ),
    });

    await expect(
      svc(repo).verifyEmail("user@test.com", "ABC123"),
    ).rejects.toThrow(
      new AppError("UNAUTHORIZED", 401, "Código de verificación expirado"),
    );
    expect(repo.deleteVerificationsByIdentifier).toHaveBeenCalled();
    expect(repo.markEmailVerified).not.toHaveBeenCalled();
  });
});

describe("AuthService.createVerification", () => {
  it("genera un código de 6 caracteres y lo persiste", async () => {
    const repo = makeAuthRepo();

    const result = await svc(repo).createVerification("user@test.com");

    expect(repo.createVerification).toHaveBeenCalled();
    const [args] = (repo.createVerification as jest.Mock).mock.calls[0] as [
      { value: string },
    ];
    expect(args.value).toHaveLength(6);
    expect(args.value).toMatch(/^[A-Z0-9]{6}$/);
    // El mensaje es genérico: no revela si el correo existe
    expect(result.message).toBe("Si el correo existe, se envió un código");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("borra los códigos previos del mismo identifier", async () => {
    const repo = makeAuthRepo();

    await svc(repo).createVerification("user@test.com");

    expect(repo.deleteVerificationsByIdentifier).toHaveBeenCalledWith(
      "user@test.com",
    );
  });
});

describe("AuthService: envío del correo de verificación", () => {
  it("register envía el correo con el código para el email normalizado", async () => {
    const repo = makeAuthRepo({ userExistsByEmail: jest.fn(async () => false) });

    await svc(repo).register({
      name: "Carlos",
      email: "CARLOS@Test.com",
      password: "MiPassword123",
    });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [params] = (sendEmailMock as jest.Mock).mock.calls[0] as [
      { to: string },
    ];
    expect(params.to).toBe("carlos@test.com");
  });

  it("createVerification manda el código en el cuerpo, no en el asunto", async () => {
    const repo = makeAuthRepo();

    await svc(repo).createVerification("user@test.com");

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [params] = (sendEmailMock as jest.Mock).mock.calls[0] as [
      { to: string; subject: string; html: string },
    ];
    expect(params.to).toBe("user@test.com");
    expect(params.subject).not.toMatch(/[A-Z0-9]{6}/);
    expect(params.html).toMatch(/[A-Z0-9]{6}/);
  });

  it("la verificación se persiste y el fallo queda en el logger", async () => {
    sendEmailMock.mockRejectedValue(new Error("resend down"));
    const repo = makeAuthRepo();

    const { logger } = await import("@/config/logger.js");
    const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => logger);

    const result = await svc(repo).createVerification("user@test.com");

    expect(repo.createVerification).toHaveBeenCalled();
    expect(result.message).toBe("Si el correo existe, se envió un código");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "Failed to send verification email",
    );
    errorSpy.mockRestore();
  });

  it("no imprime el código por consola", async () => {
    const consoleSpy = jest.spyOn(console, "info").mockImplementation(() => undefined);
    const repo = makeAuthRepo();

    await svc(repo).createVerification("user@test.com");

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Código de verificación"),
    );
    consoleSpy.mockRestore();
  });
});
