import { UserBook } from "@/types/book.js"
import { jest } from "@jest/globals"
import request from "supertest"

describe("GET /api/books", () => {
  beforeEach(() => {
    jest.resetModules()
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
        user_book: {
          findMany: async () => [] // no hay sesión, no debería llegar acá
        }
      }
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).get("/api/books")
    expect(res.status).toBe(401)
  })

  it("debería devolver 200 y la lista de libros si está autenticado", async () => {

    const simulateUserBooks: UserBook[] = [
      {
        id: "ub1",
        userId: "123",
        bookId: "1",
        createdAt: new Date(),

        book: {
          id: "1",
          title: "Book 1",
          author: "Author 1",
          fileUrl: "url1",
          fileKey: "key1",
          fileHash: "asaasldfkjañfjkañls",
          size: 100,
          createdAt: new Date(),
        },

        readingTimeSeconds: 0,
        scrollPosition: 0,
        lastReadAt: null,
        currentPage: 11,
      },
      {
        id: "ub2",
        userId: "123",
        bookId: "2",
        createdAt: new Date(),

        book: {
          id: "2",
          title: "Book 2",
          author: "Author 2",
          fileUrl: "url2",
          fileKey: "key2",
          fileHash: "asaasldfkjañfjkañls",
          size: 100,
          createdAt: new Date(),
        },

        readingTimeSeconds: 0,
        scrollPosition: 0,
        lastReadAt: null,
        currentPage: 11,
      },

    ]
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "123" }
          })
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_book: {
          findMany: async () => simulateUserBooks
        }
      }
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {}
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app).get("/api/books")
    expect(res.status).toBe(200)
    expect(res.body).toEqual(expect.any(Array))
  })
})

describe("POST /api/books/upload", () => {
  beforeEach(() => {
    jest.resetModules()
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
      .post("/api/books/upload")

    expect(res.status).toBe(401)
  })

  it("debería devolver 400 si no se envía archivo", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "123" }
          })
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
      .post("/api/books/upload")

    expect(res.status).toBe(400)
  })

  it("debería subir el libro correctamente", async () => {
    const fakeBuffer = Buffer.from("fake pdf content")

    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "123" }
          })
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        book: {
          findUnique: async () => null, // no existe
          create: async () => ({
            id: "book1"
          })
        },
        user_book: {
          upsert: async () => ({
            id: "userbook1"
          })
        }
      }
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {
        send: async () => ({})
      }
    }))

    jest.unstable_mockModule("@/helper/format", () => ({
      generateFileHash: () => "hash123",
      normalizedFileName: () => "file.pdf"
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app)
      .post("/api/books/upload")
      .attach("file", fakeBuffer, "test.pdf")
      .field("title", "Test Book")
      .field("author", "Author Test")

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      bookId: "book1",
      userBookId: "userbook1"
    })
  })

  it("debería devolver 400 si se suben 2 archivos con el mismo fieldname", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "123" },
          }),
        },
      },
    }));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {},
    }));

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {},
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app)
      .post("/api/books/upload")
      .attach("file", Buffer.from("pdf1"), "a.pdf")
      .attach("file", Buffer.from("pdf2"), "b.pdf");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("LIMIT_UNEXPECTED_FILE");
  });

  it("debería reutilizar libro existente", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "123" }
          })
        }
      }
    }))

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        book: {
          findUnique: async () => ({
            id: "existing-book"
          })
        },
        user_book: {
          upsert: async () => ({
            id: "userbook1"
          })
        }
      }
    }))

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {
        send: async () => ({})
      }
    }))

    jest.unstable_mockModule("@/helper/format", () => ({
      generateFileHash: () => "hash123",
      normalizedFileName: () => "file.pdf"
    }))

    //@ts-ignore
    const mod = await import("@/server")
    const app = mod.default

    const res = await request(app)
      .post("/api/books/upload")
      .attach("file", Buffer.from("pdf"), "test.pdf")

    expect(res.status).toBe(200)
    expect(res.body.bookId).toBe("existing-book")
  })
})

describe("DELETE /api/books/:id", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("debería devolver 401 si no hay sesión", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => null,
        },
      },
    }));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {},
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app).delete("/api/books/123");

    expect(res.status).toBe(401);
  });

  it("debería devolver 404 si el libro no existe para el usuario", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" },
          }),
        },
      },
    }));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_book: {
          findFirst: async () => null,
        },
      },
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app).delete("/api/books/123");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Libro no encontrado para este usuario");
  });

  it("debería eliminar el libro correctamente", async () => {
    const simulateUserBook = {
      id: "ub1",
      book: {
        id: "book1",
        title: "Test Book",
        author: "Test Author",
        fileKey: "books/test.pdf",
        size: 100,
      },
    };

    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" },
          }),
        },
      },
    }));

    jest.unstable_mockModule("@/config/prisma", () => {
      const dbPrismaClient = {
        user_book: {
          findFirst: async () => simulateUserBook,
          count: async () => 0,
          delete: async () => { },
        },
        audit_log: {
          create: async () => { },
        },
        book: {
          delete: async () => { },
        },
        $transaction: async (arg: unknown): Promise<unknown> => {
          if (typeof arg === "function") {
            return await (
              arg as (tx: typeof dbPrismaClient) => Promise<unknown>
            )(dbPrismaClient);
          }
          return await Promise.all(arg as Promise<unknown>[]);
        },
      };
      return { dbPrisma: dbPrismaClient };
    });

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {
        send: async () => { },
      },
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app).delete("/api/books/book1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "Libro eliminado correctamente",
      auditId: "book1",
    });
  });
})

describe("PATCH /api/books/:id/progress", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("debería devolver 401 si no hay sesión", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => null,
        },
      },
    }));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {},
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app)
      .patch("/api/books/book1/progress")
      .send({
        readingTimeSeconds: 100,
        scrollPosition: 50,
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("No autorizado");
  });

  it("debería devolver 404 si el libro no pertenece al usuario", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" },
          }),
        },
      },
    }));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_book: {
          findFirst: async () => null,
        },
      },
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app)
      .patch("/api/books/book1/progress")
      .send({
        readingTimeSeconds: 100,
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe(
      "Libro no encontrado para este usuario"
    );
  });

  it("debería actualizar progreso correctamente", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" },
          }),
        },
      },
    }));

    const mockUserBook = {
      id: "ub1",
      readingTimeSeconds: 10,
      scrollPosition: 5,
      lastReadAt: new Date(),
    };

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_book: {
          findFirst: async () => mockUserBook,
          update: async ({ data }: any) => ({
            ...mockUserBook,
            ...data,
          }),
        },
      },
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app)
      .patch("/api/books/book1/progress")
      .send({
        readingTimeSeconds: 200,
        scrollPosition: 80,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.readingTimeSeconds).toBe(200);
    expect(res.body.scrollPosition).toBe(80);
    expect(res.body.lastReadAt).toBeDefined();
  });

  it("debería saltarse el write de Prisma si ni scroll ni tiempo avanzaron", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({ user: { id: "user1" } }),
        },
      },
    }));

    const mockUserBook = {
      id: "ub1",
      readingTimeSeconds: 100,
      scrollPosition: 500,
      lastReadAt: new Date(2000),
    };
    const mockUpdate = jest.fn(async () => ({}));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_book: {
          findFirst: async () => mockUserBook,
          update: mockUpdate,
        },
      },
    }));

    jest.unstable_mockModule("@/lib/r2", () => ({ r2: {} }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app)
      .patch("/api/books/book1/progress")
      .send({
        readingTimeSeconds: 50,
        scrollPosition: 540,
      });

    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(res.body.readingTimeSeconds).toBe(100);
    expect(res.body.scrollPosition).toBe(500);
  });

  it("debería actualizar solo scrollPosition si supera la tolerancia, sin tocar readingTimeSeconds", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({ user: { id: "user1" } }),
        },
      },
    }));

    const mockUserBook = {
      id: "ub1",
      readingTimeSeconds: 100,
      scrollPosition: 500,
      lastReadAt: new Date(2000),
    };
    const mockUpdate = jest.fn(async ({ data }: any) => ({
      ...mockUserBook,
      ...data,
    }));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_book: {
          findFirst: async () => mockUserBook,
          update: mockUpdate,
        },
      },
    }));

    jest.unstable_mockModule("@/lib/r2", () => ({ r2: {} }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app)
      .patch("/api/books/book1/progress")
      .send({
        readingTimeSeconds: 100,
        scrollPosition: 700,
      });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updateArgs = mockUpdate.mock.calls[0]?.[0];
    expect(updateArgs?.data?.scrollPosition).toBe(700);
    expect(updateArgs?.data?.readingTimeSeconds).toBeUndefined();
    expect(res.body.scrollPosition).toBe(700);
  });

  it("debería actualizar solo readingTimeSeconds si el scroll está dentro de la tolerancia", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({ user: { id: "user1" } }),
        },
      },
    }));

    const mockUserBook = {
      id: "ub1",
      readingTimeSeconds: 100,
      scrollPosition: 500,
      lastReadAt: new Date(2000),
    };
    const mockUpdate = jest.fn(async ({ data }: any) => ({
      ...mockUserBook,
      ...data,
    }));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_book: {
          findFirst: async () => mockUserBook,
          update: mockUpdate,
        },
      },
    }));

    jest.unstable_mockModule("@/lib/r2", () => ({ r2: {} }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app)
      .patch("/api/books/book1/progress")
      .send({
        readingTimeSeconds: 200,
        scrollPosition: 510,
      });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updateArgs = mockUpdate.mock.calls[0]?.[0];
    expect(updateArgs?.data?.readingTimeSeconds).toBe(200);
    expect(updateArgs?.data?.scrollPosition).toBeUndefined();
    expect(res.body.readingTimeSeconds).toBe(200);
  });
});

describe("GET /api/books/:id/download", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("debería devolver 401 si no hay sesión", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => null,
        },
      },
    }));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {},
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app).get("/api/books/book1/download");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("No autorizado");
  });

  it("debería devolver 403 si el usuario no tiene acceso al libro", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" },
          }),
        },
      },
    }));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_book: {
          findFirst: async () => null,
        },
      },
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app).get("/api/books/book1/download");

    expect(res.status).toBe(403);
  });

  it("debería devolver una URL firmada de descarga", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" },
          }),
        },
      },
    }));

    const mockUserBook = {
      book: {
        fileKey: "books/user1/file.pdf",
      },
    };

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_book: {
          findFirst: async () => mockUserBook,
        },
      },
    }));

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {},
    }));

    jest.unstable_mockModule("@aws-sdk/s3-request-presigner", () => ({
      getSignedUrl: async () => "https://fake-signed-url.com/file.pdf",
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app).get("/api/books/book1/download");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      url: "https://fake-signed-url.com/file.pdf",
    });
  });
});

describe("GET /api/books/:id/stream", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("debería devolver 401 si no hay sesión", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => null,
        },
      },
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app).get("/api/books/book1/stream");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("No autorizado");
  });

  it("debería devolver 403 si el usuario no tiene el libro", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" },
          }),
        },
      },
    }));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_book: {
          findFirst: async () => null,
        },
      },
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app).get("/api/books/book1/stream");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("No es tu libro");
  });

  it("debería devolver 500 si el archivo no tiene Body", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" },
          }),
        },
      },
    }));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_book: {
          findFirst: async () => ({
            book: { fileKey: "file.pdf", title: "Test" },
          }),
        },
      },
    }));

    jest.unstable_mockModule("@/lib/r2", () => ({
      r2: {
        send: async () => ({
          Body: null,
        }),
      },
    }));

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app).get("/api/books/book1/stream");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Error al obtener el archivo");
  });

  it("debería hacer stream del PDF correctamente", async () => {
    jest.unstable_mockModule("@/lib/auth", () => ({
      auth: {
        api: {
          getSession: async () => ({
            user: { id: "user1" },
          }),
        },
      },
    }));

    jest.unstable_mockModule("@/config/prisma", () => ({
      dbPrisma: {
        user_book: {
          findFirst: async () => ({
            book: {
              fileKey: "file.pdf",
              title: "Test Book",
            },
          }),
        },
      },
    }));

    jest.unstable_mockModule("@/lib/r2", async () => {
      const { Readable } = await import("node:stream");

      return {
        r2: {
          //@ts-ignore
          send: jest.fn().mockImplementation(() => {
            const data = Buffer.from("fake pdf content");
            const stream = Readable.from(data);

            return {
              Body: stream,
              ContentLength: data.length,
            };
          }),
        },
      };
    });

    //@ts-ignore
    const mod = await import("@/server");
    const app = mod.default;

    const res = await request(app).get("/api/books/book1/stream");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toContain("Test Book");
  });
});
