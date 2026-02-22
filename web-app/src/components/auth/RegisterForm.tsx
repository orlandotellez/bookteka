import styles from "./Auth.module.css";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/common/Input.tsx";
import {
  registerSchema,
  type RegisterData,
} from "../../validations/loginValidations.ts";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client.ts";
import { useState } from "react";
import { IconTheme } from "../common/IconTheme.tsx";

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
  });

  const onSubmit = async (dataForm: RegisterData) => {
    setLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await authClient.signUp.email({
        email: dataForm.email,
        password: dataForm.password,
        name: dataForm.name,
      });

      if (signUpError) {
        setLoading(false);
        setError(signUpError.message || "Error al iniciar sesión");
        return;
      }

      navigate("/auth/login");
    } catch (err) {
      console.error("Error inesperado:", err);
      setError("Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  const onError = (errors: any) => {
    console.log("Errores de validación:", errors);
  };

  return (
    <article className={styles.container}>
      <div className={styles.iconContainer}>
        <IconTheme />
      </div>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit, onError)}>
        <h4>Register</h4>
        <p>Create a new account</p>

        {error && (
          <div style={{ color: "var(--error-color)", marginBottom: "10px" }}>
            {error}
          </div>
        )}

        <div className={styles.inputs}>
          <Input
            label="Name"
            type="name"
            placeholder="User"
            error={errors.name?.message}
            register={register}
            name="name"
          />

          <Input
            label="Email"
            type="email"
            placeholder="email@ejemplo.com"
            error={errors.email?.message}
            register={register}
            name="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="Password"
            error={errors.password?.message}
            register={register}
            name="password"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Cargando..." : "Submit"}
          </button>
        </div>
      </form>
      <div className={styles.notAccount}>
        <span>
          Do you already have an account?
          <Link to={"/auth/login"}>Login in</Link>
        </span>
      </div>
    </article>
  );
};
