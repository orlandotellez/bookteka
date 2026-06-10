import { useEffect, useState, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native"
import { useLocalSearchParams, Stack, useRouter } from "expo-router"
import { ArrowLeft } from "lucide-react-native"

import { useBookStore } from "@/shared/store/bookStore"
import { THEME } from "@/shared/lib/theme"
import { Reader } from "@/features/reader/components/Reader"
import { PDFViewer } from "@/features/reader/components/PDFViewer"
import type { Book } from "@/shared/types/book"
import { SafeAreaView } from "react-native-safe-area-context"

type LoadState = "loading" | "not_found" | "empty" | "pdf" | "ready"

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { getBookById, loadBooks, books } = useBookStore()

  const [book, setBook] = useState<Book | null>(null)
  const [loadState, setLoadState] = useState<LoadState>("loading")

  useEffect(() => {
    let cancelled = false

    async function loadBook() {
      if (!id) {
        setLoadState("not_found")
        return
      }

      try {
        if (books.length === 0) {
          await loadBooks()
        }

        const found = await getBookById(id)

        if (cancelled) return

        if (!found) {
          setLoadState("not_found")
          return
        }

        setBook(found)

        if (found.text && found.text.trim().length > 0) {
          setLoadState("ready")
        } else if (found.fileUri) {
          setLoadState("pdf")
        } else {
          setLoadState("empty")
        }
      } catch (error) {
        console.error("Error loading book for reader:", error)
        if (!cancelled) {
          setLoadState("not_found")
        }
      }
    }

    loadBook()

    return () => {
      cancelled = true
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoBack = useCallback(() => {
    router.back()
  }, [router])

  if (loadState === "loading") {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.headerButtonPressed,
            ]}
            onPress={handleGoBack}
            hitSlop={8}
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={THEME.colors.fontColorTitle} />
          </Pressable>
          <Text style={styles.headerTitle}>Cargando...</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={THEME.colors.secondaryColor} />
          <Text style={styles.loadingText}>Preparando libro...</Text>
        </View>
      </View>
    )
  }

  if (loadState === "not_found" || !book) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.headerButtonPressed,
            ]}
            onPress={handleGoBack}
            hitSlop={8}
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={THEME.colors.fontColorTitle} />
          </Pressable>
          <Text style={styles.headerTitle}>No encontrado</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>Libro no encontrado</Text>
          <Text style={styles.errorSubtitle}>
            No pudimos encontrar este libro en tu biblioteca.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={handleGoBack}
          >
            <Text style={styles.backButtonText}>Volver a Biblioteca</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  if (loadState === "empty") {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.headerButtonPressed,
            ]}
            onPress={handleGoBack}
            hitSlop={8}
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={THEME.colors.fontColorTitle} />
          </Pressable>
          <Text style={styles.headerTitle}>{book.name}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>Sin contenido</Text>
          <Text style={styles.errorSubtitle}>
            Este libro no tiene texto disponible.{"\n"}
            Intenta subir el archivo nuevamente.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={handleGoBack}
          >
            <Text style={styles.backButtonText}>Volver a Biblioteca</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  if (loadState === "pdf" && book?.fileUri) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centered}>
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.headerButtonPressed,
              ]}
              onPress={handleGoBack}
              hitSlop={8}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <ArrowLeft size={22} color={THEME.colors.fontColorTitle} />
            </Pressable>
            <Text style={styles.headerTitle}>{book.name}</Text>
            <View style={styles.headerRight} />
          </View>
          <PDFViewer fileUri={book.fileUri} />
        </View>
      </>
    )
  }

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Reader book={book} />
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.colors.primaryColor },
  centered: {
    flex: 1,
    backgroundColor: THEME.colors.primaryColor,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 10,
    backgroundColor: THEME.colors.primaryColor,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderColor,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonPressed: {
    backgroundColor: THEME.colors.thirdColor,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: THEME.colors.fontColorTitle,
    marginLeft: 8,
  },
  headerRight: {
    flex: 1,
  },

  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: THEME.colors.fontColorText,
    fontWeight: "500",
  },

  errorContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.colors.fontColorTitle,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 15,
    color: THEME.colors.fontColorText,
    textAlign: "center",
    lineHeight: 22,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: THEME.colors.secondaryColor,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
})
