export interface TabCloser {
  hasRunningTerminal: (workspaceId: string) => boolean
  confirm: (workspaceId: string) => Promise<boolean>
  closeTab: (workspaceId: string) => Promise<void>
  closeTerminal: (workspaceId: string) => void
}

/** Cierra una pestaña y su terminal; si hay un proceso vivo, pide confirmación antes. */
export async function closeTabSafely(workspaceId: string, closer: TabCloser): Promise<void> {
  if (closer.hasRunningTerminal(workspaceId) && !(await closer.confirm(workspaceId))) return
  await closer.closeTab(workspaceId)
  closer.closeTerminal(workspaceId)
}
