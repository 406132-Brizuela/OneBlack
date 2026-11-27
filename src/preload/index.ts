import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC_CHANNELS, type OneBlackApi, type Unsubscribe } from '../shared/ipc'

// El listener recibe solo los datos: el evento de Electron no cruza al renderer
function subscribe<T>(channel: string, listener: (payload: T) => void): Unsubscribe {
  const forward = (_event: IpcRendererEvent, payload: T): void => listener(payload)
  ipcRenderer.on(channel, forward)
  return () => {
    ipcRenderer.removeListener(channel, forward)
  }
}

// Solo funciones concretas: nunca se expone ipcRenderer ni objetos de Node
const api: OneBlackApi = {
  workspaces: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.listWorkspaces),
    register: () => ipcRenderer.invoke(IPC_CHANNELS.registerWorkspace),
    open: (workspaceId) => ipcRenderer.invoke(IPC_CHANNELS.openWorkspace, workspaceId),
    close: (workspaceId) => ipcRenderer.invoke(IPC_CHANNELS.closeWorkspace, workspaceId),
    showHome: () => ipcRenderer.invoke(IPC_CHANNELS.showHome)
  },
  terminal: {
    open: (workspaceId, size) =>
      ipcRenderer.invoke(IPC_CHANNELS.openTerminal, workspaceId, size),
    write: (workspaceId, data) =>
      ipcRenderer.invoke(IPC_CHANNELS.writeTerminal, workspaceId, data),
    resize: (workspaceId, size) =>
      ipcRenderer.invoke(IPC_CHANNELS.resizeTerminal, workspaceId, size),
    restart: (workspaceId) => ipcRenderer.invoke(IPC_CHANNELS.restartTerminal, workspaceId),
    onData: (listener) => subscribe(IPC_CHANNELS.terminalData, listener),
    onExit: (listener) => subscribe(IPC_CHANNELS.terminalExit, listener)
  }
}

contextBridge.exposeInMainWorld('oneblack', api)
