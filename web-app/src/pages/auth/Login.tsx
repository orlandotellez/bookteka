import { LoginForm } from "@/components/auth/LoginForm";
import { SideLogo } from "@/components/auth/SideLogo";
import styles from "./Login.module.css";

const Login = () => {
  return (
    <>
      <section className={styles.container}>
        <SideLogo />
        <LoginForm />
      </section>
    </>
  );
};

export default Login;
