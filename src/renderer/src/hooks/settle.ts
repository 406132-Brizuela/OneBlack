import type { IpcResult } from '../../../shared/ipc'

// Un fallo del canal IPC se trata igual que un error devuelto por el proceso main
export async function settle<T>(request: Promise<IpcResult<T>>): Promise<IpcResult<T>> {
  try {
    return await request
  } catch {
    return { ok: false, error: 'Could not reach the main process.' }
  }
}
