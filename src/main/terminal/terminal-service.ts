import type {
  TerminalData,
  TerminalExit,
  TerminalSize,
  TerminalSnapshot
} from '../../shared/terminal'
import { UserFacingError } from '../user-facing-error'
import type { PtySpawner } from './pty'
import { TerminalSession } from './terminal-session'

export interface TerminalEvents {
  data: (event: TerminalData) => void
  exit: (event: TerminalExit) => void
}

/** Devuelve la carpeta de un workspace, o falla si no puede tener una terminal. */
export type FolderResolver = (workspaceId: string) => Promise<string>

export class TerminalService {
  private readonly sessions = new Map<string, TerminalSession>()
  private readonly starting = new Map<string, Promise<TerminalSession>>()

  constructor(
    private readonly spawn: PtySpawner,
    private readonly resolveFolder: FolderResolver,
    private readonly events: TerminalEvents
  ) {}

  async open(workspaceId: string, size: TerminalSize): Promise<TerminalSnapshot> {
    const existing = this.sessions.get(workspaceId)
    if (existing) {
      existing.resize(size)
      return existing.snapshot()
    }
    return (await this.startOnce(workspaceId, size)).snapshot()
  }

  /** Verdadero mientras haya un proceso vivo, o uno a punto de arrancar. */
  isRunning(workspaceId: string): boolean {
    if (this.starting.has(workspaceId)) return true
    return this.sessions.get(workspaceId)?.snapshot().exitCode === null
  }

  write(workspaceId: string, data: string): void {
    this.sessions.get(workspaceId)?.write(data)
  }

  resize(workspaceId: string, size: TerminalSize): void {
    this.sessions.get(workspaceId)?.resize(size)
  }

  close(workspaceId: string): void {
    // Quitar el arranque pendiente evita que nazca un proceso sin pestaña
    this.starting.delete(workspaceId)
    this.sessions.get(workspaceId)?.dispose()
    this.sessions.delete(workspaceId)
  }

  closeAll(): void {
    const ids = new Set([...this.sessions.keys(), ...this.starting.keys()])
    ids.forEach((id) => this.close(id))
  }

  // Dos aperturas simultáneas comparten el mismo proceso
  private startOnce(workspaceId: string, size: TerminalSize): Promise<TerminalSession> {
    const pending = this.starting.get(workspaceId)
    if (pending) return pending
    const started: Promise<TerminalSession> = this.resolveFolder(workspaceId)
      .then((folder) => {
        if (this.starting.get(workspaceId) !== started) {
          throw new UserFacingError('The terminal was closed while starting.')
        }
        return this.start(workspaceId, folder, size)
      })
      .finally(() => {
        if (this.starting.get(workspaceId) === started) this.starting.delete(workspaceId)
      })
    this.starting.set(workspaceId, started)
    return started
  }

  private start(workspaceId: string, folder: string, size: TerminalSize): TerminalSession {
    const session = new TerminalSession(this.spawn(folder, size), {
      data: (data, sequence) => this.events.data({ workspaceId, data, sequence }),
      exit: (exitCode) => this.events.exit({ workspaceId, exitCode })
    })
    this.sessions.set(workspaceId, session)
    return session
  }
}
