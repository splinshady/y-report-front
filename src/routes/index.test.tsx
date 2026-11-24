import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "./index";

const { signInSocial, sessionState, clientOptions } = vi.hoisted(() => ({
  signInSocial: vi.fn(),
  sessionState: {
    current: null as { user: { name: string; email: string } } | null,
  },
  clientOptions: {
    current: null as { baseURL?: string } | null,
  },
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: (options?: { baseURL?: string }) => {
    clientOptions.current = options ?? null;
    return {
      signIn: {
        social: signInSocial,
      },
      getSession: async () => ({
        data: sessionState.current,
        error: null,
      }),
      useSession: () => ({
        data: sessionState.current,
        isPending: false,
        isRefetching: false,
        error: null,
        refetch: async () => undefined,
      }),
    };
  },
}));

const yandexSignIn = {
  provider: "yandex",
  callbackURL: "http://127.0.0.1:5173/account",
};

const sessionUser = {
  user: {
    name: "Мария Соколова",
    email: "maria@example.com",
  },
};

async function renderPath(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [path],
    }),
  });

  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}

describe("index route", () => {
  afterEach(() => {
    cleanup();
    signInSocial.mockClear();
    sessionState.current = null;
  });

  it("при сессии / показывает текст основы клиента", async () => {
    sessionState.current = sessionUser;

    await renderPath("/");

    expect(await screen.findByText("Основа клиента собрана")).toBeTruthy();
  });

  it("без сессии / и /account переходят на /sign-in", async () => {
    const home = await renderPath("/");
    expect(home.state.location.pathname).toBe("/sign-in");
    expect(await screen.findByRole("button", { name: "Войти через Яндекс" })).toBeTruthy();

    cleanup();

    const account = await renderPath("/account");
    expect(account.state.location.pathname).toBe("/sign-in");
    expect(await screen.findByRole("button", { name: "Войти через Яндекс" })).toBeTruthy();
  });

  it("с сессией /sign-in и /sign-up переходят на /account", async () => {
    sessionState.current = sessionUser;

    const signIn = await renderPath("/sign-in");
    expect(signIn.state.location.pathname).toBe("/account");
    expect(await screen.findByText("Мария Соколова")).toBeTruthy();

    cleanup();

    const signUp = await renderPath("/sign-up");
    expect(signUp.state.location.pathname).toBe("/account");
    expect(await screen.findByText("maria@example.com")).toBeTruthy();
  });

  it("на /sign-in кнопка вызывает вход yandex, ссылка «Создать ID» ведёт на /sign-up", async () => {
    await renderPath("/sign-in");

    const createId = await screen.findByRole("link", { name: "Создать ID" });
    expect(createId.getAttribute("href")).toBe("/sign-up");

    fireEvent.click(await screen.findByRole("button", { name: "Войти через Яндекс" }));

    expect(clientOptions.current?.baseURL).toBe(window.location.origin);
    expect(signInSocial).toHaveBeenCalledTimes(1);
    expect(signInSocial).toHaveBeenCalledWith(yandexSignIn);
  });

  it("на /sign-up нет полей email и пароля, действие вызывает тот же вход", async () => {
    await renderPath("/sign-up");

    expect(await screen.findByRole("heading", { name: "Регистрация" })).toBeTruthy();
    expect(document.querySelector('input[type="email"]')).toBeNull();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(document.querySelector('input[name="email"]')).toBeNull();
    expect(document.querySelector('input[name="password"]')).toBeNull();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByLabelText(/парол/i)).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Зарегистрироваться через Яндекс" }),
    );

    expect(signInSocial).toHaveBeenCalledTimes(1);
    expect(signInSocial).toHaveBeenCalledWith(yandexSignIn);
  });

  it("на /account показывает имя и почту из переданной сессии", async () => {
    sessionState.current = sessionUser;

    await renderPath("/account");

    expect(await screen.findByText("Мария Соколова")).toBeTruthy();
    expect(screen.getByText("maria@example.com")).toBeTruthy();
  });
});
