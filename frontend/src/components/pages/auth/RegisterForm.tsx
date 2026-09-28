import styles from "./Auth.module.css";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/common/Input.tsx";
import {
  registerSchema,
  type RegisterData,
} from "../../../validations/loginValidations.ts";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/lib/auth-api";
import { invalidateAuthSession } from "@/lib/useAuthSession";
import { useState } from "react";
import logoDark from "../../../assets/logoDark.svg";
import logoLight from "../../../assets/logoLight.svg";
import { useTheme } from "@/context/ThemeContext";
import { isDarkTheme } from "@/context/theme";
import { IconTheme } from "../../common/IconTheme.tsx";

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme()

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
      await authApi.register(dataForm.name, dataForm.email, dataForm.password);
      invalidateAuthSession();
      navigate("/");
    } catch (err) {
      console.error("Error inesperado:", err);
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  const onError = (errors: unknown) => {
    console.log("Errores de validación:", errors);
  };

  return (
    <article className={styles.container}>
      <div className={styles.iconContainer}>
        <IconTheme />
      </div>

      <div className={styles.logo}>
        {isDarkTheme(theme) ? (
          <>
            <img src={logoDark} alt="logo bookteka" />
          </>
        ) : (
          <>
            <img src={logoLight} alt="logo bookteka" />
          </>
        )}
        <h1>Bookteka</h1>
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

          <Input
            label="Confirm password"
            type="password"
            placeholder="Repeat your password"
            error={errors.confirmPassword?.message}
            register={register}
            name="confirmPassword"
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
