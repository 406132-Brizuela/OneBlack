import { IPC_CHANNELS } from '../../shared/ipc'
import type { RendererSource } from '../security/renderer-source'
import { handleTrusted } from '../security/trusted-handler'
import { requireWorkspaceId } from '../workspaces/workspace-id'
import { requireTerminalInput, requireTerminalSize } from './terminal-arguments'
import type { TerminalService } from './terminal-service'

export function registerTerminalHandlers(
  terminals: TerminalService,
  source: RendererSource
): void {
  handleTrusted(IPC_CHANNELS.openTerminal, source, (_event, id, size) =>
    terminals.open(requireWorkspaceId(id), requireTerminalSize(size))
  )
  handleTrusted(IPC_CHANNELS.writeTerminal, source, (_event, id, data) => {
    terminals.write(requireWorkspaceId(id), requireTerminalInput(data))
    return Promise.resolve(null)
  })
  handleTrusted(IPC_CHANNELS.resizeTerminal, source, (_event, id, size) => {
    terminals.resize(requireWorkspaceId(id), requireTerminalSize(size))
    return Promise.resolve(null)
  })
  handleTrusted(IPC_CHANNELS.restartTerminal, source, (_event, id) => {
    terminals.close(requireWorkspaceId(id))
    return Promise.resolve(null)
  })
}
