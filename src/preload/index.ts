import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type OneBlackApi } from '../shared/ipc'

// Solo funciones concretas: nunca se expone ipcRenderer ni objetos de Node
const api: OneBlackApi = {
  workspaces: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.listWorkspaces),
    register: () => ipcRenderer.invoke(IPC_CHANNELS.registerWorkspace),
    open: (workspaceId) => ipcRenderer.invoke(IPC_CHANNELS.openWorkspace, workspaceId)
  }
}

contextBridge.exposeInMainWorld('oneblack', api)
