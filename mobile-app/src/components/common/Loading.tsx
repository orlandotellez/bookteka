import { View, Text, StyleSheet } from "react-native"
import { Spinner } from "./Spinner"
import { THEME } from "@/shared/lib/theme"

interface LoadingProps {
  text: string
  subtext?: string
}

export function Loading({ text, subtext }: LoadingProps) {
  return (
    <View style={styles.container}>
      <Spinner size="large" />
      <View style={styles.content}>
        <Text style={styles.text}>{text}</Text>
        {subtext && <Text style={styles.subtext}>{subtext}</Text>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.colors.primaryColor,
    gap: 16,
  },
  content: {
    alignItems: "center",
    gap: 4,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.fontColorTitle,
  },
  subtext: {
    fontSize: 14,
    color: THEME.colors.fontColorText,
  },
})
