import { Link } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";
import { accountMessages } from "../messages/account";
import { navigationMessages } from "../messages/navigation";
import { paths } from "../routes/paths";
import { AccountAvatar } from "./ui/avatar";
import { pageGutterClassName } from "./page-layout";

const navItemClassName =
  "flex min-h-touch min-w-0 flex-1 items-center justify-center whitespace-nowrap sm:flex-none";

export function AppNav() {
  const { data } = authClient.useSession();
  const name = data?.user.name;
  const avatarLabel = name ? accountMessages.avatar(name) : accountMessages.avatarFallback;

  return (
    <nav
      className={`flex w-full flex-nowrap items-center bg-canvas font-sans text-xs sm:gap-x-6 ${pageGutterClassName}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex min-w-0 flex-1 flex-nowrap sm:gap-x-6">
      <Link
        to={paths.home}
        activeOptions={{ exact: true }}
        className={navItemClassName}
        activeProps={{ className: "font-medium text-ink" }}
        inactiveProps={{ className: "text-muted" }}
      >
        {navigationMessages.home}
      </Link>
      <Link
        to={paths.schedule}
        className={navItemClassName}
        activeProps={{ className: "font-medium text-ink" }}
        inactiveProps={{ className: "text-muted" }}
      >
        {navigationMessages.schedule}
      </Link>
      <Link
        to={paths.reports}
        className={navItemClassName}
        activeProps={{ className: "font-medium text-ink" }}
        inactiveProps={{ className: "text-muted" }}
      >
        {navigationMessages.reports}
      </Link>
      <Link
        to={paths.settings}
        className={navItemClassName}
        activeProps={{ className: "font-medium text-ink" }}
        inactiveProps={{ className: "text-muted" }}
      >
        {navigationMessages.settings}
      </Link>
      <Link
        to={paths.account}
        className={navItemClassName}
        activeProps={{ className: "font-medium text-ink" }}
        inactiveProps={{ className: "text-muted" }}
      >
        {navigationMessages.account}
      </Link>
      </div>
      <Link
        to={paths.account}
        aria-label={avatarLabel}
        className="ml-2 flex min-h-touch shrink-0 items-center"
      >
        <AccountAvatar name={name} image={data?.user.image} size="menu" labelled={false} />
      </Link>
    </nav>
  );
}
