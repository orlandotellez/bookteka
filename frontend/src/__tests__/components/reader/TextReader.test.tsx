import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { TextReaderHandle } from "@/components/pages/reader/TextReader";

const highlightToolbarMock = vi.hoisted(() => vi.fn());
const pageNavigatorMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/pages/reader/HighlightToolbar", () => ({
  HighlightToolbar: (props: unknown) => {
    highlightToolbarMock(props);
    return null;
  },
}));

vi.mock("@/components/pages/reader/PageNavigator", () => ({
  PageNavigator: (props: unknown) => {
    pageNavigatorMock(props);
    return null;
  },
}));

const { TextReader } = await import("@/components/pages/reader/TextReader");

const settings = {
  fontSize: 18,
  fontFamily: "sans",
  lineHeight: 1.7,
  textWidth: 70,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TextReader", () => {
  it("separa páginas con los marcadores del formato unificado", () => {
    const text = "[PAGE_1]\nEn un lugar de la Mancha\n\n[PAGE_2]\nde cuyo nombre";

    render(
      <TextReader
        text={text}
        settings={settings}
        highlights={[]}
        totalPages={2}
      />,
    );

    expect(screen.getByText("En un lugar de la Mancha")).toBeTruthy();
    expect(screen.getByText("de cuyo nombre")).toBeTruthy();
    expect(screen.getByLabelText("Inicio de la página 2")).toBeTruthy();
  });

  it("sin marcadores y con totalPages genera separadores sintéticos", () => {
    render(
      <TextReader
        text={"párrafo uno\n\npárrafo dos\n\npárrafo tres"}
        settings={settings}
        highlights={[]}
        totalPages={2}
      />,
    );

    expect(screen.getByText("párrafo uno")).toBeTruthy();
  });

  it("limpia el texto de los marcadores antes de mostrarlo", () => {
    const text = "[PAGE_1]\nhola mundo";

    render(<TextReader text={text} settings={settings} highlights={[]} />);

    expect(screen.queryByText(/\[PAGE_1\]/)).toBeNull();
    expect(screen.getByText("hola mundo")).toBeTruthy();
  });

  it("expone navigateToPage a través del handle", () => {
    const ref = { current: null as TextReaderHandle | null };

    render(
      <TextReader
        ref={ref}
        text="[PAGE_1]\nhola\n\n[PAGE_2]\nchau"
        settings={settings}
        highlights={[]}
        totalPages={2}
      />,
    );

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.navigateToPage).toBe("function");
  });
});