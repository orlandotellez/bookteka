import styles from "./Spinner.module.css"

export const Spinner = () => {
  return (
    <>
      <div className={styles.content}>
        <div className={styles.spinner}></div>
      </div>
    </>
  )
}

