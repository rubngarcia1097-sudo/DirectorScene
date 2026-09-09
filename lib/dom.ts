/**
 * true si el usuario está escribiendo en un campo de texto.
 *
 * Los atajos de teclado globales (grabar con espacio, cancelar con Esc...)
 * deben ignorarse mientras se escribe el nombre de un preset o el correo de
 * la cuenta; si no, una "e" en "director" cortaría la grabación sin avisar.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}
