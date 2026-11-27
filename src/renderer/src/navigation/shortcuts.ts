import type { TabSession } from '../../../shared/workspace'

export const NUMBERED_SHORTCUTS = 9

export interface KeyStroke {
  key: string
  code: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
}

// Ctrl+Tab recorre las pestañas en orden y da la vuelta en los extremos
function cycleTab(tabs: TabSession, step: 1 | -1): string | null {
  const { openIds, activeId } = tabs
  if (openIds.length === 0) return null
  const current = activeId === null ? -1 : openIds.indexOf(activeId)
  // Desde la pantalla de inicio se entra por el primer o el último extremo
  if (current === -1) return openIds.at(step === 1 ? 0 : -1) ?? null
  return openIds[(current + step + openIds.length) % openIds.length] ?? null
}

// `code` ignora la distribución del teclado: la fila de números siempre es Digit1…9
function numberedTarget(code: string, sidebarIds: string[]): string | null {
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(code)?.[1]
  return digit ? (sidebarIds[Number(digit) - 1] ?? null) : null
}

/** Workspace al que lleva una combinación de teclas, o null si no es un atajo. */
export function resolveShortcut(
  stroke: KeyStroke,
  sidebarIds: string[],
  tabs: TabSession
): string | null {
  // AltGr llega como Ctrl+Alt: no debe disparar atajos
  if (!stroke.ctrlKey || stroke.altKey || stroke.metaKey) return null
  if (stroke.key === 'Tab') return cycleTab(tabs, stroke.shiftKey ? -1 : 1)
  return stroke.shiftKey ? null : numberedTarget(stroke.code, sidebarIds)
}
