/**
 * Contrato de respuesta de marcadores.
 *
 * Refleja las columnas reales de la tabla `bookmark` (`prisma/schema.prisma`).
 * Los services devuelven el modelo de Prisma sin transformar, así que este
 * DTO documenta el contrato en vez de envolverlo.
 */

/** DTO de un marcador individual. */
export interface BookmarkResponseDTO {
  id: string;
  userId: string;
  userBookId: string;
  /**
   * La columna es nullable en la base, pero `CreateBookmarkBodySchema` exige
   * `min(1)`: toda fila creada a través de la API tiene nombre. Solo las filas
   * anteriores a ese schema podrían tener `null`.
   */
  name: string | null;
  pageNumber: number;
  textPreview: string | null;
  createdAt: Date;
}
