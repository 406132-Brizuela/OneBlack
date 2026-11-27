import { useEffect } from 'react'
import type { TabSession } from '../../../shared/workspace'
import { resolveShortcut } from '../navigation/shortcuts'

export function useKeyboardShortcuts(
  sidebarIds: string[],
  tabs: TabSession,
  open: (workspaceId: string) => Promise<void>
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = resolveShortcut(event, sidebarIds, tabs)
      if (target === null) return
      event.preventDefault()
      // La terminal no debe recibir la combinación
      event.stopPropagation()
      // Mantener la tecla apretada no debe encadenar aperturas
      if (!event.repeat) void open(target)
    }
    // En fase de captura se atiende antes de que la terminal consuma la tecla
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  })
}
