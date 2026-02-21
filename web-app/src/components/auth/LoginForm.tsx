import styles from "./LoginForm.module.css";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/common/Input.tsx";
import {
  loginSchema,
  type LoginData,
} from "../../validations/loginValidations.ts";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client.ts";
import { useState } from "react";

export const LoginForm = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (dataForm: LoginData) => {
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: dataForm.email,
        password: dataForm.password,
      });

      if (signInError) {
        setLoading(false);
        setError(signInError.message || "Error al iniciar sesión");
        return;
      }

      navigate("/");
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
      <form className={styles.form} onSubmit={handleSubmit(onSubmit, onError)}>
        <h4>Login Form</h4>

        {error && (
          <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
        )}

        <div className={styles.inputs}>
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
          Don't have an account?{" "}
          <Link to={"/auth/register"}>Register here</Link>
        </span>
      </div>
    </article>
  );
};
