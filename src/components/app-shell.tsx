import type { ReactNode } from "react";

export const appShellClassName =
  "min-h-dvh bg-hero font-sans text-body tracking-body text-ink antialiased";

export function AppShell({ children }: { children: ReactNode }) {
  return <div className={appShellClassName}>{children}</div>;
}
