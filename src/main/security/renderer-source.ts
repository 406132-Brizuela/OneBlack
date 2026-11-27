export const APP_SCHEME = 'app'
export const APP_HOST = 'oneblack'

export interface RendererSource {
  url: string
  isDevServer: boolean
  isTrustedUrl: (candidate: string) => boolean
}

// Compara protocolo y host: `URL.origin` devuelve "null" para esquemas propios
function hasSameOrigin(candidate: string, trusted: URL): boolean {
  if (!URL.canParse(candidate)) return false
  const url = new URL(candidate)
  return url.protocol === trusted.protocol && url.host === trusted.host
}

export function resolveRendererSource(devServerUrl: string | undefined): RendererSource {
  const url = devServerUrl || `${APP_SCHEME}://${APP_HOST}/index.html`
  const trusted = new URL(url)
  return {
    url,
    isDevServer: Boolean(devServerUrl),
    isTrustedUrl: (candidate) => hasSameOrigin(candidate, trusted)
  }
}
