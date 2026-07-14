import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Loading } from "@/components/common/Loading";

// ─── IMPORTANTE: cleanup entre tests ────────────────────────────────────────
// Testing Library NO limpia el DOM entre tests automáticamente en v16.
// Sin `afterEach(cleanup)`, los renders de tests anteriores se acumulan
// y pueden causar falsos positivos (ej. queryByText encuentra texto de
// otro test).
afterEach(cleanup);

describe("Loading", () => {
  it("renders the text prop", () => {
    render(<Loading text="Cargando libro..." />);

    // screen.getByText busca por texto visible, lanza error si no encuentra
    expect(screen.getByText("Cargando libro...")).toBeInTheDocument();
  });

  it("renders the subtext when provided", () => {
    render(
      <Loading text="Procesando PDF" subtext="Esto puede tomar un momento" />,
    );

    expect(screen.getByText("Procesando PDF")).toBeInTheDocument();
    expect(
      screen.getByText("Esto puede tomar un momento"),
    ).toBeInTheDocument();
  });

  it("does not render subtext when not provided", () => {
    render(<Loading text="Sincronizando..." />);

    expect(screen.getByText("Sincronizando...")).toBeInTheDocument();

    // queryByText → NO lanza error si no encuentra, devuelve null
    // toBeNull → verifica que el elemento NO existe en el DOM
    expect(screen.queryByText("Esto puede tomar un momento")).toBeNull();

    // NOTA: queryByText vs getByText
    // - getByText → lanza error si no encuentra (útil para "debe existir")
    // - queryByText → devuelve null si no encuentra (útil para "no debe existir")
  });

  it("renders the Spinner inside", () => {
    render(<Loading text="Cargando..." />);

    // El Spinner se renderiza internamente, verificamos que exista su estructura
    const spinner = document.querySelector('[class*="spinner"]');
    expect(spinner).toBeInTheDocument();
  });
});
