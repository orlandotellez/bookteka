import { jest } from "@jest/globals";

const queryRawMock = jest.fn<() => Promise<unknown>>();
const r2SendMock = jest.fn<() => Promise<unknown>>();

jest.unstable_mockModule("@/config/prisma.js", () => ({
  dbPrisma: { $queryRaw: queryRawMock },
}));

jest.unstable_mockModule("@/core/storage/s3.client.js", () => ({
  r2: { send: r2SendMock },
}));

const { healthHandler } = await import("@/http/health.js");

function mockRes() {
  const res: any = { body: undefined, statusCode: 0 };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("healthHandler", () => {
  it("devuelve 200 con db y r2 en true cuando ambos responden", async () => {
    queryRawMock.mockResolvedValue([{ "?column?": 1 }]);
    r2SendMock.mockResolvedValue({});

    const res = mockRes();
    await healthHandler({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", db: true, r2: true });
  });

  it("devuelve 503 con db en false si la base no responde", async () => {
    queryRawMock.mockRejectedValue(new Error("connection refused"));
    r2SendMock.mockResolvedValue({});

    const res = mockRes();
    await healthHandler({}, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ status: "error", db: false, r2: true });
  });

  it("devuelve 503 con r2 en false si el bucket no responde", async () => {
    queryRawMock.mockResolvedValue([{ "?column?": 1 }]);
    r2SendMock.mockRejectedValue(new Error("bucket down"));

    const res = mockRes();
    await healthHandler({}, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ status: "error", db: true, r2: false });
  });
});