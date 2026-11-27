import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import type { RendererSource } from './security/renderer-source'

// Debe coincidir con --color-bg de theme.css para evitar un destello al abrir
const WINDOW_BACKGROUND = '#0a0a0f'

export function createMainWindow(source: RendererSource): BrowserWindow {
  const window = new BrowserWindow({
    title: 'OneBlack',
    width: 1200,
    height: 760,
    minWidth: 860,
    minHeight: 540,
    show: false,
    backgroundColor: WINDOW_BACKGROUND,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      // El corrector ortográfico descarga diccionarios por red
      spellcheck: false,
      devTools: !app.isPackaged
    }
  })
  window.once('ready-to-show', () => window.show())
  window.loadURL(source.url).catch((error: unknown) => {
    console.error('Could not load the renderer', error)
  })
  return window
}
