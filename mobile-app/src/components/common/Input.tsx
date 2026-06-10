import { View, Text, TextInput, StyleSheet } from "react-native"
import { THEME } from "@/shared/lib/theme"
import type { LucideIcon } from "lucide-react-native"

interface InputProps {
  label?: string
  value: string
  onChangeText: (text: string) => void
  error?: string
  placeholder?: string
  secureTextEntry?: boolean
  icon?: LucideIcon
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad"
  multiline?: boolean
  autoCapitalize?: "none" | "sentences" | "words" | "characters"
}

export function Input({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secureTextEntry,
  icon: Icon,
  keyboardType = "default",
  multiline = false,
  autoCapitalize,
}: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && { borderColor: "#dc3545" }]}>
        {Icon && (
          <View style={styles.iconContainer}>
            <Icon size={18} color={THEME.colors.fontColorText} />
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            Icon ? styles.inputWithIcon : null,
            multiline ? styles.multiline : null,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={THEME.colors.fontColorText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          autoCapitalize={autoCapitalize}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.colors.fontColorTitle,
  },
  inputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.fourColor,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
  },
  iconContainer: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: THEME.colors.fontColorTitle,
  },
  inputWithIcon: {
    paddingLeft: 10,
  },
  multiline: {
    minHeight: 100,
    paddingTop: 14,
  },
  error: {
    fontSize: 13,
    color: "#dc3545",
  },
})
