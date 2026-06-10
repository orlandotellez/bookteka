import { useState, useCallback } from "react"
import {
  View, Text, Pressable, StyleSheet, Modal,
  ScrollView, Platform,
} from "react-native"
import {
  Settings, RotateCcw, Minus, Plus, X,
  Type, AlignJustify, MoveHorizontal,
} from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import { useUserPreferences } from "@/shared/store/userPreferencesStore"
import type { ReadingSettings } from "@/shared/types/reading"

const FONT_OPTIONS = [
  { value: "sans" as const, label: "Sans-serif" },
  { value: "serif" as const, label: "Serif" },
  { value: "mono" as const, label: "Monospace" },
]

export function ReadingSettingsCard() {
  const { defaultReadingSettings, setDefaultReadingSettings, resetReadingSettings } = useUserPreferences()
  const [showEditor, setShowEditor] = useState(false)

  const handleChange = useCallback(
    <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => {
      setDefaultReadingSettings({ ...defaultReadingSettings, [key]: value })
    },
    [defaultReadingSettings, setDefaultReadingSettings],
  )

  const handleReset = useCallback(() => resetReadingSettings(), [resetReadingSettings])

  const { fontSize, fontFamily, lineHeight, textWidth } = defaultReadingSettings

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setShowEditor(true)}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Settings size={18} color={THEME.colors.fontColorTitle} />
            <Text style={styles.title}>Configuración de lectura</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
            onPress={(e) => { e.stopPropagation(); handleReset() }}
            hitSlop={8}
          >
            <RotateCcw size={14} color={THEME.colors.fontColorText} />
          </Pressable>
        </View>

        <View style={styles.previewGrid}>
          <View style={styles.previewItem}>
            <Text style={styles.previewLabel}>Fuente</Text>
            <Text style={styles.previewValue}>{fontSize}px</Text>
          </View>
          <View style={styles.previewItem}>
            <Text style={styles.previewLabel}>Tipo</Text>
            <Text style={styles.previewValue}>{fontFamily}</Text>
          </View>
          <View style={styles.previewItem}>
            <Text style={styles.previewLabel}>Interlineado</Text>
            <Text style={styles.previewValue}>{lineHeight.toFixed(1)}</Text>
          </View>
          <View style={styles.previewItem}>
            <Text style={styles.previewLabel}>Ancho</Text>
            <Text style={styles.previewValue}>{textWidth}%</Text>
          </View>
        </View>

        <Text style={styles.hint}>Toca para ajustar los valores</Text>
      </Pressable>

      <Modal visible={showEditor} animationType="slide" transparent onRequestClose={() => setShowEditor(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowEditor(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handleBar} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Personalizar lectura</Text>
              <Pressable
                style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
                onPress={() => setShowEditor(false)} hitSlop={8}
              >
                <X size={18} color={THEME.colors.fontColorTitle} />
              </Pressable>
            </View>

            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
              {/* Font Size */}
              <View style={styles.controlGroup}>
                <View style={styles.labelRow}>
                  <Type size={16} color={THEME.colors.fontColorTitle} />
                  <Text style={styles.controlLabel}>Tamaño de fuente</Text>
                </View>
                <View style={styles.incrementRow}>
                  <Pressable
                    style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed, fontSize <= 14 && styles.stepperDisabled]}
                    onPress={() => handleChange("fontSize", Math.max(14, fontSize - 2))}
                    disabled={fontSize <= 14}
                  >
                    <Minus size={16} color={fontSize <= 14 ? THEME.colors.fontColorText : THEME.colors.fontColorTitle} />
                  </Pressable>
                  <Text style={styles.valueText}>{fontSize}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed, fontSize >= 32 && styles.stepperDisabled]}
                    onPress={() => handleChange("fontSize", Math.min(32, fontSize + 2))}
                    disabled={fontSize >= 32}
                  >
                    <Plus size={16} color={fontSize >= 32 ? THEME.colors.fontColorText : THEME.colors.fontColorTitle} />
                  </Pressable>
                  <View style={styles.trackContainer}>
                    <View style={[styles.trackFill, { width: `${((fontSize - 14) / (32 - 14)) * 100}%` }]} />
                  </View>
                </View>
              </View>

              {/* Font Family */}
              <View style={styles.controlGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.controlLabel}>Tipo de letra</Text>
                </View>
                <View style={styles.fontOptions}>
                  {FONT_OPTIONS.map((font) => {
                    const isActive = fontFamily === font.value
                    return (
                      <Pressable
                        key={font.value}
                        style={({ pressed }) => [styles.fontOption, isActive && styles.fontOptionActive, pressed && !isActive && styles.fontOptionPressed]}
                        onPress={() => handleChange("fontFamily", font.value)}
                      >
                        <Text style={[styles.fontOptionLabel, isActive && styles.fontOptionLabelActive]} numberOfLines={1}>
                          {font.label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              {/* Line Height */}
              <View style={styles.controlGroup}>
                <View style={styles.labelRow}>
                  <AlignJustify size={16} color={THEME.colors.fontColorTitle} />
                  <Text style={styles.controlLabel}>Interlineado</Text>
                </View>
                <View style={styles.incrementRow}>
                  <Pressable
                    style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed, lineHeight <= 1.2 && styles.stepperDisabled]}
                    onPress={() => handleChange("lineHeight", Math.round(Math.max(1.2, lineHeight - 0.1) * 10) / 10)}
                    disabled={lineHeight <= 1.2}
                  >
                    <Minus size={16} color={lineHeight <= 1.2 ? THEME.colors.fontColorText : THEME.colors.fontColorTitle} />
                  </Pressable>
                  <Text style={styles.valueText}>{lineHeight.toFixed(1)}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed, lineHeight >= 2.5 && styles.stepperDisabled]}
                    onPress={() => handleChange("lineHeight", Math.round(Math.min(2.5, lineHeight + 0.1) * 10) / 10)}
                    disabled={lineHeight >= 2.5}
                  >
                    <Plus size={16} color={lineHeight >= 2.5 ? THEME.colors.fontColorText : THEME.colors.fontColorTitle} />
                  </Pressable>
                  <View style={styles.trackContainer}>
                    <View style={[styles.trackFill, { width: `${((lineHeight - 1.2) / (2.5 - 1.2)) * 100}%` }]} />
                  </View>
                </View>
              </View>

              {/* Text Width */}
              <View style={styles.controlGroup}>
                <View style={styles.labelRow}>
                  <MoveHorizontal size={16} color={THEME.colors.fontColorTitle} />
                  <Text style={styles.controlLabel}>Ancho del texto</Text>
                </View>
                <View style={styles.incrementRow}>
                  <Pressable
                    style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed, textWidth <= 50 && styles.stepperDisabled]}
                    onPress={() => handleChange("textWidth", Math.max(50, textWidth - 5))}
                    disabled={textWidth <= 50}
                  >
                    <Minus size={16} color={textWidth <= 50 ? THEME.colors.fontColorText : THEME.colors.fontColorTitle} />
                  </Pressable>
                  <Text style={styles.valueText}>{textWidth}%</Text>
                  <Pressable
                    style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed, textWidth >= 100 && styles.stepperDisabled]}
                    onPress={() => handleChange("textWidth", Math.min(100, textWidth + 5))}
                    disabled={textWidth >= 100}
                  >
                    <Plus size={16} color={textWidth >= 100 ? THEME.colors.fontColorText : THEME.colors.fontColorTitle} />
                  </Pressable>
                  <View style={styles.trackContainer}>
                    <View style={[styles.trackFill, { width: `${((textWidth - 50) / (100 - 50)) * 100}%` }]} />
                  </View>
                </View>
              </View>

              <Text style={styles.sheetHint}>Estos valores se aplicarán por defecto a todos los libros.</Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.cardColor, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: THEME.colors.borderColor, gap: 12,
  },
  cardPressed: { opacity: 0.85 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", color: THEME.colors.fontColorTitle },
  resetButton: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  resetButtonPressed: { opacity: 0.7 },
  previewGrid: { flexDirection: "row", gap: 8 },
  previewItem: {
    flex: 1, backgroundColor: THEME.colors.thirdColor,
    borderRadius: 8, padding: 10, alignItems: "center", gap: 2,
  },
  previewLabel: {
    fontSize: 11, fontWeight: "600", color: THEME.colors.fontColorText,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  previewValue: {
    fontSize: 15, fontWeight: "700", color: THEME.colors.fontColorTitle,
    fontVariant: ["tabular-nums"],
  },
  hint: { fontSize: 12, color: THEME.colors.fontColorText, textAlign: "center", opacity: 0.8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: THEME.colors.primaryColor,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 8, paddingBottom: Platform.OS === "ios" ? 34 : 24,
    maxHeight: "70%",
  },
  handleBar: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: THEME.colors.borderColor, alignSelf: "center", marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: THEME.colors.fontColorTitle },
  closeButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  closeButtonPressed: { opacity: 0.7 },
  scrollContent: { flex: 1 },
  scrollInner: { paddingHorizontal: 20, gap: 20 },
  sheetHint: {
    fontSize: 12, color: THEME.colors.fontColorText,
    textAlign: "center", opacity: 0.8, paddingBottom: 8,
  },
  controlGroup: { gap: 10 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  controlLabel: { fontSize: 14, fontWeight: "600", color: THEME.colors.fontColorText },
  incrementRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepper: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  stepperPressed: { opacity: 0.7, backgroundColor: THEME.colors.fourColor },
  stepperDisabled: { opacity: 0.4 },
  valueText: {
    fontSize: 16, fontWeight: "700", color: THEME.colors.fontColorTitle,
    fontVariant: ["tabular-nums"], minWidth: 36, textAlign: "center",
  },
  trackContainer: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: THEME.colors.thirdColor, overflow: "hidden",
  },
  trackFill: { height: "100%", borderRadius: 3, backgroundColor: THEME.colors.secondaryColor },
  fontOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fontOption: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: THEME.colors.thirdColor,
    borderWidth: 1.5, borderColor: "transparent",
  },
  fontOptionActive: {
    backgroundColor: THEME.colors.alternColor,
    borderColor: THEME.colors.secondaryColor,
  },
  fontOptionPressed: { opacity: 0.7 },
  fontOptionLabel: { fontSize: 13, fontWeight: "600", color: THEME.colors.fontColorText },
  fontOptionLabelActive: { color: THEME.colors.fontColorTitle },
})
