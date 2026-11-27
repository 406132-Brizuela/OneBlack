import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type OneBlackApi } from '../shared/ipc'

// Solo funciones concretas: nunca se expone ipcRenderer ni objetos de Node
const api: OneBlackApi = {
  workspaces: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.listWorkspaces),
    register: () => ipcRenderer.invoke(IPC_CHANNELS.registerWorkspace),
    open: (workspaceId) => ipcRenderer.invoke(IPC_CHANNELS.openWorkspace, workspaceId),
    close: (workspaceId) => ipcRenderer.invoke(IPC_CHANNELS.closeWorkspace, workspaceId),
    showHome: () => ipcRenderer.invoke(IPC_CHANNELS.showHome)
  }
}

contextBridge.exposeInMainWorld('oneblack', api)
