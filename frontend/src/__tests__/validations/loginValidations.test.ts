import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "@/validations/loginValidations";

describe("loginSchema", () => {
  it("acepta un login válido", () => {
    const parsed = loginSchema.safeParse({
      email: "usuario@test.com",
      password: "MiPassword123",
    });

    expect(parsed.success).toBe(true);
  });

  it("rechaza un email inválido", () => {
    const parsed = loginSchema.safeParse({
      email: "no-es-email",
      password: "MiPassword123",
    });

    expect(parsed.success).toBe(false);
  });

  it("documenta la divergencia: acepta contraseñas de 6 caracteres", () => {
    const parsed = loginSchema.safeParse({
      email: "usuario@test.com",
      password: "123456",
    });

    expect(parsed.success).toBe(true);

    const backend = {
      min: 8,
      message: "La contraseña debe tener al menos 8 caracteres",
    };
    expect(parsed.success && backend.min).toBe(8);
  });
});

describe("registerSchema", () => {
  it("rechaza si las contraseñas no coinciden", () => {
    const parsed = registerSchema.safeParse({
      name: "Carlos",
      email: "carlos@test.com",
      password: "MiPassword123",
      confirmPassword: "OtraPass123",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(["confirmPassword"]);
    }
  });

  it("expone los mensajes de error desactualizados", () => {
    const parsed = registerSchema.safeParse({
      name: "Carlos",
      email: "carlos@test.com",
      password: "123",
      confirmPassword: "123",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find(
        (i) => i.path[0] === "password",
      );
      expect(passwordIssue?.message).toContain("El minimo");
      expect(passwordIssue?.message).toContain("2");
    }
  });

  it("documenta la divergencia: acepta contraseñas de 6 caracteres", () => {
    const parsed = registerSchema.safeParse({
      name: "Carlos",
      email: "carlos@test.com",
      password: "123456",
      confirmPassword: "123456",
    });

    expect(parsed.success).toBe(true);
  });

  it("acepta un registro válido", () => {
    const parsed = registerSchema.safeParse({
      name: "Carlos",
      email: "carlos@test.com",
      password: "MiPassword123",
      confirmPassword: "MiPassword123",
    });

    expect(parsed.success).toBe(true);
  });
});