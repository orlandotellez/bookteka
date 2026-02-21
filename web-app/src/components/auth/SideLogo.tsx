import styles from "./SideLogo.module.css";
import logo from "../../assets/logoDark.svg";

export const SideLogo = () => {
  return (
    <>
      <article className={styles.container}>
        <img className={styles.logoIcon} src={logo} alt="logo icon" />
      </article>
    </>
  );
};
