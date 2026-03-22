import { Minus, Plus, Type, AlignJustify, MoveHorizontal, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
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
  { value: "serif", label: "Crimson Pro", cssValue: '"Crimson Pro", serif' },
  { value: "serifAlt", label: "Merriweather", cssValue: '"Merriweather", serif' },
  { value: "sans", label: "Inter", cssValue: '"Inter", sans-serif' },
  { value: "sansAlt", label: "Open Sans", cssValue: '"Open Sans", sans-serif' },
];

export const ReadingControls = ({
  settings,
  onSettingsChange,
}: ReadingControlsProps) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setActiveMenu(null);

  // Cerrar menú al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    if (activeMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [activeMenu]);

  // Cerrar menú con Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    if (activeMenu) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [activeMenu]);

  const updateSetting = <K extends keyof ReadingSettings>(
    key: K,
    value: ReadingSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  return (
    <div className={styles.container} ref={menuRef}>
      <div className={styles.controls}>
        {/* Tamaño de fuente */}
        <div className={styles.group}>
          <button
            onClick={() =>
              updateSetting("fontSize", Math.max(14, settings.fontSize - 2))
            }
            aria-label="Reducir tamaño de fuente"
          >
            <Minus size={16} />
          </button>

          <span className={styles.value}>{settings.fontSize}</span>

          <button
            onClick={() =>
              updateSetting("fontSize", Math.min(32, settings.fontSize + 2))
            }
            aria-label="Aumentar tamaño de fuente"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Fuente */}
        <div className={styles.dropdown}>
          <button
            className={activeMenu === "font" ? styles.active : ""}
            onClick={() => toggleMenu("font")}
            aria-expanded={activeMenu === "font"}
          >
            <Type size={16} />
            <span>Fuente</span>
          </button>

          {activeMenu === "font" && (
            <div className={styles.menu}>
              <div className={styles.menuHeader}>
                <span>Tipo de letra</span>
                <button onClick={closeMenu} className={styles.closeBtn} aria-label="Cerrar">
                  <X size={16} />
                </button>
              </div>
              <div className={styles.menuContent}>
                {fontOptions.map((font) => (
                  <button
                    key={font.value}
                    className={`${styles.menuItem} ${
                      settings.fontFamily === font.value ? styles.activeItem : ""
                    }`}
                    onClick={() => {
                      updateSetting("fontFamily", font.value);
                      closeMenu();
                    }}
                  >
                    <span style={{ fontFamily: font.cssValue }}>
                      {font.label}
                    </span>
                    {settings.fontFamily === font.value && (
                      <span className={styles.checkmark}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Interlineado */}
        <div className={styles.dropdown}>
          <button
            className={activeMenu === "lineHeight" ? styles.active : ""}
            onClick={() => toggleMenu("lineHeight")}
            aria-expanded={activeMenu === "lineHeight"}
          >
            <AlignJustify size={16} />
            <span>Líneas</span>
          </button>

          {activeMenu === "lineHeight" && (
            <div className={styles.menu}>
              <div className={styles.menuHeader}>
                <span>Interlineado</span>
                <button onClick={closeMenu} className={styles.closeBtn} aria-label="Cerrar">
                  <X size={16} />
                </button>
              </div>
              <div className={styles.menuContent}>
                <div className={styles.sliderValue}>{settings.lineHeight.toFixed(1)}</div>
                <input
                  type="range"
                  className={styles.slider}
                  min={1.2}
                  max={2.5}
                  step={0.1}
                  value={settings.lineHeight}
                  onChange={(e) =>
                    updateSetting("lineHeight", Number(e.target.value))
                  }
                />
                <div className={styles.sliderLabels}>
                  <span>Compactado</span>
                  <span>Espaciado</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ancho */}
        <div className={styles.dropdown}>
          <button
            className={activeMenu === "width" ? styles.active : ""}
            onClick={() => toggleMenu("width")}
            aria-expanded={activeMenu === "width"}
          >
            <MoveHorizontal size={16} />
            <span>Ancho</span>
          </button>

          {activeMenu === "width" && (
            <div className={styles.menu}>
              <div className={styles.menuHeader}>
                <span>Ancho del texto</span>
                <button onClick={closeMenu} className={styles.closeBtn} aria-label="Cerrar">
                  <X size={16} />
                </button>
              </div>
              <div className={styles.menuContent}>
                <div className={styles.sliderValue}>{settings.textWidth}%</div>
                <input
                  type="range"
                  className={styles.slider}
                  min={50}
                  max={100}
                  step={5}
                  value={settings.textWidth}
                  onChange={(e) =>
                    updateSetting("textWidth", Number(e.target.value))
                  }
                />
                <div className={styles.sliderLabels}>
                  <span>Estrecho</span>
                  <span>Completo</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay para cerrar */}
      {activeMenu && <div className={styles.overlay} onClick={closeMenu} />}
    </div>
  );
};
