import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { protocol } from 'electron'
import { buildContentSecurityPolicy } from '../../shared/content-security-policy'
import { resolveAssetPath } from './asset-path'
import { APP_SCHEME } from './renderer-source'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2'
}

/** Debe llamarse antes de que la app esté lista. */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: APP_SCHEME, privileges: { standard: true, secure: true } }
  ])
}

function buildHeaders(filePath: string): Record<string, string> {
  return {
    'Content-Type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
    'Content-Security-Policy': buildContentSecurityPolicy({ asHeader: true }),
    'X-Content-Type-Options': 'nosniff'
  }
}

async function respondWithFile(root: string, requestUrl: string): Promise<Response> {
  const filePath = resolveAssetPath(root, requestUrl)
  if (!filePath) return new Response(null, { status: 403 })
  try {
    const content = await readFile(filePath)
    return new Response(new Uint8Array(content), { headers: buildHeaders(filePath) })
  } catch {
    return new Response(null, { status: 404 })
  }
}

// Reemplaza a file://, que no permite enviar headers ni aísla el origen de la app
export function serveRendererFiles(root: string): void {
  protocol.handle(APP_SCHEME, (request) => respondWithFile(root, request.url))
}
