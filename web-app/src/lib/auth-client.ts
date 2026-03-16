import { createAuthClient } from "better-auth/react";

const API_URL = import.meta.env.BASE_URL

export const authClient = createAuthClient({
  baseURL: API_URL,
});
