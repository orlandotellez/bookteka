import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthMode } from "@/pages/auth/AuthMode";
import { useUserPreferences, LOCAL_USER_ID } from "@/store/userPreferencesStore";

vi.mock("@/components/pages/auth/LoginForm", () => ({
  LoginForm: () => <div>formulario login</div>,
}));

vi.mock("@/components/common/IconTheme", () => ({
  IconTheme: () => <div>selector tema</div>,
}));

vi.mock("@/components/pages/auth/SideLogo", () => ({
  SideLogo: () => <div>logo</div>,
}));

function renderAuthMode() {
  return render(
    <MemoryRouter initialEntries={["/auth"]}>
      <Routes>
        <Route path="/auth" element={<AuthMode />} />
        <Route path="/" element={<div>biblioteca</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useUserPreferences.setState({
    authMode: "server",
    cloudSyncEnabled: false,
    defaultReadingSettings: {
      fontSize: 18,
      fontFamily: "sans",
      lineHeight: 1.7,
      textWidth: 70,
    },
    defaultView: "shelf",
  });
});

afterEach(() => {
  cleanup();
});

describe("AuthMode — puerta de entrada", () => {
  it("muestra las tabs Local y Servidor", () => {
    renderAuthMode();

    expect(screen.getByRole("tab", { name: "Local" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Servidor" })).toBeTruthy();
  });

  it("por defecto muestra el formulario del servidor", () => {
    renderAuthMode();

    expect(screen.getByText("formulario login")).toBeTruthy();
  });

  it("la tab Local selecciona el modo sin navegar; el botón entra", async () => {
    renderAuthMode();

    fireEvent.click(screen.getByRole("tab", { name: "Local" }));

    await waitFor(() => {
      expect(useUserPreferences.getState().authMode).toBe("local");
      expect(screen.getByText("Tu biblioteca, sin cuenta")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Entrar sin cuenta"));

    await waitFor(() => {
      expect(screen.getByText("biblioteca")).toBeTruthy();
    });
  });

  it("el modo local identifica sus datos con el userId sintético", () => {
    expect(LOCAL_USER_ID).toBe("local-user");
  });

  it("con modo local ya seteado, /auth ofrece el panel de entrada", () => {
    useUserPreferences.setState({ authMode: "local" });

    renderAuthMode();

    expect(screen.getByText("Tu biblioteca, sin cuenta")).toBeTruthy();
    expect(screen.getByText("Entrar sin cuenta")).toBeTruthy();
  });
});

describe("persistencia del modo", () => {
  it("el modo queda persistido en localStorage", () => {
    useUserPreferences.getState().setAuthMode("local");

    const raw = localStorage.getItem("bookteka-user-preferences");
    const parsed = JSON.parse(raw ?? "{}") as { state?: { authMode?: string } };
    expect(parsed.state?.authMode).toBe("local");
  });
});