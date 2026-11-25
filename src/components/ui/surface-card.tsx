import type { ReactNode } from "react";

export function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card bg-surface px-8 py-10 text-ink ${className}`}>
      {children}
    </section>
  );
}
