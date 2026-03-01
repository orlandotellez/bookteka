import { Spinner } from "./Spinner"
import styles from "./Loading.module.css"

interface LoadingProps {
  text: string
}

export const Loading = ({ text }: LoadingProps) => {
  return (
    <>
      <div className={styles.container}>
        <div className={styles.content}>
          <Spinner />
          <span>{text}</span>
        </div>
      </div>

    </>
  )
}

