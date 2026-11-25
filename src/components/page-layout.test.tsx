import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageLayout, pageGutterClassName } from "./page-layout";

describe("PageLayout", () => {
  it("держит контент в колонке xl с боковыми отступами по брейкпоинтам", () => {
    render(
      <PageLayout>
        <p>Контент</p>
      </PageLayout>,
    );

    const layout = screen.getByText("Контент").parentElement;

    expect(layout?.className).toContain("mx-auto");
    expect(layout?.className).toContain("max-w-screen-xl");
    expect(layout?.className).toContain(pageGutterClassName);
  });
});
