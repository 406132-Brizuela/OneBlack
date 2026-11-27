import { readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { GitStatus } from '../../shared/workspace'
import { hasErrorCode } from '../fs-errors'

// Se leen los archivos de .git en vez de ejecutar `git`: un repositorio ajeno puede
// definir comandos en su configuración, y leer HEAD no ejecuta nada.

const MAX_METADATA_BYTES = 4096
const BRANCH_REF = /^ref: refs\/heads\/(.+)$/
const COMMIT_HASH = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/
const GITDIR_POINTER = /^gitdir: (.+)$/
const SHORT_HASH_LENGTH = 7
// Valor que deja en HEAD el formato "reftable", cuya rama no está en este archivo
const REFTABLE_PLACEHOLDER = '.invalid'

export function parseHead(content: string): GitStatus {
  const head = content.trim()
  const branch = BRANCH_REF.exec(head)?.[1]
  if (branch && branch !== REFTABLE_PLACEHOLDER) return { kind: 'branch', branch }
  if (COMMIT_HASH.test(head)) return { kind: 'detached', commit: head.slice(0, SHORT_HASH_LENGTH) }
  return { kind: 'unreadable' }
}

async function readMetadataFile(path: string): Promise<string> {
  const info = await stat(path)
  if (!info.isFile() || info.size > MAX_METADATA_BYTES) {
    throw new Error(`Invalid git metadata file: ${path}`)
  }
  return readFile(path, 'utf8')
}

function isNetworkPath(path: string): boolean {
  return /^[\\/]{2}/.test(path)
}

// En worktrees y submódulos `.git` es un archivo que apunta al directorio real
async function followGitdirPointer(pointerFile: string): Promise<string> {
  const content = await readMetadataFile(pointerFile)
  const target = GITDIR_POINTER.exec(content.trim())?.[1]
  if (!target) throw new Error(`Invalid gitdir pointer: ${pointerFile}`)
  const gitDirectory = resolve(dirname(pointerFile), target)
  // Un puntero no puede provocar accesos de red desde un workspace local
  if (isNetworkPath(gitDirectory) && !isNetworkPath(pointerFile)) {
    throw new Error(`Refusing to follow a network gitdir: ${pointerFile}`)
  }
  return gitDirectory
}

async function resolveDotGit(directory: string): Promise<string | null> {
  const dotGit = join(directory, '.git')
  try {
    const info = await stat(dotGit)
    return info.isDirectory() ? dotGit : await followGitdirPointer(dotGit)
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) return null
    throw error
  }
}

// Igual que git: la carpeta puede estar dentro de un repositorio de un nivel superior
async function findGitDirectory(start: string): Promise<string | null> {
  const gitDirectory = await resolveDotGit(start)
  if (gitDirectory) return gitDirectory
  const parent = dirname(start)
  return parent === start ? null : findGitDirectory(parent)
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

export async function readGitStatus(workspacePath: string): Promise<GitStatus> {
  if (!(await isDirectory(workspacePath))) return { kind: 'missing-folder' }
  try {
    const gitDirectory = await findGitDirectory(resolve(workspacePath))
    if (!gitDirectory) return { kind: 'not-a-repository' }
    return parseHead(await readMetadataFile(join(gitDirectory, 'HEAD')))
  } catch (error) {
    console.warn(`Could not read git status for ${workspacePath}`, error)
    return { kind: 'unreadable' }
  }
}
