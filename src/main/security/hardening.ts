import { app, session, type WebContents } from 'electron'
import type { RendererSource } from './renderer-source'

/** La app no necesita ningún permiso web (cámara, notificaciones, etc.): se niegan todos. */
export function hardenSession(): void {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false)
  })
  session.defaultSession.setPermissionCheckHandler(() => false)
  session.defaultSession.setDevicePermissionHandler(() => false)
}

function restrictNavigation(contents: WebContents, source: RendererSource): void {
  const blockUntrusted = (event: { preventDefault: () => void }, url: string): void => {
    if (!source.isTrustedUrl(url)) event.preventDefault()
  }
  contents.on('will-navigate', (event) => blockUntrusted(event, event.url))
  contents.on('will-redirect', (event) => blockUntrusted(event, event.url))
  contents.on('will-attach-webview', (event) => event.preventDefault())
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
}

export function hardenWebContents(source: RendererSource): void {
  app.on('web-contents-created', (_event, contents) => restrictNavigation(contents, source))
}
