import { Minus, Plus, Type, AlignJustify, MoveHorizontal } from "lucide-react";
import { useState } from "react";
import styles from "./ReadingControls.module.css";

export interface ReadingSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  textWidth: number;
}

interface ReadingControlsProps {
  settings: ReadingSettings;
  onSettingsChange: (settings: ReadingSettings) => void;
}

const fontOptions = [
  { value: "serif", label: "Crimson Pro" },
  { value: "serifAlt", label: "Merriweather" },
  { value: "sans", label: "Inter" },
  { value: "sansAlt", label: "Open Sans" },
];

export const ReadingControls = ({
  settings,
  onSettingsChange,
}: ReadingControlsProps) => {
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showLineHeight, setShowLineHeight] = useState(false);
  const [showWidth, setShowWidth] = useState(false);

  const updateSetting = <K extends keyof ReadingSettings>(
    key: K,
    value: ReadingSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        {/* Tamaño de fuente */}
        <div className={styles.group}>
          <button
            onClick={() =>
              updateSetting("fontSize", Math.max(14, settings.fontSize - 2))
            }
          >
            <Minus size={16} />
          </button>

          <span className={styles.value}>{settings.fontSize}px</span>

          <button
            onClick={() =>
              updateSetting("fontSize", Math.min(32, settings.fontSize + 2))
            }
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Fuente */}
        <div className={styles.dropdown}>
          <button onClick={() => setShowFontMenu((prev) => !prev)}>
            <Type size={16} /> Fuente
          </button>

          {showFontMenu && (
            <div className={styles.menu}>
              {fontOptions.map((font) => (
                <button
                  key={font.value}
                  className={
                    settings.fontFamily === font.value
                      ? styles.activeItem
                      : styles.menuItem
                  }
                  onClick={() => {
                    updateSetting("fontFamily", font.value);
                    setShowFontMenu(false);
                  }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Interlineado */}
        <div className={styles.dropdown}>
          <button onClick={() => setShowLineHeight((prev) => !prev)}>
            <AlignJustify size={16} /> Líneas
          </button>

          {showLineHeight && (
            <div className={styles.menu}>
              <span>Interlineado: {settings.lineHeight.toFixed(1)}</span>

              <input
                type="range"
                min={1.2}
                max={2.5}
                step={0.1}
                value={settings.lineHeight}
                onChange={(e) =>
                  updateSetting("lineHeight", Number(e.target.value))
                }
              />
            </div>
          )}
        </div>

        {/* Ancho */}
        <div className={styles.dropdown}>
          <button onClick={() => setShowWidth((prev) => !prev)}>
            <MoveHorizontal size={16} /> Ancho
          </button>

          {showWidth && (
            <div className={styles.menu}>
              <span>Ancho: {settings.textWidth}%</span>

              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={settings.textWidth}
                onChange={(e) =>
                  updateSetting("textWidth", Number(e.target.value))
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
