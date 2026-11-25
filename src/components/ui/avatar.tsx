import { useState } from "react";
import { accountMessages } from "../../messages/account";

export function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("ru-RU") ?? "")
    .join("");
}

const avatarSizeClassName = {
  account: "size-16 text-title",
  menu: "size-8 text-xs",
} as const;

export function AccountAvatar({
  name,
  image,
  size = "account",
  labelled = true,
}: {
  name?: string;
  image?: string | null;
  size?: keyof typeof avatarSizeClassName;
  labelled?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(image) && !failed;
  const label = name ? accountMessages.avatar(name) : accountMessages.avatarFallback;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-pill bg-tile-lilac font-display font-semibold text-ink ${avatarSizeClassName[size]}`}
    >
      {showImage ? (
        <img
          src={image ?? undefined}
          alt={labelled ? label : ""}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden={labelled ? undefined : true} aria-label={labelled ? label : undefined}>
          {name ? initialsFromName(name) : ""}
        </span>
      )}
    </div>
  );
}
