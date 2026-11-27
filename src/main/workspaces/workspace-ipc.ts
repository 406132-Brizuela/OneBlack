import { BrowserWindow, dialog, type IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { RegisterOutcome } from '../../shared/workspace'
import type { RendererSource } from '../security/renderer-source'
import { handleTrusted } from '../security/trusted-handler'
import { UserFacingError } from '../user-facing-error'
import type { WorkspaceService } from './workspace-service'

async function pickFolder(event: IpcMainInvokeEvent): Promise<string | null> {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window) throw new Error('The sender has no window')
  const selection = await dialog.showOpenDialog(window, {
    title: 'Register workspace',
    buttonLabel: 'Register',
    properties: ['openDirectory']
  })
  return selection.canceled ? null : (selection.filePaths[0] ?? null)
}

// La ruta sale siempre del diálogo nativo: el renderer no puede registrar rutas arbitrarias
async function registerFromDialog(
  event: IpcMainInvokeEvent,
  service: WorkspaceService
): Promise<RegisterOutcome> {
  const folderPath = await pickFolder(event)
  return folderPath ? service.register(folderPath) : { status: 'cancelled' }
}

function requireWorkspaceId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new UserFacingError('Invalid workspace identifier.')
  }
  return value
}

export function registerWorkspaceHandlers(service: WorkspaceService, source: RendererSource): void {
  handleTrusted(IPC_CHANNELS.listWorkspaces, source, () => service.list())
  handleTrusted(IPC_CHANNELS.registerWorkspace, source, (event) =>
    registerFromDialog(event, service)
  )
  handleTrusted(IPC_CHANNELS.openWorkspace, source, async (_event, workspaceId) => {
    await service.open(requireWorkspaceId(workspaceId))
    return null
  })
}
