import type { Terminal } from '@xterm/xterm'
import type { Unsubscribe } from '../../../shared/ipc'
import { settle } from '../hooks/settle'
import { createOutputStream } from './output-stream'

export interface TerminalCallbacks {
  onExit: (exitCode: number) => void
  onError: (message: string) => void
}

// Teclado y tamaño viajan del renderer al proceso
function forwardInput(workspaceId: string, terminal: Terminal): () => void {
  const api = window.oneblack.terminal
  const input = terminal.onData((data) => void api.write(workspaceId, data))
  const resize = terminal.onResize((size) => void api.resize(workspaceId, size))
  return () => {
    input.dispose()
    resize.dispose()
  }
}

/** Conecta una vista de xterm con la sesión del proceso main; devuelve cómo desconectarla. */
export function connectTerminal(
  workspaceId: string,
  terminal: Terminal,
  { onExit, onError }: TerminalCallbacks
): Unsubscribe {
  const api = window.oneblack.terminal
  const stream = createOutputStream((data) => terminal.write(data))
  let isConnected = true
  let stopInput: (() => void) | null = null

  const stopData = api.onData((event) => {
    if (event.workspaceId === workspaceId) stream.receive(event)
  })
  const stopExit = api.onExit((event) => {
    if (event.workspaceId === workspaceId) onExit(event.exitCode)
  })

  const attach = async (): Promise<void> => {
    const size = { cols: terminal.cols, rows: terminal.rows }
    const result = await settle(api.open(workspaceId, size))
    if (!isConnected) return
    if (!result.ok) return onError(result.error)
    stream.start(result.value)
    // La entrada se habilita tras el historial: reproducirlo no debe responderle al shell
    terminal.write('', () => {
      if (isConnected) stopInput = forwardInput(workspaceId, terminal)
    })
    if (result.value.exitCode !== null) onExit(result.value.exitCode)
  }
  void attach()

  return () => {
    isConnected = false
    stopData()
    stopExit()
    stopInput?.()
  }
}
