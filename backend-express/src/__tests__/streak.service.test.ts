// @ts-nocheck
import { jest } from "@jest/globals";

jest.unstable_mockModule("@/config/prisma.js", () => ({
  dbPrisma: {
    user_streak: {},
  },
}));

jest.unstable_mockModule("@/lib/logger.js", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  },
}));

const { StreakService } = await import("@/services/streak.service.js");
const { AppError } = await import("@/helper/errors.js");

const makeMockRepo = (overrides: any = {}): any => ({
  findByUserId: jest.fn(async () => null),
  createStreak: jest.fn(async () => undefined),
  updateStreak: jest.fn(async () => undefined),
  updateStreakConditionally: jest.fn(async () => undefined),
  upsertStreak: jest.fn(async () => undefined),
  ...overrides,
});

describe("StreakService.getUserStreak", () => {
  it("retorna la racha existente formateada (hasCompletedToday=true si lastActive === hoy)", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const repo = makeMockRepo({
      findByUserId: jest.fn(async () => ({
        userId: "user1",
        currentStreak: 5,
        startDate: new Date("2024-01-01"),
        lastActiveDate: today,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });
    const svc = new StreakService(repo as never);

    const result = await svc.getUserStreak("user1");

    expect(result.currentStreak).toBe(5);
    expect(result.hasCompletedToday).toBe(true);
    expect(repo.createStreak).not.toHaveBeenCalled();
  });

  it("crea una racha nueva con `currentStreak=0` cuando no existe", async () => {
    const newStreak = {
      userId: "user1",
      currentStreak: 0,
      startDate: null,
      lastActiveDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repo = makeMockRepo({
      findByUserId: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newStreak),
      createStreak: jest.fn(async () => newStreak),
    });
    const svc = new StreakService(repo as never);

    const result = await svc.getUserStreak("user1");

    expect(result.currentStreak).toBe(0);
    expect(result.hasCompletedToday).toBe(false);
    expect(repo.createStreak).toHaveBeenCalledWith({
      userId: "user1",
      currentStreak: 0,
      startDate: null,
      lastActiveDate: null,
      createdAt: expect.any(Date),
    });
  });

  it("re-attempt tras race P2002: si createStreak tira P2002, el service re-busca", async () => {
    const { Prisma } = await import("@prisma/client");
    const raceWinner = {
      userId: "user1",
      currentStreak: 3,
      startDate: null,
      lastActiveDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repo = makeMockRepo({
      findByUserId: jest
        .fn()
        .mockResolvedValueOnce(null) // primera consulta: not found
        .mockResolvedValueOnce(raceWinner), // tras P2002 re-busca: gana el rival
      createStreak: jest.fn(async () => {
        throw new Prisma.PrismaClientKnownRequestError("Race", {
          code: "P2002",
          clientVersion: "test",
        });
      }),
    });
    const svc = new StreakService(repo as never);

    const result = await svc.getUserStreak("user1");

    expect(result.currentStreak).toBe(3);
    expect(repo.findByUserId).toHaveBeenCalledTimes(2);
  });
});

describe("StreakService.completeDay", () => {
  it("crea nueva racha con `currentStreak=1` cuando no existe streak previo", async () => {
    const repo = makeMockRepo({
      findByUserId: jest.fn(async () => null),
      createStreak: jest.fn(async (data) => ({
        ...data,
        userId: "user1",
        updatedAt: new Date(),
      })),
    });
    const svc = new StreakService(repo as never);

    const result = await svc.completeDay("user1", "2024-01-15");

    expect(result.currentStreak).toBe(1);
    expect(result.isNew).toBe(true);
    expect(result.hasCompletedToday).toBe(true);
    expect(repo.updateStreak).not.toHaveBeenCalled();
  });

  it("retorna `isNew=false` sin actualizar cuando el lastActive es el mismo día", async () => {
    const today = new Date();
    const todayLocalStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const repo = makeMockRepo({
      findByUserId: jest.fn(async () => ({
        userId: "user1",
        currentStreak: 7,
        startDate: new Date("2024-01-01"),
        lastActiveDate: new Date(`${todayLocalStr}T12:00:00.000Z`),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });
    const svc = new StreakService(repo as never);

    const result = await svc.completeDay("user1", todayLocalStr);

    expect(result.currentStreak).toBe(7);
    expect(result.isNew).toBe(false);
    expect(result.hasCompletedToday).toBe(true);
    expect(repo.updateStreak).not.toHaveBeenCalled();
  });

  it("incrementa `currentStreak` cuando el lastActive fue AYER (racha continua)", async () => {
    const repo = makeMockRepo({
      findByUserId: jest.fn(async () => ({
        userId: "user1",
        currentStreak: 3,
        startDate: new Date("2024-01-10"),
        lastActiveDate: new Date("2024-01-14T12:00:00.000Z"),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      updateStreakConditionally: jest.fn(async (userId, data, _prev) => ({
        userId,
        currentStreak: data.currentStreak ?? 4,
        startDate: data.startDate ?? new Date("2024-01-10"),
        lastActiveDate: data.lastActiveDate ?? new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });
    const svc = new StreakService(repo as never);

    const result = await svc.completeDay("user1", "2024-01-15");

    expect(result.currentStreak).toBe(4); // 3 + 1 (incremento consecutivo)
    expect(result.isNew).toBe(false); // newStreak>1 && lastActive!==null
    expect(repo.updateStreakConditionally).toHaveBeenCalledTimes(1);
    const condCall = repo.updateStreakConditionally.mock.calls[0];
    expect(condCall[2]).toEqual(new Date("2024-01-14T12:00:00.000Z"));
    expect(condCall[1]).toMatchObject({
      currentStreak: 4,
      lastActiveDate: new Date("2024-01-15T12:00:00.000Z"),
    });
  });

  it("resetea a `currentStreak=1` cuando el lastActive NO es consecutivo (racha rota)", async () => {
    const repo = makeMockRepo({
      findByUserId: jest.fn(async () => ({
        userId: "user1",
        currentStreak: 9,
        startDate: new Date("2023-12-01"),
        lastActiveDate: new Date("2024-01-10T12:00:00.000Z"),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      updateStreakConditionally: jest.fn(async (userId, data, _prev) => ({
        userId,
        currentStreak: data.currentStreak ?? 1,
        startDate: data.startDate ?? new Date("2024-01-15"),
        lastActiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });
    const svc = new StreakService(repo as never);

    const result = await svc.completeDay("user1", "2024-01-15");

    expect(result.currentStreak).toBe(1); // reset
    expect(repo.updateStreakConditionally).toHaveBeenCalledTimes(1);
  });

  it("[Top #9 idempotency] segundo call el mismo día con CAS guard que retorna null => no-op, retorna estado del peer (no doble-cuenta)", async () => {
    const today = new Date("2024-01-15T12:00:00.000Z");
    const yesterday = new Date("2024-01-14T12:00:00.000Z");
    const winnerRow = {
      userId: "user1",
      currentStreak: 4,           // 3 → 4 (un solo bump, ganador)
      startDate: new Date("2024-01-10"),
      lastActiveDate: new Date("2024-01-15T12:00:00.000Z"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const repo = makeMockRepo({
      findByUserId: jest
        .fn()
        .mockResolvedValueOnce({
          userId: "user1",
          currentStreak: 3,
          startDate: new Date("2024-01-10"),
          lastActiveDate: yesterday,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce(winnerRow),
      updateStreakConditionally: jest.fn(async () => null),
    });
    const svc = new StreakService(repo as never);

    const result = await svc.completeDay("user1", "2024-01-15");

    expect(result.currentStreak).toBe(4);
    expect(result.isNew).toBe(false);
    expect(result.hasCompletedToday).toBe(true);
    expect(repo.updateStreakConditionally).toHaveBeenCalledTimes(1);
    expect(repo.updateStreakConditionally.mock.calls[0][2]).toEqual(yesterday);
  });

  it("[Top #9 createStreak P2002] nuevo usuario abre dos tabs simultáneos → el perdedor ve el row del ganador", async () => {
    const winnerRow = {
      userId: "user1",
      currentStreak: 1,
      startDate: new Date("2024-01-15T12:00:00.000Z"),
      lastActiveDate: new Date("2024-01-15T12:00:00.000Z"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { Prisma } = await import("@prisma/client");

    const repo = makeMockRepo({
      findByUserId: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winnerRow),
      createStreak: jest.fn(async () => {
        throw new Prisma.PrismaClientKnownRequestError("Race", {
          code: "P2002",
          clientVersion: "test",
        });
      }),
    });
    const svc = new StreakService(repo as never);

    const result = await svc.completeDay("user1", "2024-01-15");

    expect(result.currentStreak).toBe(1);
    expect(result.isNew).toBe(false); // peer gano, nosotros no-op
    expect(result.hasCompletedToday).toBe(true);
  });
});

describe("StreakService.initializeStreak", () => {
  it("upserts con días calculados desde la fecha de inicio hasta hoy", async () => {
    const repo = makeMockRepo({
      upsertStreak: jest.fn(async () => ({
        userId: "user1",
        currentStreak: 30,
        startDate: new Date("2024-01-01"),
        lastActiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });
    const svc = new StreakService(repo as never);

    await svc.initializeStreak("user1", "2024-01-01");

    expect(repo.upsertStreak).toHaveBeenCalledTimes(1);

    const callArgs = repo.upsertStreak.mock.calls[0][0];
    expect(callArgs.where).toEqual({ userId: "user1" });
    expect(callArgs.update).toMatchObject({
      currentStreak: expect.any(Number),
      lastActiveDate: expect.any(Date),
      startDate: expect.any(Date),
      updatedAt: expect.any(Date),
    });
    expect(callArgs.update.currentStreak).toBeGreaterThanOrEqual(1);
    expect(callArgs.create).toMatchObject({
      userId: "user1",
      currentStreak: callArgs.update.currentStreak,
      lastActiveDate: expect.any(Date),
      startDate: expect.any(Date),
      createdAt: expect.any(Date),
    });
  });

  it("clamp a 0 cuando startDate es futuro (no negative diff)", async () => {
    const repo = makeMockRepo({
      upsertStreak: jest.fn(async () => ({
        userId: "user1",
        currentStreak: 0,
        startDate: new Date("2099-01-01"),
        lastActiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });
    const svc = new StreakService(repo as never);

    await svc.initializeStreak("user1", "2099-01-01");

    const callArgs = repo.upsertStreak.mock.calls[0][0];
    expect(callArgs.update.currentStreak).toBe(0);
    expect(callArgs.create.currentStreak).toBe(0);
  });
});
