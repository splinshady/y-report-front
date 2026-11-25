import type { ReactNode } from "react";

export const pageGutterClassName = "page-gutter";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`mx-auto w-full max-w-screen-xl py-12 ${pageGutterClassName}`}>{children}</div>
  );
}
