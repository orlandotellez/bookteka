import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUserPreferences } from "@/store/userPreferencesStore";

const getSessionMock = vi.fn();

vi.mock("@/api/auth", () => ({
  authApi: {
    getSession: () => getSessionMock(),
    refresh: vi.fn(),
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock("@/lib/sessionToken", () => ({
  setSessionTokens: vi.fn(),
}));

const { getCachedSession } = await import("@/lib/sessionCache");

beforeEach(() => {
  getSessionMock.mockReset();
  useUserPreferences.setState({ authMode: "server" });
});

describe("getCachedSession en modo local", () => {
  it("devuelve la sesión sintética sin tocar el backend", async () => {
    useUserPreferences.setState({ authMode: "local" });
    getSessionMock.mockRejectedValue(new Error("no debería llamarse"));

    const session = await getCachedSession();

    expect(session).not.toBeNull();
    expect(session?.user.id).toBe("local-user");
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("en modo servidor consulta el backend", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "user-1" },
      session: {},
    });

    const session = await getCachedSession(true);

    expect(session?.user.id).toBe("user-1");
    expect(getSessionMock).toHaveBeenCalled();
  });
});