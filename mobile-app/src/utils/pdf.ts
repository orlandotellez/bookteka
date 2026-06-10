/**
 * PDF text extraction utilities.
 *
 * Extrae texto del contenido crudo de un PDF usando File.text().
 * Funciona para PDFs con texto sin comprimir (la mayoría de PDFs
 * generados digitalmente). No funciona para PDFs escaneados o
 * con streams comprimidos (FlateDecode).
 */

import { File } from "expo-file-system"

/**
 * Intenta extraer texto legible del contenido crudo de un PDF.
 *
 * Estrategia:
 * 1. Busca bloques BT...ET (Begin Text / End Text) — el estándar PDF
 * 2. Extrae texto entre paréntesis dentro de operadores Tj/TJ
 * 3. Fallback: busca cualquier texto entre paréntesis que parezca
 *    lenguaje natural (con espacios, mayor a 3 caracteres)
 *
 * @param fileUri - URI del archivo PDF (file://)
 * @returns Texto extraído o string vacío si no se pudo extraer
 */
export async function extractPdfText(fileUri: string): Promise<string> {
  try {
    const file = new File(fileUri)
    const rawText = await file.text()

    if (!rawText || rawText.length < 50) return ""

    const lines: string[] = []

    // ── Estrategia 1: BT...ET blocks ─────────────────────────
    const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g
    let match: RegExpExecArray | null

    while ((match = btEtRegex.exec(rawText)) !== null) {
      const block = match[1]
      // Extraer texto entre paréntesis seguido de Tj o dentro de TJ arrays
      const textItems = block.match(/\(([^)]*)\)\s*Tj/g)
      if (textItems) {
        for (const item of textItems) {
          const text = item
            .replace(/^\(/, "")
            .replace(/\)\s*Tj$/, "")
            .replace(/\\(.)/g, "$1") // unescape \( → (, \) → ), etc.
            .replace(/\\n/g, " ")
            .trim()
          if (text && text.length > 1) {
            lines.push(text)
          }
        }
      }

      // También intentar con TJ arrays: [(text) num (text) num ...] TJ
      const tjArrayItems = block.match(/\[([^\]]*)\]\s*TJ/g)
      if (tjArrayItems) {
        for (const item of tjArrayItems) {
          const parenTexts = item.match(/\(([^)]*)\)/g)
          if (parenTexts) {
            const line = parenTexts
              .map((p) =>
                p
                  .slice(1, -1)
                  .replace(/\\(.)/g, "$1")
                  .replace(/\\n/g, " ")
                  .trim(),
              )
              .join("")
            if (line && line.length > 1) {
              lines.push(line)
            }
          }
        }
      }
    }

    // ── Estrategia 2: Fallback — texto suelto entre paréntesis ─
    if (lines.length === 0) {
      const parenRegex = /\(([^)]{4,})\)/g
      while ((match = parenRegex.exec(rawText)) !== null) {
        const text = match[1]
          .replace(/\\(.)/g, "$1")
          .replace(/\\n/g, " ")
          .trim()
        // Filtra: que tenga espacios (parece lenguaje natural)
        // y que no parezca una ruta de archivo o UUID
        if (
          text.length > 5 &&
          text.includes(" ") &&
          !text.includes("//") &&
          !/^[\dA-Fa-f-]{20,}$/.test(text)
        ) {
          lines.push(text)
        }
      }
    }

    // ── Deduplicar y unir ─────────────────────────────────────
    const unique = [...new Set(lines)]
    if (unique.length === 0) return ""

    // Unir en párrafos, limitar a líneas únicas
    const text = unique.join("\n\n")

    // Si el resultado es muy corto comparado con el archivo, no vale
    if (text.length < 20) return ""

    return text
  } catch (error) {
    console.warn("Error extracting PDF text:", error)
    return ""
  }
}
