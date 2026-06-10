/**
 * CloudSyncToggle — Toggle switch for enabling/disabling cloud sync.
 *
 * Ported from web-app/src/components/common/CloudSyncToggle.tsx
 *
 * - Shows a Switch with Cloud/CloudOff icon
 * - Connected to userPreferencesStore.cloudSyncEnabled
 * - When toggled ON: triggers initial sync (syncBooks)
 * - When toggled OFF: just updates the preference (doesn't delete cloud data)
 */

import { View, Text, Switch, StyleSheet } from "react-native"
import { Cloud, CloudOff } from "lucide-react-native"
import { useUserPreferences } from "@/shared/store/userPreferencesStore"
import { useBookStore } from "@/shared/store/bookStore"
import { THEME } from "@/shared/lib/theme"

export function CloudSyncToggle() {
  const { cloudSyncEnabled, setCloudSyncEnabled } = useUserPreferences()
  const syncBooks = useBookStore((s) => s.syncBooks)

  const handleToggle = (enabled: boolean) => {
    setCloudSyncEnabled(enabled)

    if (enabled) {
      // Trigger initial sync when enabling cloud sync
      syncBooks().catch((err) => {
        console.error("Error durante la sincronización inicial:", err)
      })
    }
    // When disabled, just update the preference — don't delete cloud data
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {cloudSyncEnabled ? (
          <Cloud size={20} color={THEME.colors.secondaryColor} />
        ) : (
          <CloudOff size={20} color={THEME.colors.fontColorText} />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title}>Sincronización en la nube</Text>
        <Text style={styles.description}>
          {cloudSyncEnabled
            ? "Los libros se guardan automáticamente en la nube"
            : "Los libros se guardan solo en este dispositivo"}
        </Text>
      </View>

      <Switch
        value={cloudSyncEnabled}
        onValueChange={handleToggle}
        trackColor={{ false: THEME.colors.borderColor, true: THEME.colors.alternSecondaryColor }}
        thumbColor={cloudSyncEnabled ? THEME.colors.secondaryColor : THEME.colors.fontColorText}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.cardColor,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.colors.fontColorTitle,
  },
  description: {
    fontSize: 12,
    color: THEME.colors.fontColorText,
    lineHeight: 16,
  },
})
