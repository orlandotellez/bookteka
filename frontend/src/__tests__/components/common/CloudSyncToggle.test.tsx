import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CloudSyncToggle } from "@/components/common/CloudSyncToggle";
import { CLOUD_REQUIRES_ACCOUNT_ERROR } from "@/lib/cloud";
import { useUserPreferences } from "@/store/userPreferencesStore";

function renderizar() {
  return render(
    <MemoryRouter>
      <CloudSyncToggle />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useUserPreferences.setState({ authMode: "server", cloudSyncEnabled: false });
});

// El vitest.config no declara `globals: true`, así que el auto-cleanup de
// Testing Library no se registra. Sin esto los renders se acumulan en el
// documento y `getByLabelText` encuentra varios elementos.
afterEach(cleanup);

describe("CloudSyncToggle en modo servidor", () => {
  it("permite activar la sincronización", () => {
    renderizar();
    const input = screen.getByLabelText("Sincronización en la nube");

    expect(input).not.toBeDisabled();
    expect(
      screen.getByText("Los libros se guardan solo en este dispositivo"),
    ).toBeInTheDocument();
  });

  it("cambia la descripción al activarlo", () => {
    useUserPreferences.setState({ cloudSyncEnabled: true });
    renderizar();

    expect(
      screen.getByText("Los libros se guardan automáticamente en la nube"),
    ).toBeInTheDocument();
  });
});

describe("CloudSyncToggle en modo local", () => {
  beforeEach(() => {
    useUserPreferences.setState({ authMode: "local" });
  });

  it("bloquea el switch", () => {
    renderizar();

    expect(screen.getByLabelText("Sincronización en la nube")).toBeDisabled();
  });

  it("explica que hace falta una cuenta y ofrece registrarse", () => {
    renderizar();

    expect(screen.getByText(CLOUD_REQUIRES_ACCOUNT_ERROR)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /iniciar sesión o crear cuenta/i }),
    ).toHaveAttribute("href", "/auth");
  });

  it("no muestra el texto de sincronización activa", () => {
    renderizar();

    expect(
      screen.queryByText("Los libros se guardan automáticamente en la nube"),
    ).not.toBeInTheDocument();
  });

  it("se muestra apagado aunque quede cloudSyncEnabled persistido", () => {
    // El usuario estaba en modo servidor con la nube prendida y volvió a
    // local: el switch tiene que verse apagado, no "encendido" en gris.
    useUserPreferences.setState({ authMode: "local", cloudSyncEnabled: true });
    renderizar();

    expect(screen.getByLabelText("Sincronización en la nube")).not.toBeChecked();
  });
});
