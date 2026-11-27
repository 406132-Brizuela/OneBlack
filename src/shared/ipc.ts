import type { RegisterOutcome, WorkspaceSnapshot } from './workspace'

export const IPC_CHANNELS = {
  listWorkspaces: 'workspaces:list',
  registerWorkspace: 'workspaces:register',
  openWorkspace: 'workspaces:open',
  closeWorkspace: 'workspaces:close',
  showHome: 'workspaces:show-home'
} as const

export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string }

/** Capacidades que el preload expone al renderer. Ninguna recibe rutas del sistema de archivos. */
export interface OneBlackApi {
  workspaces: {
    list: () => Promise<IpcResult<WorkspaceSnapshot>>
    register: () => Promise<IpcResult<RegisterOutcome>>
    /** Abre el workspace en una pestaña (si hace falta) y la activa */
    open: (workspaceId: string) => Promise<IpcResult<null>>
    /** Cierra la pestaña; el workspace sigue registrado */
    close: (workspaceId: string) => Promise<IpcResult<null>>
    showHome: () => Promise<IpcResult<null>>
  }
}
