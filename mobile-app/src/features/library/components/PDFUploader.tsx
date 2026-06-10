import { useState, useCallback } from "react"
import { View, Text, Pressable, StyleSheet, Alert } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import { Modal, Spinner } from "@/components/common"
import { useBookStore } from "@/shared/store/bookStore"
import { File, Paths } from "expo-file-system"
import { extractPdfText } from "@/utils/pdf"

// Pure JS UUID v4 — no crypto nativo (Hermes)
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

type UploadStatus = "idle" | "selected" | "uploading" | "success" | "error"

interface SelectedFile {
  uri: string
  name: string
  size: number
  mimeType?: string
}

interface PDFUploaderProps {
  visible: boolean
  onClose: () => void
  onUploadComplete?: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isValidPDF(file: SelectedFile): boolean {
  return file.name.toLowerCase().endsWith(".pdf")
}

export function PDFUploader({ visible, onClose, onUploadComplete }: PDFUploaderProps) {
  const addBook = useBookStore((s) => s.addBook)
  const loadBooks = useBookStore((s) => s.loadBooks)

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const reset = useCallback(() => {
    setSelectedFile(null)
    setStatus("idle")
    setProgress(0)
    setErrorMessage(null)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      const asset = result.assets[0]
      if (!asset) return

      const file: SelectedFile = {
        uri: asset.uri,
        name: asset.name,
        size: asset.size ?? 0,
        mimeType: asset.mimeType,
      }

      if (!isValidPDF(file)) {
        Alert.alert("Archivo no válido", "Por favor selecciona un archivo PDF válido.")
        return
      }

      setSelectedFile(file)
      setStatus("selected")
      setErrorMessage(null)
    } catch (error) {
      console.error("Error picking file:", error)
      Alert.alert("Error", "No se pudo seleccionar el archivo.")
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return
    setStatus("uploading")
    setProgress(10)
    setErrorMessage(null)

    try {
      setProgress(30)
      const bookId = generateUUID()
      const docsDir = Paths.document
      const destFile = new File(docsDir, `${bookId}.pdf`)
      const sourceFile = new File(selectedFile.uri)
      await sourceFile.copy(destFile)
      setProgress(40)

      setProgress(45)
      const extractedText = await extractPdfText(destFile.uri)
      setProgress(50)

      const now = Date.now()
      const book = {
        id: bookId,
        name: selectedFile.name.replace(".pdf", ""),
        text: extractedText,
        createdAt: now,
        lastReadAt: now,
        readingTimeSeconds: 0,
        scrollPosition: 0,
        totalPages: undefined,
        fileUri: destFile.uri,
        isSynced: false,
      }

      await addBook(book)
      setProgress(80)
      await loadBooks()
      setProgress(100)
      setStatus("success")

      setTimeout(() => {
        reset()
        onUploadComplete?.()
        onClose()
      }, 1500)
    } catch (error) {
      console.error("Error saving book locally:", error)
      setStatus("error")
      setErrorMessage("No se pudo guardar el libro. Verifica el espacio e intenta de nuevo.")
    }
  }, [selectedFile, addBook, loadBooks, reset, onUploadComplete, onClose])

  return (
    <Modal visible={visible} title="Subir libro" onClose={handleClose}>
      <View style={styles.body}>
        {status === "idle" && (
          <Pressable onPress={handlePickFile} style={styles.dropzone}>
            <View style={styles.dropzoneIcon}>
              <Upload size={32} color={THEME.colors.secondaryColor} />
            </View>
            <Text style={styles.dropzoneTitle}>Selecciona un archivo PDF</Text>
            <Text style={styles.dropzoneHint}>Presiona para elegir un archivo de tu dispositivo</Text>
          </Pressable>
        )}

        {(status === "selected" || status === "uploading") && selectedFile && (
          <View style={styles.fileInfo}>
            <View style={styles.fileIconRow}>
              <View style={styles.fileIcon}>
                <FileText size={24} color={THEME.colors.secondaryColor} />
              </View>
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
              </View>
              <Pressable onPress={handlePickFile} style={styles.changeButton} disabled={status === "uploading"}>
                <Text style={styles.changeButtonText}>Cambiar</Text>
              </Pressable>
            </View>

            {status === "uploading" && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
                </View>
                <Text style={styles.progressText}>Subiendo... {progress}%</Text>
              </View>
            )}
          </View>
        )}

        {status === "success" && (
          <View style={styles.statusContainer}>
            <CheckCircle size={40} color="#22c55e" />
            <Text style={styles.statusTitle}>Libro añadido</Text>
            <Text style={styles.statusSubtitle}>El libro se ha añadido a tu biblioteca</Text>
          </View>
        )}

        {status === "error" && (
          <View style={styles.statusContainer}>
            <AlertCircle size={40} color="#ef4444" />
            <Text style={styles.statusTitle}>Error al subir</Text>
            <Text style={styles.statusSubtitle}>{errorMessage || "Ocurrió un error al procesar el archivo."}</Text>
            <Pressable onPress={handlePickFile} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
            </Pressable>
          </View>
        )}

        {status === "selected" && (
          <View style={styles.actions}>
            <Pressable onPress={handleClose} style={({ pressed }) => [styles.cancelButton, pressed && styles.buttonPressed]}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleUpload} style={({ pressed }) => [styles.uploadButton, pressed && styles.buttonPressed]}>
              {status === "uploading" ? (
                <Spinner size="small" color="#fff" />
              ) : (
                <>
                  <Upload size={16} color="#fff" />
                  <Text style={styles.uploadButtonText}>Subir</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  body: { gap: 16, height: 400 },
  dropzone: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.colors.borderColor,
    borderStyle: "dashed",
    backgroundColor: THEME.colors.fourColor,
    gap: 12,
  },
  dropzoneIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  dropzoneTitle: {
    fontSize: 16, fontWeight: "600",
    color: THEME.colors.fontColorTitle, textAlign: "center",
  },
  dropzoneHint: {
    fontSize: 13, color: THEME.colors.fontColorText, textAlign: "center",
  },
  fileInfo: { gap: 12 },
  fileIconRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: THEME.colors.fourColor, borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: THEME.colors.borderColor,
  },
  fileIcon: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  fileDetails: { flex: 1, gap: 2 },
  fileName: { fontSize: 14, fontWeight: "600", color: THEME.colors.fontColorTitle },
  fileSize: { fontSize: 12, color: THEME.colors.fontColorText },
  changeButton: {
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6,
    backgroundColor: THEME.colors.thirdColor,
  },
  changeButtonText: { fontSize: 12, fontWeight: "600", color: THEME.colors.secondaryColor },
  progressContainer: { gap: 6 },
  progressBar: {
    height: 6, backgroundColor: THEME.colors.thirdColor,
    borderRadius: 3, overflow: "hidden",
  },
  progressFill: {
    height: "100%", backgroundColor: THEME.colors.secondaryColor, borderRadius: 3,
  },
  progressText: { fontSize: 12, color: THEME.colors.fontColorText, textAlign: "center" },
  statusContainer: { alignItems: "center", paddingVertical: 16, gap: 8 },
  statusTitle: { fontSize: 16, fontWeight: "600", color: THEME.colors.fontColorTitle },
  statusSubtitle: {
    fontSize: 13, color: THEME.colors.fontColorText,
    textAlign: "center", lineHeight: 18,
  },
  retryButton: {
    marginTop: 8, paddingVertical: 8, paddingHorizontal: 20,
    borderRadius: 8, backgroundColor: THEME.colors.thirdColor,
  },
  retryButtonText: { fontSize: 14, fontWeight: "600", color: THEME.colors.secondaryColor },
  actions: { flexDirection: "row", gap: 10 },
  cancelButton: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: THEME.colors.thirdColor, alignItems: "center",
  },
  cancelButtonText: { fontSize: 15, fontWeight: "600", color: THEME.colors.fontColorTitle },
  uploadButton: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6, paddingVertical: 12,
    borderRadius: 10, backgroundColor: THEME.colors.secondaryColor,
  },
  uploadButtonText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  buttonPressed: { opacity: 0.8 },
})
