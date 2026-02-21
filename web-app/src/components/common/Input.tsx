import styles from "./Input.module.css";
import type {
  UseFormRegister,
  FieldValues,
  Path,
  RegisterOptions,
} from "react-hook-form";

interface InputProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  type?: string;
  placeholder?: string;
  register: UseFormRegister<T>;
  options?: RegisterOptions<T>;
  error?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Input = <T extends FieldValues>({
  label,
  name,
  type,
  placeholder,
  register,
  options,
  error,
  onChange,
}: InputProps<T>) => {
  return (
    <div className={styles.container}>
      <label htmlFor={name}>{label}</label>
      <input
        type={type}
        id={name}
        placeholder={placeholder}
        {...register(name, options)}
        onChange={onChange}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};
