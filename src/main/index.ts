import { join } from 'node:path'
import { app, BrowserWindow, Menu, nativeTheme } from 'electron'
import { readGitStatus } from './git/git-status-reader'
import { registerAppScheme, serveRendererFiles } from './security/app-protocol'
import { hardenSession, hardenWebContents } from './security/hardening'
import { resolveRendererSource, type RendererSource } from './security/renderer-source'
import { TabSessionRepository } from './tabs/tab-session-repository'
import { createMainWindow } from './window'
import { registerWorkspaceHandlers } from './workspaces/workspace-ipc'
import { WorkspaceRepository } from './workspaces/workspace-repository'
import { WorkspaceService } from './workspaces/workspace-service'

const WORKSPACES_FILE = 'workspaces.json'
const TABS_FILE = 'tabs.json'
// %APPDATA%\OneBlack pertenece a la versión anterior en C#: no se comparte la carpeta
const USER_DATA_FOLDER = 'OneBlack Desktop'

// El switch `--user-data-dir` (pruebas, perfiles alternativos) tiene prioridad
function useOwnDataFolder(): void {
  if (app.commandLine.hasSwitch('user-data-dir')) return
  app.setPath('userData', join(app.getPath('appData'), USER_DATA_FOLDER))
}

function createWorkspaceService(): WorkspaceService {
  const userData = app.getPath('userData')
  return new WorkspaceService(
    new WorkspaceRepository(join(userData, WORKSPACES_FILE)),
    new TabSessionRepository(join(userData, TABS_FILE)),
    readGitStatus
  )
}

function focusExistingWindow(): void {
  const [window] = BrowserWindow.getAllWindows()
  if (!window) return
  if (window.isMinimized()) window.restore()
  window.focus()
}

async function startApp(source: RendererSource): Promise<void> {
  await app.whenReady()
  nativeTheme.themeSource = 'dark'
  // El menú por defecto (recargar, devtools) solo queda disponible en desarrollo
  if (!source.isDevServer) Menu.setApplicationMenu(null)
  hardenSession()
  serveRendererFiles(join(__dirname, '../renderer'))
  registerWorkspaceHandlers(createWorkspaceService(), source)
  createMainWindow(source)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow(source)
  })
}

function bootstrap(): void {
  // Va primero: el bloqueo de instancia única depende de la carpeta de datos
  useOwnDataFolder()
  // Una sola instancia evita escrituras concurrentes sobre el JSON
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }
  const devServerUrl = app.isPackaged ? undefined : process.env['ELECTRON_RENDERER_URL']
  const source = resolveRendererSource(devServerUrl)

  app.enableSandbox()
  registerAppScheme()
  hardenWebContents(source)
  app.on('second-instance', focusExistingWindow)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  startApp(source).catch((error: unknown) => {
    console.error('OneBlack failed to start', error)
    app.exit(1)
  })
}

bootstrap()
