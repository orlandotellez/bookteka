import {
  Modal as RNModal,
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { X } from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import type { ReactNode } from "react"

interface ModalAction {
  label: string
  onPress: () => void
  variant?: "primary" | "danger" | "cancel"
}

interface ModalProps {
  visible: boolean
  title: string
  children: ReactNode
  onClose: () => void
  actions?: ModalAction[]
}

export function Modal({
  visible,
  title,
  children,
  onClose,
  actions,
}: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={styles.content}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={20} color={THEME.colors.fontColorTitle} />
              </Pressable>
            </View>

            {/* Body */}
            <View style={styles.body}>{children}</View>

            {/* Actions */}
            {actions && actions.length > 0 && (
              <View style={styles.footer}>
                {actions.map((action, index) => (
                  <Pressable
                    key={index}
                    onPress={action.onPress}
                    style={[
                      styles.actionButton,
                      action.variant === "danger" && styles.actionDanger,
                      action.variant === "cancel" && styles.actionCancel,
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        action.variant === "danger" && styles.actionTextDanger,
                        action.variant === "cancel" && styles.actionTextCancel,
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    backgroundColor: THEME.colors.primaryColor,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.colors.fontColorTitle,
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: THEME.colors.secondaryColor,
    alignItems: "center",
  },
  actionDanger: {
    backgroundColor: "#dc3545",
  },
  actionCancel: {
    backgroundColor: THEME.colors.thirdColor,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  actionTextDanger: {
    color: "#fff",
  },
  actionTextCancel: {
    color: THEME.colors.fontColorTitle,
  },
})
