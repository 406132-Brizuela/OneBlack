import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Workspace } from '../../shared/workspace'
import { hasErrorCode } from '../fs-errors'
import { UserFacingError } from '../user-facing-error'
import { isWorkspaceDocument, STORAGE_VERSION, type WorkspaceDocument } from './workspace-schema'

export class WorkspaceRepository {
  constructor(private readonly filePath: string) {}

  async load(): Promise<Workspace[]> {
    const content = await this.readContent()
    return content === null ? [] : this.parse(content).workspaces
  }

  // Escritura atómica: un corte a mitad de camino no deja el archivo truncado
  async save(workspaces: Workspace[]): Promise<void> {
    const document: WorkspaceDocument = { version: STORAGE_VERSION, workspaces }
    const temporaryPath = `${this.filePath}.tmp`
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, this.filePath)
  }

  private async readContent(): Promise<string | null> {
    try {
      return await readFile(this.filePath, 'utf8')
    } catch (error) {
      if (hasErrorCode(error, 'ENOENT')) return null
      throw error
    }
  }

  // Un archivo inválido se informa y se deja intacto: sobrescribirlo perdería datos
  private parse(content: string): WorkspaceDocument {
    let document: unknown
    try {
      document = JSON.parse(content)
    } catch {
      throw this.invalidFileError()
    }
    if (!isWorkspaceDocument(document)) throw this.invalidFileError()
    return document
  }

  private invalidFileError(): UserFacingError {
    return new UserFacingError(
      `The workspace file is invalid and was left untouched. Fix or remove it: ${this.filePath}`
    )
  }
}
