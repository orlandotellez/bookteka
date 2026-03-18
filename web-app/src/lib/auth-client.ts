import { createAuthClient } from "better-auth/react";

const API_URL = import.meta.env.VITE_BETTER_AUTH_CLIENT || ""


export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    credentials: "include"
  }
});
