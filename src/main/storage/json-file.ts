import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { hasErrorCode } from '../fs-errors'

/** Contenido del archivo, o null si todavía no existe. */
export async function readTextIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) return null
    throw error
  }
}

// Escritura atómica: un corte a mitad de camino no deja el archivo truncado
export async function writeJsonFile(filePath: string, document: unknown): Promise<void> {
  const temporaryPath = `${filePath}.tmp`
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, filePath)
}
