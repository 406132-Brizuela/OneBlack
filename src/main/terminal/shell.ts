import { statSync } from 'node:fs'
import { posix, win32 } from 'node:path'

export interface Shell {
  file: string
  args: string[]
}

type Environment = Record<string, string | undefined>

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

// Solo entradas absolutas del PATH: una relativa permitiría que un ejecutable
// dejado dentro del workspace se haga pasar por el shell
function findInPath(name: string, env: Environment, exists: (path: string) => boolean) {
  const directories = (env['Path'] ?? env['PATH'] ?? '').split(win32.delimiter)
  return directories
    .filter((directory) => win32.isAbsolute(directory))
    .map((directory) => win32.join(directory, name))
    .find(exists)
}

function resolveWindowsShell(env: Environment, exists: (path: string) => boolean): Shell {
  const systemRoot = env['SystemRoot'] ?? 'C:\\Windows'
  const bundled = win32.join(systemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe')
  // PowerShell 7 si está instalado; si no, el que trae Windows
  return { file: findInPath('pwsh.exe', env, exists) ?? bundled, args: ['-NoLogo'] }
}

export function resolveShell(
  platform: NodeJS.Platform,
  env: Environment,
  exists: (path: string) => boolean = isFile
): Shell {
  if (platform === 'win32') return resolveWindowsShell(env, exists)
  const preferred = env['SHELL']
  const file = preferred && posix.isAbsolute(preferred) ? preferred : '/bin/bash'
  return { file, args: ['-l'] }
}

// Variables que la propia app (o electron-vite en desarrollo) agrega a su entorno
const APP_VARIABLES = /^(?:ELECTRON_|NODE_ENV_ELECTRON_VITE$)/i

export function buildShellEnvironment(env: Environment): Record<string, string> {
  const isDevelopmentRun = env['NODE_ENV_ELECTRON_VITE'] !== undefined
  const inherited = Object.entries(env).filter(
    (entry): entry is [string, string] =>
      entry[1] !== undefined &&
      !APP_VARIABLES.test(entry[0]) &&
      !(isDevelopmentRun && entry[0] === 'NODE_ENV')
  )
  return { ...Object.fromEntries(inherited), TERM: 'xterm-256color', COLORTERM: 'truecolor' }
}
