import type { Workspace } from '../../shared/workspace'
import { readTextIfExists, writeJsonFile } from '../storage/json-file'
import { UserFacingError } from '../user-facing-error'
import { isWorkspaceDocument, STORAGE_VERSION, type WorkspaceDocument } from './workspace-schema'

export class WorkspaceRepository {
  constructor(private readonly filePath: string) {}

  async load(): Promise<Workspace[]> {
    const content = await readTextIfExists(this.filePath)
    return content === null ? [] : this.parse(content).workspaces
  }

  async save(workspaces: Workspace[]): Promise<void> {
    const document: WorkspaceDocument = { version: STORAGE_VERSION, workspaces }
    await writeJsonFile(this.filePath, document)
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
