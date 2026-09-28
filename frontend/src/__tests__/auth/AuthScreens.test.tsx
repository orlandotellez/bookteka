import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import { useUserPreferences } from "@/store/userPreferencesStore";

vi.mock("@/components/pages/auth/LoginForm", () => ({
  LoginForm: () => <div>formulario login</div>,
}));

vi.mock("@/components/pages/auth/RegisterForm", () => ({
  RegisterForm: () => <div>formulario registro</div>,
}));

vi.mock("@/components/common/IconTheme", () => ({
  IconTheme: () => <div>selector tema</div>,
}));

vi.mock("@/components/pages/auth/SideLogo", () => ({
  SideLogo: () => <div>logo</div>,
}));

beforeEach(() => {
  useUserPreferences.setState({ authMode: "server" });
});

afterEach(() => {
  cleanup();
});

describe("navegación Local/Servidor en las pantallas de auth", () => {
  it("login muestra las tabs con Servidor activo", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByRole("tab", { name: "Local" })).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Servidor" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByText("formulario login")).toBeTruthy();
  });

  it("register muestra las tabs con Servidor activo", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(screen.getByRole("tab", { name: "Local" })).toBeTruthy();
    expect(screen.getByText("formulario registro")).toBeTruthy();
  });
});