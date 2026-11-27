export interface ClipboardStroke {
  code: string
  ctrlKey: boolean
  altKey: boolean
}

/** Ctrl+V pega siempre; Ctrl+C copia solo si hay texto seleccionado. */
export function isClipboardStroke(stroke: ClipboardStroke, hasSelection: boolean): boolean {
  // AltGr llega como Ctrl+Alt y debe seguir escribiendo caracteres
  if (!stroke.ctrlKey || stroke.altKey) return false
  if (stroke.code === 'KeyV') return true
  return stroke.code === 'KeyC' && hasSelection
}
