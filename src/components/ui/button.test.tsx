import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("берёт высоту касания, скругление и цвет ссылки из токенов", () => {
    render(<Button>Дальше</Button>);

    const button = screen.getByRole("button", { name: "Дальше" });

    expect(button.className).toContain("min-h-touch");
    expect(button.className).toContain("rounded-pill");
    expect(button.className).toContain("bg-link");
  });
});
