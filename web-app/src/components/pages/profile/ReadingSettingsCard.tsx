import { Settings, RotateCcw } from "lucide-react";
import type { ReadingSettings } from "@/types/reading";
import styles from "./ReadingSettingsCard.module.css";

const FONTS = [
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
];

interface ReadingSettingsCardProps {
  settings: ReadingSettings;
  onChange: (settings: ReadingSettings) => void;
  onReset: () => void;
}

export const ReadingSettingsCard = ({
  settings,
  onChange,
  onReset,
}: ReadingSettingsCardProps) => {
  const handleChange = (field: keyof ReadingSettings, value: number | string) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Settings size={20} color="var(--font-color-title)" />
          <h3>Configuración de lectura</h3>
        </div>
        <button className={styles.resetButton} onClick={onReset} title="Restablecer valores">
          <RotateCcw size={16} />
        </button>
      </div>

      <div className={styles.grid}>
        {/* Tamaño de fuente */}
        <div className={styles.field}>
          <label className={styles.label}>
            Tamaño de fuente: <span className={styles.value}>{settings.fontSize}px</span>
          </label>
          <input
            type="range"
            min="12"
            max="32"
            step="1"
            value={settings.fontSize}
            onChange={(e) => handleChange("fontSize", Number(e.target.value))}
            className={styles.slider}
          />
        </div>

        {/* Tipo de fuente */}
        <div className={styles.field}>
          <label className={styles.label}>Tipo de fuente</label>
          <select
            value={settings.fontFamily}
            onChange={(e) => handleChange("fontFamily", e.target.value)}
            className={styles.select}
          >
            {FONTS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>

        {/* Interlineado */}
        <div className={styles.field}>
          <label className={styles.label}>
            Interlineado: <span className={styles.value}>{settings.lineHeight.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.1"
            value={settings.lineHeight}
            onChange={(e) => handleChange("lineHeight", Number(e.target.value))}
            className={styles.slider}
          />
        </div>

        {/* Ancho del texto */}
        <div className={styles.field}>
          <label className={styles.label}>
            Ancho del texto: <span className={styles.value}>{settings.textWidth}%</span>
          </label>
          <input
            type="range"
            min="50"
            max="100"
            step="5"
            value={settings.textWidth}
            onChange={(e) => handleChange("textWidth", Number(e.target.value))}
            className={styles.slider}
          />
        </div>
      </div>

      <p className={styles.hint}>
        Estos valores se aplicarán por defecto a todos los libros.
      </p>
    </div>
  );
};
