import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { IpcResult } from '../../shared/ipc'
import { UserFacingError } from '../user-facing-error'
import type { RendererSource } from './renderer-source'

const GENERIC_ERROR = 'Unexpected error. Check the application logs.'

function isTrustedSender(event: IpcMainInvokeEvent, source: RendererSource): boolean {
  const frame = event.senderFrame
  if (!frame || frame !== event.sender.mainFrame) return false
  return source.isTrustedUrl(frame.url)
}

// Los errores internos no cruzan al renderer: podrían filtrar rutas o detalles del sistema
function toFailure(channel: string, error: unknown): IpcResult<never> {
  if (error instanceof UserFacingError) return { ok: false, error: error.message }
  console.error(`IPC handler "${channel}" failed`, error)
  return { ok: false, error: GENERIC_ERROR }
}

/** Registra un handler IPC que solo responde al frame principal de la propia app. */
export function handleTrusted<T>(
  channel: string,
  source: RendererSource,
  handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<T>
): void {
  ipcMain.handle(channel, async (event, ...args: unknown[]): Promise<IpcResult<T>> => {
    if (!isTrustedSender(event, source)) throw new Error('Untrusted IPC sender')
    try {
      return { ok: true, value: await handler(event, ...args) }
    } catch (error) {
      return toFailure(channel, error)
    }
  })
}
