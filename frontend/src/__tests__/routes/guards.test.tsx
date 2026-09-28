import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const authMock = vi.hoisted(() => ({
  data: null as unknown,
  isPending: false,
  error: null as unknown,
}));

vi.mock("@/lib/useAuthSession", () => ({
  useAuthSession: () => ({
    data: authMock.data,
    isPending: authMock.isPending,
    error: authMock.error,
  }),
  invalidateAuthSession: vi.fn(),
}));

vi.mock("@/store/bookStore", () => ({
  useBookStore: () => ({
    books: [],
    loadBooks: vi.fn(async () => undefined),
    syncBooks: vi.fn(async () => undefined),
  }),
}));

vi.mock("@/components/common/Loading", () => ({
  Loading: ({ text }: { text: string }) => <div>{text}</div>,
}));

import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { PublicRoute } from "@/routes/PublicRoute";

function renderProtected(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/"
          element={<ProtectedRoute><div>contenido protegido</div></ProtectedRoute>}
        />
        <Route path="/auth/login" element={<div>pagina login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderPublic(path = "/auth/login") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/auth/login"
          element={<PublicRoute><div>formulario login</div></PublicRoute>}
        />
        <Route path="/" element={<div>biblioteca</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authMock.data = null;
  authMock.isPending = false;
  authMock.error = null;
});

afterEach(() => {
  cleanup();
});

describe("ProtectedRoute", () => {
  it("muestra los children con sesión", () => {
    authMock.data = { user: { id: "user-1" }, session: {} };

    renderProtected();

    expect(screen.getByText("contenido protegido")).toBeTruthy();
  });

  it("redirige a /auth/login sin sesión", () => {
    authMock.data = null;

    renderProtected();

    expect(screen.getByText("pagina login")).toBeTruthy();
  });

  it("redirige a /auth/login con error de sesión", () => {
    authMock.error = new Error("session expired");

    renderProtected();

    expect(screen.getByText("pagina login")).toBeTruthy();
  });

  it("muestra Loading mientras pide la sesión", () => {
    authMock.isPending = true;

    renderProtected();

    expect(screen.getByText("Cargando contenido...")).toBeTruthy();
  });
});

describe("PublicRoute", () => {
  it("muestra los children sin sesión", () => {
    authMock.data = null;

    renderPublic();

    expect(screen.getByText("formulario login")).toBeTruthy();
  });

  it("redirige a / si ya hay sesión", () => {
    authMock.data = { user: { id: "user-1" }, session: {} };

    renderPublic();

    expect(screen.getByText("biblioteca")).toBeTruthy();
  });
});