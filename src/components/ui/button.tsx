import type { ButtonHTMLAttributes } from "react";

export function Button({
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-touch items-center justify-center rounded-pill bg-link px-5 font-sans text-body tracking-body text-white ${className}`}
      {...props}
    />
  );
}
