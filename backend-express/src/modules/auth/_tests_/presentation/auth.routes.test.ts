import { jest } from "@jest/globals";
import request from "supertest";
import { hashPassword } from "@/modules/auth/application/common/crypto.utils.js";
import {
  makeAuthRepo,
  makeUser,
  makeAccount,
  makeSession,
  makeVerification,
} from "@/tests/fakes.js";

const sendEmailMock = jest.fn(async () => undefined);

function mockAuthRepo(overrides: ReturnType<typeof makeAuthRepo>) {
  jest.unstable_mockModule(
    "@/modules/auth/infrastructure/auth.prisma.repository",
    () => ({
      authPrismaRepository: overrides,
    }),
  );
}

function mockAppPrereqs() {
  jest.unstable_mockModule("@/config/prisma", () => ({ dbPrisma: {} }));
  jest.unstable_mockModule("@/core/storage/s3.client", () => ({ r2: {} }));
  jest.unstable_mockModule(
    "@/modules/auth/application/common/email.utils",
    () => ({ sendEmail: sendEmailMock }),
  );
}

async function mountApp() {
  //@ts-ignore
  const mod = await import("@/app");
  return mod.default;
}

describe("POST /api/v1/auth/register", () => {
  beforeEach(() => {
    jest.resetModules();
    sendEmailMock.mockReset();
  });

  it("devuelve 201 con usuario, tokens y sesión persistida", async () => {
    const repo = makeAuthRepo({
      userExistsByEmail: jest.fn(async () => false),
      createUser: jest.fn(async () => makeUser({ email: "carlos@test.com" })),
      createAccount: jest.fn(async () => makeAccount() as never),
      createVerification: jest.fn(async () => makeVerification() as never),
      createSession: jest.fn(async () => makeSession() as never),
    });
    mockAuthRepo(repo);
    mockAppPrereqs();

    const app = await mountApp();
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Carlos", email: "carlos@test.com", password: "MiPassword123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("carlos@test.com");
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(repo.createSession).toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "carlos@test.com" }),
    );
  });

  it("devuelve 409 cuando el correo ya está registrado", async () => {
    const repo = makeAuthRepo({
      userExistsByEmail: jest.fn(async () => true),
    });
    mockAuthRepo(repo);
    mockAppPrereqs();

    const app = await mountApp();
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Carlos", email: "carlos@test.com", password: "MiPassword123" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONFLICT");
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(() => {
    jest.resetModules();
    sendEmailMock.mockReset();
  });

  it("devuelve 200 con tokens y cookie para credenciales válidas", async () => {
    const passwordHash = await hashPassword("MiPassword123");
    const repo = makeAuthRepo({
      findUserByEmail: jest.fn(async () => makeUser()),
      findAccountByProvider: jest.fn(async () => makeAccount({ password: passwordHash })),
      createSession: jest.fn(async () => makeSession() as never),
    });
    mockAuthRepo(repo);
    mockAppPrereqs();

    const app = await mountApp();
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "carlos@test.com", password: "MiPassword123" });

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"][0]).toContain("accessToken=");
    expect(repo.createSession).toHaveBeenCalled();
  });

  it("devuelve 401 para credenciales inválidas", async () => {
    const repo = makeAuthRepo({
      findUserByEmail: jest.fn(async () => makeUser()),
      findAccountByProvider: jest.fn(async () => makeAccount({ password: "hash-de-otra" })),
    });
    mockAuthRepo(repo);
    mockAppPrereqs();

    const app = await mountApp();
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "carlos@test.com", password: "clave-incorrecta" });

    expect(res.status).toBe(401);
    expect(repo.createSession).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/auth/refresh", () => {
  beforeEach(() => {
    jest.resetModules();
    sendEmailMock.mockReset();
  });

  it("rota la sesión: borra la vieja, crea la nueva y devuelve tokens", async () => {
    const { signRefreshToken } = await import(
      "@/modules/auth/application/common/token.utils.js"
    );
    const refreshToken = signRefreshToken("user1");

    const repo = makeAuthRepo({
      findSessionByToken: jest.fn(async () => makeSession({ id: "s1", token: refreshToken })),
      findUserById: jest.fn(async () => makeUser()),
      deleteSessionByIdAndToken: jest.fn(async () => 1),
      createSession: jest.fn(async () => makeSession() as never),
    });
    mockAuthRepo(repo);
    mockAppPrereqs();

    const app = await mountApp();
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(repo.deleteSessionByIdAndToken).toHaveBeenCalledWith("s1", refreshToken);
    expect(repo.createSession).toHaveBeenCalled();
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  it("devuelve 401 si el refresh token ya fue consumido", async () => {
    const { signRefreshToken } = await import(
      "@/modules/auth/application/common/token.utils.js"
    );
    const refreshToken = signRefreshToken("user1");

    const repo = makeAuthRepo({
      findSessionByToken: jest.fn(async () => makeSession({ id: "s1", token: refreshToken })),
      findUserById: jest.fn(async () => makeUser()),
      deleteSessionByIdAndToken: jest.fn(async () => 0),
    });
    mockAuthRepo(repo);
    mockAppPrereqs();

    const app = await mountApp();
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("devuelve 401 si no viene refresh token", async () => {
    const repo = makeAuthRepo();
    mockAuthRepo(repo);
    mockAppPrereqs();

    const app = await mountApp();
    const res = await request(app).post("/api/v1/auth/refresh").send({});

    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/auth/get-session", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("devuelve 200 con la sesión del access token", async () => {
    const user = makeUser();
    const repo = makeAuthRepo({ findUserById: jest.fn(async () => user) });
    const { signAccessToken } = await import(
      "@/modules/auth/application/common/token.utils.js"
    );
    mockAuthRepo(repo);
    mockAppPrereqs();

    const app = await mountApp();
    const res = await request(app)
      .get("/api/v1/auth/get-session")
      .set("x-session-token", signAccessToken(user));

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe("user1");
  });

  it("devuelve 401 sin token", async () => {
    const repo = makeAuthRepo();
    mockAuthRepo(repo);
    mockAppPrereqs();

    const app = await mountApp();
    const res = await request(app).get("/api/v1/auth/get-session");

    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/verify-email", () => {
  beforeEach(() => {
    jest.resetModules();
    sendEmailMock.mockReset();
  });

  it("marca el correo verificado y borra el código", async () => {
    const repo = makeAuthRepo({
      findVerification: jest.fn(async () => makeVerification()),
      findUserByEmail: jest.fn(async () => makeUser()),
      markEmailVerified: jest.fn(async () => makeUser({ email_verified: true })),
      deleteVerificationsByIdentifier: jest.fn(async () => 1),
    });
    mockAuthRepo(repo);
    mockAppPrereqs();

    const app = await mountApp();
    const res = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ identifier: "user@test.com", code: "ABC123" });

    expect(res.status).toBe(200);
    expect(repo.markEmailVerified).toHaveBeenCalledWith("user1");
  });

  it("devuelve 401 para un código inválido", async () => {
    const repo = makeAuthRepo({ findVerification: jest.fn(async () => null) });
    mockAuthRepo(repo);
    mockAppPrereqs();

    const app = await mountApp();
    const res = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ identifier: "user@test.com", code: "NOPE00" });

    expect(res.status).toBe(401);
  });
});