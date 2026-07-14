import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Spinner } from "@/components/common/Spinner";

// ─── Testing Library ────────────────────────────────────────────────────────
//   render(<Componente />)  → monta el componente en un DOM virtual
//   screen.getByRole(...)   → busca elementos por ARIA role
//   screen.getByText(...)   → busca por texto visible
//   screen.getByTestId(...) → busca por data-testid (si lo usas)
//   expect(el).toBeInTheDocument() → matcher de jest-dom
//
// Para depurar: screen.debug() imprime el DOM renderizado en la consola.

describe("Spinner", () => {
  it("renders a spinner element", () => {
    render(<Spinner />);

    const spinner = document.querySelector('[class*="spinner"]');
    expect(spinner).toBeInTheDocument();
  });

  it("renders a container div", () => {
    render(<Spinner />);

    const container = document.querySelector('[class*="content"]');
    expect(container).toBeInTheDocument();
  });
});
