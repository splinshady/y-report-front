import type { ReactNode } from "react";

export const pageGutterClassName =
  "px-gutter sm:px-gutter-sm md:px-gutter-md lg:px-gutter-lg xl:px-gutter-xl";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`mx-auto w-full max-w-screen-xl ${pageGutterClassName}`}>{children}</div>
  );
}
