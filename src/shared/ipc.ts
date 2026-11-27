import type { TerminalData, TerminalExit, TerminalSize, TerminalSnapshot } from './terminal'
import type { RegisterOutcome, WorkspaceSnapshot } from './workspace'

export const IPC_CHANNELS = {
  listWorkspaces: 'workspaces:list',
  registerWorkspace: 'workspaces:register',
  openWorkspace: 'workspaces:open',
  closeWorkspace: 'workspaces:close',
  showHome: 'workspaces:show-home',
  openTerminal: 'terminal:open',
  writeTerminal: 'terminal:write',
  resizeTerminal: 'terminal:resize',
  restartTerminal: 'terminal:restart',
  terminalData: 'terminal:data',
  terminalExit: 'terminal:exit'
} as const

export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string }

export type Unsubscribe = () => void

/** Capacidades que el preload expone al renderer. Ninguna recibe rutas del sistema de archivos. */
export interface OneBlackApi {
  workspaces: {
    list: () => Promise<IpcResult<WorkspaceSnapshot>>
    register: () => Promise<IpcResult<RegisterOutcome>>
    /** Abre el workspace en una pestaña (si hace falta) y la activa */
    open: (workspaceId: string) => Promise<IpcResult<null>>
    /**
     * Cierra la pestaña y termina su terminal; si sigue abierta, el usuario debe confirmar.
     * El workspace sigue registrado.
     */
    close: (workspaceId: string) => Promise<IpcResult<null>>
    showHome: () => Promise<IpcResult<null>>
  }
  /** Una terminal por pestaña abierta. El shell y la carpeta los decide el proceso main. */
  terminal: {
    /** Inicia la terminal o se reconecta a la que ya existe */
    open: (workspaceId: string, size: TerminalSize) => Promise<IpcResult<TerminalSnapshot>>
    write: (workspaceId: string, data: string) => Promise<IpcResult<null>>
    resize: (workspaceId: string, size: TerminalSize) => Promise<IpcResult<null>>
    /** Descarta la sesión actual; el próximo `open` inicia una nueva */
    restart: (workspaceId: string) => Promise<IpcResult<null>>
    onData: (listener: (event: TerminalData) => void) => Unsubscribe
    onExit: (listener: (event: TerminalExit) => void) => Unsubscribe
  }
}
