/**
 * Text normalization utilities.
 * Ported from web-app/src/utils/text.ts
 */

export function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}
