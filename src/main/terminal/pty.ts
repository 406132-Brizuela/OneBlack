import { spawn } from 'node-pty'
import type { TerminalSize } from '../../shared/terminal'
import { buildShellEnvironment, resolveShell } from './shell'

/** Lo que el resto del main necesita de un pseudo-terminal; permite probar sin procesos. */
export interface Pty {
  onData: (listener: (data: string) => void) => unknown
  onExit: (listener: (event: { exitCode: number }) => void) => unknown
  write: (data: string) => void
  resize: (cols: number, rows: number) => void
  kill: () => void
}

export type PtySpawner = (cwd: string, size: TerminalSize) => Pty

export const spawnShell: PtySpawner = (cwd, size) => {
  const shell = resolveShell(process.platform, process.env)
  return spawn(shell.file, shell.args, {
    name: 'xterm-256color',
    cwd,
    cols: size.cols,
    rows: size.rows,
    env: buildShellEnvironment(process.env)
  })
}
