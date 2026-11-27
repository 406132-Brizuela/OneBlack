import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type {
  GitStatus,
  RegisterOutcome,
  Workspace,
  WorkspaceSummary
} from '../../shared/workspace'
import { UserFacingError } from '../user-facing-error'
import { buildName, isSameFolder, pickColor, sortByLastOpened } from './workspace-model'
import type { WorkspaceRepository } from './workspace-repository'

export type GitStatusReader = (workspacePath: string) => Promise<GitStatus>

export class WorkspaceService {
  private pendingChange: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly readGitStatus: GitStatusReader,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** Workspaces con su estado git actual; el abierto más recientemente va primero. */
  async list(): Promise<WorkspaceSummary[]> {
    await this.pendingChange
    const workspaces = sortByLastOpened(await this.repository.load())
    return Promise.all(
      workspaces.map(async (workspace) => ({
        ...workspace,
        git: await this.readGitStatus(workspace.path)
      }))
    )
  }

  /** Registrar una carpeta ya conocida no la duplica: la marca como recién abierta. */
  register(folderPath: string): Promise<RegisterOutcome> {
    return this.enqueue<RegisterOutcome>(async () => {
      const workspaces = await this.repository.load()
      const existing = workspaces.find((item) => isSameFolder(item.path, folderPath))
      if (existing) {
        await this.saveAsOpened(workspaces, existing.id)
        return { status: 'already-registered', workspaceId: existing.id }
      }
      const created = this.createWorkspace(folderPath, workspaces)
      await this.repository.save([...workspaces, created])
      return { status: 'registered', workspaceId: created.id }
    })
  }

  open(workspaceId: string): Promise<void> {
    return this.enqueue(async () => {
      const workspaces = await this.repository.load()
      if (!workspaces.some((item) => item.id === workspaceId)) {
        throw new UserFacingError('That workspace is no longer registered.')
      }
      await this.saveAsOpened(workspaces, workspaceId)
    })
  }

  private createWorkspace(folderPath: string, others: Workspace[]): Workspace {
    const path = resolve(folderPath)
    const timestamp = this.now().toISOString()
    return {
      id: randomUUID(),
      name: buildName(path),
      path,
      color: pickColor(others),
      createdAt: timestamp,
      lastOpenedAt: timestamp
    }
  }

  private saveAsOpened(workspaces: Workspace[], workspaceId: string): Promise<void> {
    const lastOpenedAt = this.now().toISOString()
    return this.repository.save(
      workspaces.map((item) => (item.id === workspaceId ? { ...item, lastOpenedAt } : item))
    )
  }

  // Serializa los cambios: dos lecturas-escrituras en paralelo se pisarían
  private enqueue<T>(change: () => Promise<T>): Promise<T> {
    const result = this.pendingChange.then(change)
    this.pendingChange = result.catch(() => undefined)
    return result
  }
}
