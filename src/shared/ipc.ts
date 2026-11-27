import type { RegisterOutcome, WorkspaceSummary } from './workspace'

export const IPC_CHANNELS = {
  listWorkspaces: 'workspaces:list',
  registerWorkspace: 'workspaces:register',
  openWorkspace: 'workspaces:open'
} as const

export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string }

/** Capacidades que el preload expone al renderer. Ninguna recibe rutas del sistema de archivos. */
export interface OneBlackApi {
  workspaces: {
    list: () => Promise<IpcResult<WorkspaceSummary[]>>
    register: () => Promise<IpcResult<RegisterOutcome>>
    open: (workspaceId: string) => Promise<IpcResult<null>>
  }
}
