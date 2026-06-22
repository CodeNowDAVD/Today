/** Errores de pdf.js/react-pdf al cancelar un render por cambio de ancho o desmontaje. */
export function isRenderCancelled(err: unknown): boolean {
  return err instanceof Error && /cancel/i.test(err.message);
}
