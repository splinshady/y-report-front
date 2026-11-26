import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { AppNav } from "../components/app-nav";
import { AppShell } from "../components/app-shell";
import { PageLayout, pageGutterClassName } from "../components/page-layout";
import { AccountAvatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { SurfaceCard } from "../components/ui/surface-card";
import { DisplayTitle, PageTitle, textLinkClassName } from "../components/ui/type";
import { scheduleApi } from "../features/schedule/api";
import { scheduleMessages } from "../features/schedule/messages";
import { SchedulePage } from "../features/schedule/schedule-page";
import { authClient, signInWithYandex } from "../lib/auth-client";
import { createTaxiPark, inviteWorker, loadTaxiParkMembership } from "../lib/taxi-park";
import { accountMessages } from "../messages/account";
import { homeMessages } from "../messages/home";
import { reportsMessages } from "../messages/reports";
import { settingsMessages } from "../messages/settings";
import { signInMessages } from "../messages/sign-in";
import { signUpMessages } from "../messages/sign-up";
import { paths } from "./paths";

async function hasSession() {
  const { data } = await authClient.getSession();
  return data != null;
}

const settingsFieldClassName =
  "min-h-touch rounded-card border border-border bg-surface px-4 font-sans text-body tracking-body text-ink";

function HomePage() {
  const { membership } = indexRoute.useRouteContext();

  return (
    <>
      <p>{homeMessages.ready}</p>
      {membership ? (
        <Link
          to={paths.schedule}
          className={`mt-4 inline-flex min-h-touch items-center ${textLinkClassName}`}
        >
          {scheduleMessages.open}
        </Link>
      ) : null}
    </>
  );
}

function ScheduleRoute() {
  const { membership } = scheduleRoute.useRouteContext();
  return (
    <SchedulePage today={new Date()} api={scheduleApi} canApprove={membership?.role === "owner"} />
  );
}

function SignInPage() {
  return (
    <main
      className={`flex min-h-dvh w-full items-center justify-center ${pageGutterClassName}`}
    >
      <SurfaceCard className="w-full max-w-md text-center">
        <DisplayTitle>{signInMessages.title}</DisplayTitle>
        <Button className="mt-8 w-full" onClick={() => void signInWithYandex()}>
          {signInMessages.submit}
        </Button>
        <Link to={paths.signUp} className={`mt-4 inline-block ${textLinkClassName}`}>
          {signInMessages.createId}
        </Link>
      </SurfaceCard>
    </main>
  );
}

function SignUpPage() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col">
      <PageTitle>{signUpMessages.title}</PageTitle>
      <Button className="mt-8 w-full" onClick={() => void signInWithYandex()}>
        {signUpMessages.submit}
      </Button>
    </section>
  );
}

function AccountPage() {
  const { data } = authClient.useSession();
  const name = data?.user.name;
  const email = data?.user.email;
  const image = data?.user.image;
  const userId = data?.user.id;

  return (
    <SurfaceCard>
      <PageTitle>{accountMessages.title}</PageTitle>
      <div className="mt-6 flex items-center gap-4">
        <AccountAvatar name={name} image={image} />
        <div>
          {name ? <p>{name}</p> : null}
          {email ? <p className="text-muted">{email}</p> : null}
          {userId ? (
            <p className="mt-4 font-sans text-body tracking-body">
              <span className="text-muted">{accountMessages.userId}</span>
              <span className="mt-1 block text-ink">{userId}</span>
            </p>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  );
}

function ReportsPage() {
  return <PageTitle>{reportsMessages.title}</PageTitle>;
}

function SettingsPage() {
  const { membership } = settingsRoute.useRouteContext();
  const router = useRouter();
  const [parkName, setParkName] = useState("");
  const [inviteId, setInviteId] = useState("");

  async function submitPark() {
    const trimmed = parkName.trim();
    if (trimmed.length === 0) {
      return;
    }

    try {
      await createTaxiPark(trimmed);
      await router.invalidate();
    } catch {
      return;
    }
  }

  async function submitInvite() {
    const trimmed = inviteId.trim();
    if (trimmed.length === 0) {
      return;
    }

    try {
      await inviteWorker(trimmed);
    } catch {
      return;
    }
  }

  return (
    <>
      <PageTitle>{settingsMessages.title}</PageTitle>
      {membership == null ? (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitPark();
          }}
        >
          <label className="flex flex-col gap-2 font-sans text-body tracking-body text-ink">
            {settingsMessages.parkName}
            <input
              value={parkName}
              onChange={(event) => setParkName(event.target.value)}
              className={settingsFieldClassName}
            />
          </label>
          <Button type="submit">{settingsMessages.createPark}</Button>
        </form>
      ) : null}
      {membership?.role === "owner" ? (
        <div className="mt-6 flex flex-col gap-4">
          <p className="font-sans text-body tracking-body text-ink">{membership.name}</p>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitInvite();
            }}
          >
            <label className="flex flex-col gap-2 font-sans text-body tracking-body text-ink">
              {settingsMessages.userId}
              <input
                value={inviteId}
                onChange={(event) => setInviteId(event.target.value)}
                className={settingsFieldClassName}
              />
            </label>
            <Button type="submit">{settingsMessages.invite}</Button>
          </form>
        </div>
      ) : null}
    </>
  );
}

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const navLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "nav-layout",
  beforeLoad: async () => {
    if (!(await hasSession())) {
      throw redirect({ to: paths.signIn });
    }

    try {
      return { membership: await loadTaxiParkMembership() };
    } catch {
      return { membership: null };
    }
  },
  component: function NavLayout() {
    const { membership } = navLayoutRoute.useRouteContext();
    return (
      <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <AppNav hasTaxiPark={membership != null} />
        <PageLayout>
          <Outlet />
        </PageLayout>
      </div>
    );
  },
});

const indexRoute = createRoute({
  getParentRoute: () => navLayoutRoute,
  path: paths.home,
  component: HomePage,
});

const scheduleRoute = createRoute({
  getParentRoute: () => navLayoutRoute,
  path: paths.schedule,
  beforeLoad: ({ context }) => {
    if (context.membership == null) {
      throw redirect({ to: paths.home });
    }
  },
  component: ScheduleRoute,
});

const reportsRoute = createRoute({
  getParentRoute: () => navLayoutRoute,
  path: paths.reports,
  beforeLoad: ({ context }) => {
    if (context.membership == null) {
      throw redirect({ to: paths.home });
    }
  },
  component: ReportsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => navLayoutRoute,
  path: paths.settings,
  component: SettingsPage,
});

const accountRoute = createRoute({
  getParentRoute: () => navLayoutRoute,
  path: paths.account,
  component: AccountPage,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.signIn,
  beforeLoad: async () => {
    if (await hasSession()) {
      throw redirect({ to: paths.account });
    }
  },
  component: SignInPage,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.signUp,
  beforeLoad: async () => {
    if (await hasSession()) {
      throw redirect({ to: paths.account });
    }
  },
  component: () => (
    <PageLayout>
      <SignUpPage />
    </PageLayout>
  ),
});

export const routeTree = rootRoute.addChildren([
  navLayoutRoute.addChildren([
    indexRoute,
    scheduleRoute,
    reportsRoute,
    settingsRoute,
    accountRoute,
  ]),
  signInRoute,
  signUpRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
