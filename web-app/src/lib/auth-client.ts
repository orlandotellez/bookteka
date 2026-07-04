import { createAuthClient } from "better-auth/react";

const envBaseURL = (import.meta.env.VITE_BETTER_AUTH_CLIENT ?? "").trim();
const baseURL: string | undefined = envBaseURL.length > 0
  ? envBaseURL
  : typeof window !== "undefined"
    ? `${window.location.origin}/api/auth`
    : "/api/auth";

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include"
  }
});
