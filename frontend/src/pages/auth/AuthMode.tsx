import { Link } from "react-router-dom";
import { AuthScreen } from "@/components/pages/auth/AuthScreen";
import { LoginForm } from "@/components/pages/auth/LoginForm";
import styles from "./AuthMode.module.css";

export const AuthMode = () => {
  return (
    <AuthScreen>
      <LoginForm />
      <p className={styles.registerLink}>
        ¿No tenés cuenta? <Link to="/auth/register">Crear una</Link>
      </p>
    </AuthScreen>
  );
};
