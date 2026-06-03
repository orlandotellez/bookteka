import { jest } from "@jest/globals"
import request from "supertest"

describe("GET /api/streak", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it("debería devolver 401 si no hay sesión", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => null
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_streak: {}
      }
    }))

    jest.unstable_mockModule("@/helper/time", () => ({
      toDateString: (date: any) => date?.toISOString() || null,
      getUTCDateOnly: (date: any) => date?.toISOString() || null
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).get("/api/streak")
    expect(res.status).toBe(401)
    expect(res.body.error).toBe("No autorizado")
  })

  it("debería crear una nueva racha si no existe y devolver 200", async () => {
    const mockStreak = {
      userId: "user1",
      currentStreak: 0,
      startDate: null,
      lastActiveDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" }
          })
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_streak: {
          findUnique: async () => null,
          create: async () => mockStreak
        }
      }
    }))

    jest.unstable_mockModule("@/helper/time", () => ({
      toDateString: (date: any) => date?.toISOString() || null,
      getUTCDateOnly: (date: any) => date?.toISOString() || null
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).get("/api/streak")
    expect(res.status).toBe(200)
    expect(res.body.currentStreak).toBe(0)
    expect(res.body.hasCompletedToday).toBe(false)
  })

  it("debería devolver la racha existente si ya existe", async () => {
    const mockStreak = {
      userId: "user1",
      currentStreak: 5,
      startDate: new Date("2024-01-01"),
      lastActiveDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" }
          })
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_streak: {
          findUnique: async () => mockStreak
        }
      }
    }))

    jest.unstable_mockModule("@/helper/time", () => ({
      toDateString: (date: any) => date?.toISOString() || null,
      getUTCDateOnly: (date: any) => date?.toISOString() || null
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).get("/api/streak")
    expect(res.status).toBe(200)
    expect(res.body.currentStreak).toBe(5)
    expect(res.body.hasCompletedToday).toBe(true)
  })
})

describe("POST /api/streak/complete", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it("debería devolver 401 si no hay sesión", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => null
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_streak: {}
      }
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).post("/api/streak/complete")
    expect(res.status).toBe(401)
    expect(res.body.error).toBe("No autorizado")
  })

  it("debería crear una nueva racha si no existe", async () => {
    const mockStreak = {
      userId: "user1",
      currentStreak: 1,
      startDate: new Date(),
      lastActiveDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" }
          })
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_streak: {
          findUnique: async () => null,
          create: async () => mockStreak
        }
      }
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app)
      .post("/api/streak/complete")
      .send({ clientDate: "2024-01-15" })

    expect(res.status).toBe(200)
    expect(res.body.currentStreak).toBe(1)
    expect(res.body.isNew).toBe(true)
    expect(res.body.hasCompletedToday).toBe(true)
  })

  it("debería actualizar la racha existente si es un día consecutivo", async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const mockExistingStreak = {
      userId: "user1",
      currentStreak: 3,
      startDate: new Date("2024-01-10"),
      lastActiveDate: yesterday,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const mockUpdatedStreak = {
      ...mockExistingStreak,
      currentStreak: 4,
      lastActiveDate: new Date(),
      updatedAt: new Date()
    }

    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" }
          })
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_streak: {
          findUnique: async () => mockExistingStreak,
          update: async () => mockUpdatedStreak
        }
      }
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app)
      .post("/api/streak/complete")
      .send({ clientDate: "2024-01-15" })

    expect(res.status).toBe(200)
    expect(res.body.currentStreak).toBe(4)
    expect(res.body.hasCompletedToday).toBe(true)
  })

  it("debería devolver la racha actual si ya completó el día", async () => {
    // Usar la misma fecha que se enviará en clientDate
    const sameDate = new Date("2024-01-15T12:00:00.000Z")

    const mockExistingStreak = {
      userId: "user1",
      currentStreak: 5,
      startDate: new Date("2024-01-10"),
      lastActiveDate: sameDate, // Misma fecha que clientDate
      createdAt: new Date(),
      updatedAt: new Date()
    }

    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" }
          })
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_streak: {
          findUnique: async () => mockExistingStreak
        }
      }
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app)
      .post("/api/streak/complete")
      .send({ clientDate: "2024-01-15" })

    expect(res.status).toBe(200)
    expect(res.body.currentStreak).toBe(5)
    expect(res.body.hasCompletedToday).toBe(true)
    expect(res.body.isNew).toBe(false)
  })
})

describe("POST /api/streak/initialize", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it("debería devolver 401 si no hay sesión", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => null
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_streak: {}
      }
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app)
      .post("/api/streak/initialize")
      .send({ startDate: "2024-01-01" })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe("No autorizado")
  })

  it("debería devolver 400 si no se proporciona startDate", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" }
          })
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_streak: {}
      }
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app)
      .post("/api/streak/initialize")
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBe("Se requiere la fecha de inicio")
  })

  it("debería inicializar la racha correctamente", async () => {
    const mockStreak = {
      userId: "user1",
      currentStreak: 15,
      startDate: new Date("2024-01-01"),
      lastActiveDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" }
          })
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_streak: {
          upsert: async () => mockStreak
        }
      }
    }))

    jest.unstable_mockModule("@/helper/time", () => ({
      toDateString: (date: any) => date?.toISOString() || null,
      getUTCDateOnly: (date: any) => date?.toISOString() || null
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app)
      .post("/api/streak/initialize")
      .send({ startDate: "2024-01-01" })

    expect(res.status).toBe(200)
    expect(res.body.currentStreak).toBe(15)
    expect(res.body.hasCompletedToday).toBe(true)
  })
})
