import { jest } from "@jest/globals"
import request from "supertest"

describe("GET /api/v1/books/:bookId/bookmarks", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it("debería devolver 401 si no hay sesión", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
      auth: {
        api: {
          getSession: async () => null
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {}
    }))

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app).get("/api/v1/books/book1/bookmarks")
    expect(res.status).toBe(401)
    expect(res.body.error).toBe("No autorizado")
  })

  it("debería devolver 403 si el usuario no tiene acceso al libro", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
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

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app).get("/api/v1/books/book1/bookmarks")
    expect(res.status).toBe(403)
    expect(res.body.error).toBe("No autorizado o libro no encontrado")
  })

  it("debería devolver 200 y la lista de bookmarks si está autenticado", async () => {
    const mockBookmarks = [
      { id: "bm1", name: "Chapter 1", pageNumber: 1, textPreview: "Intro" },
      { id: "bm2", name: "Chapter 2", pageNumber: 5 }
    ]

    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
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

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app).get("/api/v1/books/book1/bookmarks")
    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockBookmarks)
  })
})

describe("POST /api/v1/books/:bookId/bookmarks", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it("debería devolver 401 si no hay sesión", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
      auth: {
        api: {
          getSession: async () => null
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {}
    }))

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app)
      .post("/api/v1/books/book1/bookmarks")
      .send({ name: "Test", pageNumber: 1 })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe("No autorizado")
  })

  it("debería devolver 403 si el usuario no tiene acceso al libro", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
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

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app)
      .post("/api/v1/books/book1/bookmarks")
      .send({ name: "Test", pageNumber: 1 })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe("No autorizado o libro no encontrado")
  })

  it("debería devolver 400 si faltan campos requeridos", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
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

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res1 = await request(app)
      .post("/api/v1/books/book1/bookmarks")
      .send({ name: "Test" })

    expect(res1.status).toBe(400)
    expect(res1.body.error).toBe("Validation failed")
    expect(res1.body.details[0].path).toBe("pageNumber")

    const res2 = await request(app)
      .post("/api/v1/books/book1/bookmarks")
      .send({ pageNumber: 1 })

    expect(res2.status).toBe(400)
    expect(res2.body.error).toBe("Validation failed")
    expect(res2.body.details[0].path).toBe("name")

    const res3 = await request(app)
      .post("/api/v1/books/book1/bookmarks")
      .send({ name: "Test", pageNumber: "uno" })

    expect(res3.status).toBe(400)
    expect(res3.body.error).toBe("Validation failed")
    expect(res3.body.details[0].path).toBe("pageNumber")
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

    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
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

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app)
      .post("/api/v1/books/book1/bookmarks")
      .send({
        name: "Test Bookmark",
        pageNumber: 1,
        textPreview: "Preview"
      })

    expect(res.status).toBe(201)
    expect(res.body).toEqual(mockBookmark)
  })
})

describe("DELETE /api/v1/books/:bookId/bookmarks/:bookmarkId", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it("debería devolver 401 si no hay sesión", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
      auth: {
        api: {
          getSession: async () => null
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {}
    }))

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app).delete("/api/v1/books/book1/bookmarks/bm1")
    expect(res.status).toBe(401)
    expect(res.body.error).toBe("No autorizado")
  })

  it("debería devolver 403 si el usuario no tiene acceso al libro", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
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

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app).delete("/api/v1/books/book1/bookmarks/bm1")
    expect(res.status).toBe(403)
    expect(res.body.error).toBe("No autorizado o libro no encontrado")
  })

  it("debería devolver 404 si el bookmark no existe", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
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

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app).delete("/api/v1/books/book1/bookmarks/bm1")
    expect(res.status).toBe(404)
    expect(res.body.error).toBe("Bookmark no encontrado")
  })

  it("debería eliminar el bookmark correctamente", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
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

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app).delete("/api/v1/books/book1/bookmarks/bm1")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })
  })
})

describe("PATCH /api/v1/books/:bookId/bookmarks/:bookmarkId", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it("debería devolver 401 si no hay sesión", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
      auth: {
        api: {
          getSession: async () => null
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {}
    }))

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app)
      .patch("/api/v1/books/book1/bookmarks/bm1")
      .send({ name: "Nuevo nombre" })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe("No autorizado")
  })

  it("debería devolver 403 si el usuario no tiene acceso al libro", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
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

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app)
      .patch("/api/v1/books/book1/bookmarks/bm1")
      .send({ name: "Nuevo nombre" })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe("No autorizado o libro no encontrado")
  })

  it("debería devolver 404 si el bookmark no pertenece al libro", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
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

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app)
      .patch("/api/v1/books/book1/bookmarks/bm1")
      .send({ name: "Nuevo nombre" })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe("Bookmark no encontrado")
  })

  it("debería devolver 400 si el nombre excede 200 caracteres", async () => {
    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
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
          findFirst: async () => ({ id: "bm1" })
        }
      }
    }))

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app)
      .patch("/api/v1/books/book1/bookmarks/bm1")
      .send({ name: "x".repeat(201) })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe("Validation failed")
  })

  it("debería actualizar solo name y textPreview, sin tocar pageNumber", async () => {
    const updateArgs: any = { data: undefined, where: undefined }

    jest.unstable_mockModule("@/modules/auth/application/auth.service", () => ({
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
          findFirst: async () => ({ id: "bm1", pageNumber: 42 }),
          update: async (args: any) => {
            updateArgs.data = args.data
            updateArgs.where = args.where
            return { id: "bm1", name: "Nuevo nombre", textPreview: "Prev", pageNumber: 42 }
          }
        }
      }
    }))

    jest.unstable_mockModule("@/core/storage/s3.client", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/app")
    const app = mod.default

    const res = await request(app)
      .patch("/api/v1/books/book1/bookmarks/bm1")
      // pageNumber y userBookId se envían a propósito: el schema debe descartarlos
      .send({ name: "Nuevo nombre", textPreview: "Prev", pageNumber: 999, userBookId: "otro" })

    expect(res.status).toBe(200)
    expect(updateArgs.where).toEqual({ id: "bm1" })
    expect(updateArgs.data).toEqual({ name: "Nuevo nombre", textPreview: "Prev" })
    expect(updateArgs.data).not.toHaveProperty("pageNumber")
    expect(updateArgs.data).not.toHaveProperty("userBookId")
    expect(res.body.id).toBe("bm1")
    expect(res.body.pageNumber).toBe(42)
  })
})
