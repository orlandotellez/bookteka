import { useMemo } from "react"
import { View, StyleSheet, Platform, Text, ActivityIndicator } from "react-native"
import { WebView } from "react-native-webview"
import { THEME } from "@/shared/lib/theme"

interface PDFViewerProps {
  fileUri: string
  onLoadEnd?: () => void
}

export function PDFViewer({ fileUri, onLoadEnd }: PDFViewerProps) {
  const source = useMemo(() => {
    if (Platform.OS === "android") {
      return { uri: fileUri, headers: { "Content-Type": "application/pdf" } }
    }
    return { uri: fileUri }
  }, [fileUri])

  return (
    <WebView
      source={source}
      style={styles.webview}
      allowFileAccess={true}
      allowFileAccessFromFileURLs={true}
      allowUniversalAccessFromFileURLs={true}
      javaScriptEnabled={true}
      startInLoadingState={true}
      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={THEME.colors.secondaryColor} />
          <Text style={styles.loadingText}>Cargando PDF...</Text>
        </View>
      )}
      onLoadEnd={onLoadEnd}
      allowsInlineMediaPlayback={true}
      mixedContentMode="always"
    />
  )
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: THEME.colors.primaryColor },
  loading: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center", alignItems: "center",
    backgroundColor: THEME.colors.primaryColor, gap: 12,
  },
  loadingText: { fontSize: 15, color: THEME.colors.fontColorText, fontWeight: "500" },
})
