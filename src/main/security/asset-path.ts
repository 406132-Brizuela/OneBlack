import { isAbsolute, join, relative, sep } from 'node:path'
import { APP_HOST } from './renderer-source'

function decodePathname(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return null
  }
}

function isInside(root: string, target: string): boolean {
  const path = relative(root, target)
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path)
}

/** Traduce una URL app:// a un archivo dentro de `root`; devuelve null si intenta salir de él. */
export function resolveAssetPath(root: string, requestUrl: string): string | null {
  const url = new URL(requestUrl)
  if (url.host !== APP_HOST) return null
  const pathname = decodePathname(url.pathname)
  if (pathname === null || pathname.includes('\0')) return null
  const target = join(root, pathname)
  return isInside(root, target) ? target : null
}
