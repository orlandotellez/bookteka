import { jest } from "@jest/globals"
import request from "supertest"

describe("GET /api/books/:bookId/bookmarks", () => {
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
      dbPrisma: {}
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).get("/api/books/book1/bookmarks")
    expect(res.status).toBe(401)
    expect(res.body.error).toBe("No autorizado")
  })

  it("debería devolver 403 si el usuario no tiene acceso al libro", async () => {
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
        user_book: {
          findFirst: async () => null
        }
      }
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).get("/api/books/book1/bookmarks")
    expect(res.status).toBe(403)
    expect(res.body.error).toBe("No autorizado o libro no encontrado")
  })

  it("debería devolver 200 y la lista de bookmarks si está autenticado", async () => {
    const mockBookmarks = [
      { id: "bm1", name: "Chapter 1", pageNumber: 1, textPreview: "Intro" },
      { id: "bm2", name: "Chapter 2", pageNumber: 5 }
    ]

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
        user_book: {
          findFirst: async () => ({ id: "ub1" })
        },
        bookmark: {
          findMany: async () => mockBookmarks
        }
      }
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).get("/api/books/book1/bookmarks")
    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockBookmarks)
  })
})

describe("POST /api/books/:bookId/bookmarks", () => {
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
      dbPrisma: {}
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app)
      .post("/api/books/book1/bookmarks")
      .send({ name: "Test", pageNumber: 1 })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe("No autorizado")
  })

  it("debería devolver 403 si el usuario no tiene acceso al libro", async () => {
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
        user_book: {
          findFirst: async () => null
        }
      }
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app)
      .post("/api/books/book1/bookmarks")
      .send({ name: "Test", pageNumber: 1 })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe("No autorizado o libro no encontrado")
  })

  it("debería devolver 400 si faltan campos requeridos", async () => {
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
        user_book: {
          findFirst: async () => ({ id: "ub1" })
        }
      }
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    // Caso 1: Falta pageNumber
    const res1 = await request(app)
      .post("/api/books/book1/bookmarks")
      .send({ name: "Test" })

    expect(res1.status).toBe(400)
    expect(res1.body.error).toBe("Faltan campos requeridos: name, pageNumber")

    // Caso 2: Falta name
    const res2 = await request(app)
      .post("/api/books/book1/bookmarks")
      .send({ pageNumber: 1 })

    expect(res2.status).toBe(400)
    expect(res2.body.error).toBe("Faltan campos requeridos: name, pageNumber")

    // Caso 3: pageNumber no es número
    const res3 = await request(app)
      .post("/api/books/book1/bookmarks")
      .send({ name: "Test", pageNumber: "uno" })

    expect(res3.status).toBe(400)
    expect(res3.body.error).toBe("Faltan campos requeridos: name, pageNumber")
  })

  it("debería crear el bookmark correctamente", async () => {
    const mockBookmark = {
      id: "bm1",
      userId: "user1",
      userBookId: "ub1",
      name: "Test Bookmark",
      pageNumber: 1,
      textPreview: "Preview"
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
        user_book: {
          findFirst: async () => ({ id: "ub1" })
        },
        bookmark: {
          create: async () => mockBookmark
        }
      }
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app)
      .post("/api/books/book1/bookmarks")
      .send({
        name: "Test Bookmark",
        pageNumber: 1,
        textPreview: "Preview"
      })

    expect(res.status).toBe(201)
    expect(res.body).toEqual(mockBookmark)
  })
})

describe("DELETE /api/books/:bookId/bookmarks/:bookmarkId", () => {
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
      dbPrisma: {}
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).delete("/api/books/book1/bookmarks/bm1")
    expect(res.status).toBe(401)
    expect(res.body.error).toBe("No autorizado")
  })

  it("debería devolver 403 si el usuario no tiene acceso al libro", async () => {
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
        user_book: {
          findFirst: async () => null
        }
      }
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).delete("/api/books/book1/bookmarks/bm1")
    expect(res.status).toBe(403)
    expect(res.body.error).toBe("No autorizado o libro no encontrado")
  })

  it("debería devolver 404 si el bookmark no existe", async () => {
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
        user_book: {
          findFirst: async () => ({ id: "ub1" })
        },
        bookmark: {
          findFirst: async () => null
        }
      }
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).delete("/api/books/book1/bookmarks/bm1")
    expect(res.status).toBe(404)
    expect(res.body.error).toBe("Bookmark no encontrado")
  })

  it("debería eliminar el bookmark correctamente", async () => {
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
        user_book: {
          findFirst: async () => ({ id: "ub1" })
        },
        bookmark: {
          findFirst: async () => ({ id: "bm1" }),
          delete: async () => ({ id: "bm1" })
        }
      }
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).delete("/api/books/book1/bookmarks/bm1")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })
  })
})
