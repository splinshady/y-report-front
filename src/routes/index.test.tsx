import { render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "./index";

describe("index route", () => {
  it("показывает текст основы клиента", async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: ["/"],
      }),
    });

    await router.load();

    render(<RouterProvider router={router} />);

    expect(await screen.findByText("Основа клиента собрана")).toBeTruthy();
  });
});
