import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { AppNav } from "../components/app-nav";
import { AppShell } from "../components/app-shell";
import { PageLayout, pageGutterClassName } from "../components/page-layout";
import { AccountAvatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { SurfaceCard } from "../components/ui/surface-card";
import { DisplayTitle, PageTitle, textLinkClassName } from "../components/ui/type";
import { scheduleMessages } from "../features/schedule/messages";
import { SchedulePage } from "../features/schedule/schedule-page";
import { authClient, signInWithYandex } from "../lib/auth-client";
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

function HomePage() {
  return (
    <>
      <p>{homeMessages.ready}</p>
      <Link
        to={paths.schedule}
        className={`mt-4 inline-flex min-h-touch items-center ${textLinkClassName}`}
      >
        {scheduleMessages.open}
      </Link>
    </>
  );
}

function ScheduleRoute() {
  return <SchedulePage today={new Date()} />;
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

  return (
    <SurfaceCard>
      <PageTitle>{accountMessages.title}</PageTitle>
      <div className="mt-6 flex items-center gap-4">
        <AccountAvatar name={name} image={image} />
        <div>
          {name ? <p>{name}</p> : null}
          {email ? <p className="text-muted">{email}</p> : null}
        </div>
      </div>
    </SurfaceCard>
  );
}

function ReportsPage() {
  return <PageTitle>{reportsMessages.title}</PageTitle>;
}

function SettingsPage() {
  return <PageTitle>{settingsMessages.title}</PageTitle>;
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
  },
  component: () => (
    <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <AppNav />
      <PageLayout>
        <Outlet />
      </PageLayout>
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => navLayoutRoute,
  path: paths.home,
  component: HomePage,
});

const scheduleRoute = createRoute({
  getParentRoute: () => navLayoutRoute,
  path: paths.schedule,
  component: ScheduleRoute,
});

const reportsRoute = createRoute({
  getParentRoute: () => navLayoutRoute,
  path: paths.reports,
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
