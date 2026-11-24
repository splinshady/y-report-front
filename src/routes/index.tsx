import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { authClient, signInWithYandex } from "../lib/auth-client";

async function hasSession() {
  const { data } = await authClient.getSession();
  return data != null;
}

function HomePage() {
  return <p>Основа клиента собрана</p>;
}

function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#121417] px-4 py-10">
      <section className="w-full max-w-[420px] rounded-[32px] bg-[#2b2d31] px-6 py-10 text-white">
        <div className="text-center">
          <p className="text-[32px] font-semibold leading-none tracking-tight">
            Yandex{" "}
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-white text-[13px] font-bold text-black">
              ID
            </span>
          </p>
          <h1 className="mt-8 text-[28px] font-medium leading-tight">Войти с ID</h1>
        </div>
        <button
          type="button"
          className="mt-8 w-full rounded-full bg-white px-4 py-4 text-lg font-medium text-black"
          onClick={() => void signInWithYandex()}
        >
          Войти через Яндекс
        </button>
        <Link
          to="/sign-up"
          className="mt-3 block w-full rounded-2xl border border-white/15 px-4 py-4 text-center text-lg text-white"
        >
          Создать ID
        </Link>
      </section>
    </main>
  );
}

function SignUpPage() {
  return (
    <section>
      <h1>Регистрация</h1>
      <button type="button" onClick={() => void signInWithYandex()}>
        Зарегистрироваться через Яндекс
      </button>
    </section>
  );
}

function AccountPage() {
  const { data } = authClient.useSession();
  const name = data?.user.name;
  const email = data?.user.email;

  return (
    <section>
      <h1>Аккаунт</h1>
      {name ? <p>{name}</p> : null}
      {email ? <p>{email}</p> : null}
    </section>
  );
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    if (!(await hasSession())) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: HomePage,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  beforeLoad: async () => {
    if (await hasSession()) {
      throw redirect({ to: "/account" });
    }
  },
  component: SignInPage,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-up",
  beforeLoad: async () => {
    if (await hasSession()) {
      throw redirect({ to: "/account" });
    }
  },
  component: SignUpPage,
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  beforeLoad: async () => {
    if (!(await hasSession())) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: AccountPage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  signUpRoute,
  accountRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
