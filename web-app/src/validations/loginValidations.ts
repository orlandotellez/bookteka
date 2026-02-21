import z from "zod";

export const loginSchema = z.object({
  password: z
    .string()
    .min(6, "El minimo de caracteres es de 2")
    .max(100, "El maximo de caracateres de de 10"),
  email: z.email(),
});

export const registerSchema = z.object({
  name: z.string(),
  last_name: z.string(),
  age: z.number(),
  email: z.email(),
  username: z.string(),
  password: z.string(),
});

export type LoginData = z.infer<typeof loginSchema>;

export type RegisterData = z.infer<typeof registerSchema>;
