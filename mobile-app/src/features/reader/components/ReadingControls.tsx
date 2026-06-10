import { useCallback } from "react"
import {
  View, Text, Pressable, StyleSheet, Modal, ScrollView, Platform,
} from "react-native"
import { Minus, Plus, Type, AlignJustify, MoveHorizontal, X } from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import type { ReadingSettings } from "@/shared/types/reading"

interface ReadingControlsProps {
  visible: boolean
  onClose: () => void
  settings: ReadingSettings
  onSettingsChange: (settings: ReadingSettings) => void
}

const FONT_OPTIONS = [
  { value: "sans" as const, label: "Sans-serif" },
  { value: "serif" as const, label: "Serif" },
  { value: "mono" as const, label: "Monospace" },
  { value: "dyslexic" as const, label: "OpenDyslexic" },
]

export function ReadingControls({ visible, onClose, settings, onSettingsChange }: ReadingControlsProps) {
  const updateSetting = useCallback(
    <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => {
      onSettingsChange({ ...settings, [key]: value })
    },
    [settings, onSettingsChange],
  )

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handleBar} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Personalizar lectura</Text>
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              onPress={onClose} hitSlop={8}
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
                  style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed, settings.fontSize <= 14 && styles.stepperDisabled]}
                  onPress={() => updateSetting("fontSize", Math.max(14, settings.fontSize - 2))}
                  disabled={settings.fontSize <= 14}
                >
                  <Minus size={16} color={settings.fontSize <= 14 ? THEME.colors.fontColorText : THEME.colors.fontColorTitle} />
                </Pressable>
                <Text style={styles.valueText}>{settings.fontSize}</Text>
                <Pressable
                  style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed, settings.fontSize >= 32 && styles.stepperDisabled]}
                  onPress={() => updateSetting("fontSize", Math.min(32, settings.fontSize + 2))}
                  disabled={settings.fontSize >= 32}
                >
                  <Plus size={16} color={settings.fontSize >= 32 ? THEME.colors.fontColorText : THEME.colors.fontColorTitle} />
                </Pressable>
                <View style={styles.trackContainer}>
                  <View style={[styles.trackFill, { width: `${((settings.fontSize - 14) / (32 - 14)) * 100}%` }]} />
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
                  const isActive = settings.fontFamily === font.value
                  return (
                    <Pressable
                      key={font.value}
                      style={({ pressed }) => [styles.fontOption, isActive && styles.fontOptionActive, pressed && !isActive && styles.fontOptionPressed]}
                      onPress={() => updateSetting("fontFamily", font.value)}
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
                  style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed, settings.lineHeight <= 1.2 && styles.stepperDisabled]}
                  onPress={() => updateSetting("lineHeight", Math.round(Math.max(1.2, settings.lineHeight - 0.1) * 10) / 10)}
                  disabled={settings.lineHeight <= 1.2}
                >
                  <Minus size={16} color={settings.lineHeight <= 1.2 ? THEME.colors.fontColorText : THEME.colors.fontColorTitle} />
                </Pressable>
                <Text style={styles.valueText}>{settings.lineHeight.toFixed(1)}</Text>
                <Pressable
                  style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed, settings.lineHeight >= 2.5 && styles.stepperDisabled]}
                  onPress={() => updateSetting("lineHeight", Math.round(Math.min(2.5, settings.lineHeight + 0.1) * 10) / 10)}
                  disabled={settings.lineHeight >= 2.5}
                >
                  <Plus size={16} color={settings.lineHeight >= 2.5 ? THEME.colors.fontColorText : THEME.colors.fontColorTitle} />
                </Pressable>
                <View style={styles.trackContainer}>
                  <View style={[styles.trackFill, { width: `${((settings.lineHeight - 1.2) / (2.5 - 1.2)) * 100}%` }]} />
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
                  style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed, settings.textWidth <= 50 && styles.stepperDisabled]}
                  onPress={() => updateSetting("textWidth", Math.max(50, settings.textWidth - 5))}
                  disabled={settings.textWidth <= 50}
                >
                  <Minus size={16} color={settings.textWidth <= 50 ? THEME.colors.fontColorText : THEME.colors.fontColorTitle} />
                </Pressable>
                <Text style={styles.valueText}>{settings.textWidth}%</Text>
                <Pressable
                  style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed, settings.textWidth >= 100 && styles.stepperDisabled]}
                  onPress={() => updateSetting("textWidth", Math.min(100, settings.textWidth + 5))}
                  disabled={settings.textWidth >= 100}
                >
                  <Plus size={16} color={settings.textWidth >= 100 ? THEME.colors.fontColorText : THEME.colors.fontColorTitle} />
                </Pressable>
                <View style={styles.trackContainer}>
                  <View style={[styles.trackFill, { width: `${((settings.textWidth - 50) / (100 - 50)) * 100}%` }]} />
                </View>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
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
