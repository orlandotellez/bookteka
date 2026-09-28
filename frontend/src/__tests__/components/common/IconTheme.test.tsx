import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const themeMock = vi.hoisted(() => ({
  theme: "light" as string,
  setTheme: vi.fn(),
}));

vi.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: themeMock.theme,
    setTheme: themeMock.setTheme,
  }),
}));

import { IconTheme } from "@/components/common/IconTheme";
import { THEME_LABELS } from "@/context/theme";

beforeEach(() => {
  themeMock.theme = "light";
  themeMock.setTheme.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("IconTheme", () => {
  it("muestra el nombre del tema actual", () => {
    render(<IconTheme />);

    expect(screen.getByRole("button")).toHaveTextContent("Claro");
  });

  it("abre el listbox con las 6 opciones", () => {
    render(<IconTheme />);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(6);
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("Claro");
    expect(screen.getAllByRole("option")[5]).toHaveTextContent("Bosque");
  });

  it("selecciona un tema y cierra el listbox", () => {
    render(<IconTheme />);

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Sepia"));

    expect(themeMock.setTheme).toHaveBeenCalledWith("sepia");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("marca la opción activa con aria-selected", () => {
    themeMock.theme = "ocean";
    render(<IconTheme />);

    fireEvent.click(screen.getByRole("button"));

    const selected = screen
      .getAllByRole("option")
      .find((o) => o.getAttribute("aria-selected") === "true");
    expect(selected).toHaveTextContent(THEME_LABELS.ocean);
  });

  it("cierra con Escape", async () => {
    render(<IconTheme />);

    const trigger = screen.getByRole("button", { name: "Claro" });
    fireEvent.click(trigger);
    await screen.findByRole("listbox");

    fireEvent.keyDown(trigger, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });
});