import type { TerminalSize, TerminalSnapshot } from '../../shared/terminal'
import type { Pty } from './pty'

export const HISTORY_LIMIT = 200_000

export interface TerminalSessionListener {
  data: (data: string, sequence: number) => void
  exit: (exitCode: number) => void
}

/** Un proceso de shell y la salida reciente que produjo. */
export class TerminalSession {
  private history = ''
  private sequence = 0
  private exitCode: number | null = null
  private isDisposed = false

  constructor(
    private readonly pty: Pty,
    listener: TerminalSessionListener
  ) {
    pty.onData((data) => {
      if (this.isDisposed) return
      this.history = (this.history + data).slice(-HISTORY_LIMIT)
      listener.data(data, ++this.sequence)
    })
    pty.onExit(({ exitCode }) => {
      if (this.isDisposed) return
      this.exitCode = exitCode
      listener.exit(exitCode)
    })
  }

  snapshot(): TerminalSnapshot {
    return { history: this.history, sequence: this.sequence, exitCode: this.exitCode }
  }

  write(data: string): void {
    if (this.exitCode === null) this.pty.write(data)
  }

  resize({ cols, rows }: TerminalSize): void {
    if (this.exitCode === null) this.pty.resize(cols, rows)
  }

  /** Termina el proceso; a partir de acá no se emiten más eventos. */
  dispose(): void {
    if (this.isDisposed) return
    this.isDisposed = true
    if (this.exitCode === null) this.pty.kill()
  }
}
