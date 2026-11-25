import type { ReactNode } from "react";

export function DisplayTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display text-display font-semibold tracking-display text-accent">
      {children}
    </h1>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display text-title font-semibold tracking-title text-ink">{children}</h1>
  );
}

export const textLinkClassName = "font-sans text-body tracking-body text-link";
