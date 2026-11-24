import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
});

const accountCallbackURL = "http://127.0.0.1:5173/account";

export function signInWithYandex() {
  return authClient.signIn.social({
    provider: "yandex",
    callbackURL: accountCallbackURL,
  });
}
