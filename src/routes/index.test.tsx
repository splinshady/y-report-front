import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appShellClassName } from "../components/app-shell";
import { pageGutterClassName } from "../components/page-layout";
import { scheduleMessages } from "../features/schedule/messages";
import { accountMessages } from "../messages/account";
import { homeMessages } from "../messages/home";
import { navigationMessages } from "../messages/navigation";
import { reportsMessages } from "../messages/reports";
import { settingsMessages } from "../messages/settings";
import { signInMessages } from "../messages/sign-in";
import { signUpMessages } from "../messages/sign-up";
import { routeTree } from "./index";
import { paths } from "./paths";

const { signInSocial, sessionState, clientOptions } = vi.hoisted(() => ({
  signInSocial: vi.fn(),
  sessionState: {
    current: null as { user: { name: string; email: string; image?: string | null } } | null,
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
  callbackURL: `http://127.0.0.1:5173${paths.account}`,
};

const sessionUser = {
  user: {
    name: "Мария Соколова",
    email: "maria@example.com",
  },
};

const tabLabels = [
  navigationMessages.home,
  navigationMessages.schedule,
  navigationMessages.reports,
  navigationMessages.settings,
  navigationMessages.account,
] as const;

const guardedPaths = [paths.home, paths.reports, paths.settings, paths.account] as const;

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

function expectNoNavigation() {
  for (const label of tabLabels) {
    expect(screen.queryByRole("link", { name: label })).toBeNull();
  }
}

async function expectNavigation(currentLabel: (typeof tabLabels)[number]) {
  const links = [];

  for (const label of tabLabels) {
    links.push(await screen.findByRole("link", { name: label }));
  }

  const currentLinks = links.filter((link) => link.getAttribute("aria-current") === "page");
  expect(currentLinks).toHaveLength(1);
  expect(currentLinks[0]?.textContent).toBe(currentLabel);
  expect(currentLinks[0]?.className).toContain("text-ink");
  expect(currentLinks[0]?.className).toContain("font-medium");

  for (const link of links) {
    expect(link.className).toContain("min-h-touch");
    expect(link.className).toContain("flex-1");
    expect(link.className).toContain("min-w-0");
    expect(link.className).toContain("sm:flex-none");
    if (link === currentLinks[0]) {
      continue;
    }
    expect(link.className).toContain("text-muted");
    expect(link.className).not.toContain("font-medium");
    expect(link.className).not.toBe(currentLinks[0]?.className);
  }

  const navigation = screen.getByRole("navigation", { name: navigationMessages.menu });
  expect(navigation.className).toContain("flex-nowrap");
  expect(navigation.className).toContain("bg-canvas");
  expect(navigation.className).toContain("font-sans");
  expect(navigation.className).toContain("text-xs");
  expect(navigation.className).toContain(pageGutterClassName);
  expect(navigation.style.paddingTop).toBe("env(safe-area-inset-top)");
  expect(navigation.parentElement?.style.paddingBottom).toBe("env(safe-area-inset-bottom)");
}

describe("index route", () => {
  afterEach(() => {
    cleanup();
    signInSocial.mockClear();
    sessionState.current = null;
  });

  it("при сессии / показывает текст основы клиента", async () => {
    sessionState.current = sessionUser;

    await renderPath(paths.home);

    const homeText = await screen.findByText(homeMessages.ready);
    expect(homeText.parentElement?.className).toContain("max-w-screen-xl");
    expect(homeText.parentElement?.className).toContain(pageGutterClassName);
  });

  it("на четырёх экранах четыре вкладки, текущая одна и отличается", async () => {
    sessionState.current = sessionUser;

    const screens = [
      { path: paths.home, current: navigationMessages.home },
      { path: paths.schedule, current: navigationMessages.schedule },
      { path: paths.reports, current: navigationMessages.reports },
      { path: paths.settings, current: navigationMessages.settings },
      { path: paths.account, current: navigationMessages.account },
    ] as const;

    for (const screenCase of screens) {
      await renderPath(screenCase.path);
      await expectNavigation(screenCase.current);
      cleanup();
    }
  });

  it("аватар справа в меню ведёт в аккаунт", async () => {
    sessionState.current = sessionUser;

    await renderPath(paths.home);

    const navigation = await screen.findByRole("navigation", { name: navigationMessages.menu });
    const avatarLink = screen.getByRole("link", {
      name: accountMessages.avatar(sessionUser.user.name),
    });

    expect(avatarLink.getAttribute("href")).toBe(paths.account);
    expect(navigation.lastElementChild).toBe(avatarLink);
    expect(avatarLink.textContent).toBe("МС");
  });

  it("у отчётов и настроек есть свой заголовок", async () => {
    sessionState.current = sessionUser;

    await renderPath(paths.reports);
    expect(
      await screen.findByRole("heading", { name: reportsMessages.title }),
    ).toBeTruthy();

    cleanup();

    await renderPath(paths.settings);
    expect(
      await screen.findByRole("heading", { name: settingsMessages.title }),
    ).toBeTruthy();
  });

  it("без сессии четыре экрана ведут на вход", async () => {
    for (const path of guardedPaths) {
      const router = await renderPath(path);
      expect(router.state.location.pathname).toBe(paths.signIn);
      expect(await screen.findByRole("button", { name: signInMessages.submit })).toBeTruthy();
      expectNoNavigation();
      cleanup();
    }
  });

  it("с сессией вход и регистрация ведут на аккаунт", async () => {
    sessionState.current = sessionUser;

    const signIn = await renderPath(paths.signIn);
    expect(signIn.state.location.pathname).toBe(paths.account);
    expect(await screen.findByText("Мария Соколова")).toBeTruthy();

    cleanup();

    const signUp = await renderPath(paths.signUp);
    expect(signUp.state.location.pathname).toBe(paths.account);
    expect(await screen.findByText("maria@example.com")).toBeTruthy();
  });

  it("на входе кнопка вызывает вход yandex, ссылка «Создать ID» ведёт на регистрацию, меню нет", async () => {
    await renderPath(paths.signIn);

    const signInButton = await screen.findByRole("button", { name: signInMessages.submit });
    const signInMain = signInButton.closest("main");
    expect(signInMain?.className).toContain(pageGutterClassName);
    expect(signInMain?.parentElement?.className).toBe(appShellClassName);
    expect(signInButton.className).toContain("bg-link");
    expectNoNavigation();

    const createId = await screen.findByRole("link", { name: signInMessages.createId });
    expect(createId.getAttribute("href")).toBe(paths.signUp);

    fireEvent.click(signInButton);

    expect(clientOptions.current?.baseURL).toBe(window.location.origin);
    expect(signInSocial).toHaveBeenCalledTimes(1);
    expect(signInSocial).toHaveBeenCalledWith(yandexSignIn);
  });

  it("на регистрации нет меню, полей email и пароля, действие вызывает тот же вход", async () => {
    await renderPath(paths.signUp);

    expect(await screen.findByRole("heading", { name: signUpMessages.title })).toBeTruthy();
    expectNoNavigation();
    expect(document.querySelector('input[type="email"]')).toBeNull();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(document.querySelector('input[name="email"]')).toBeNull();
    expect(document.querySelector('input[name="password"]')).toBeNull();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByLabelText(/парол/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: signUpMessages.submit }));

    expect(signInSocial).toHaveBeenCalledTimes(1);
    expect(signInSocial).toHaveBeenCalledWith(yandexSignIn);
  });

  it("на аккаунте показывает имя и почту из переданной сессии", async () => {
    sessionState.current = sessionUser;

    await renderPath(paths.account);

    expect(await screen.findByText("Мария Соколова")).toBeTruthy();
    expect(screen.getByText("maria@example.com")).toBeTruthy();
    const card = screen.getByRole("heading", { name: accountMessages.title }).closest("section");
    expect(card).toBeTruthy();
    expect(
      within(card as HTMLElement).getByLabelText(accountMessages.avatar(sessionUser.user.name))
        .textContent,
    ).toBe("МС");
  });

  it("при сессии с главной открывается расписание", async () => {
    sessionState.current = sessionUser;

    const router = await renderPath(paths.home);
    expect(await screen.findByText(homeMessages.ready)).toBeTruthy();

    const link = await screen.findByRole("link", { name: scheduleMessages.open });
    expect(link.getAttribute("href")).toBe(paths.schedule);

    fireEvent.click(link);
    await router.load();

    expect(router.state.location.pathname).toBe(paths.schedule);
    expect(await screen.findByRole("heading", { name: scheduleMessages.title })).toBeTruthy();
  });

  it("прямой путь расписания показывает заголовок и вкладку расписания", async () => {
    sessionState.current = sessionUser;

    await renderPath(paths.schedule);

    expect(await screen.findByRole("heading", { name: scheduleMessages.title })).toBeTruthy();

    const navigation = screen.getByRole("navigation", { name: navigationMessages.menu });
    const tabLinks = tabLabels.map((label) => within(navigation).getByRole("link", { name: label }));
    expect(tabLinks).toHaveLength(tabLabels.length);
    const scheduleTab = within(navigation).getByRole("link", { name: navigationMessages.schedule });
    expect(scheduleTab.getAttribute("href")).toBe(paths.schedule);
    expect(scheduleTab.getAttribute("aria-current")).toBe("page");
    expect(within(navigation).queryByRole("link", { name: scheduleMessages.open })).toBeNull();
  });

  it("без сессии расписание ведёт на вход", async () => {
    const router = await renderPath(paths.schedule);

    expect(router.state.location.pathname).toBe(paths.signIn);
    expect(await screen.findByRole("button", { name: signInMessages.submit })).toBeTruthy();
    expectNoNavigation();
  });

  it("на аккаунте показывает фото из сессии", async () => {
    const image = "https://avatars.yandex.net/get-yapic/example/islands-200";
    sessionState.current = { user: { ...sessionUser.user, image } };

    await renderPath(paths.account);

    const avatar = await screen.findByRole("img", {
      name: accountMessages.avatar(sessionUser.user.name),
    });
    expect(avatar.getAttribute("src")).toBe(image);
  });
});
