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
      // Mantener la tecla apretada no debe encadenar aperturas
      if (!event.repeat) void open(target)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })
}
