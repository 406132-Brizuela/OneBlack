import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type {
  GitStatus,
  RegisterOutcome,
  TabSession,
  Workspace,
  WorkspaceSnapshot
} from '../../shared/workspace'
import { closeTab, openTab, showHome, withoutUnknownTabs } from '../tabs/tab-session'
import type { TabSessionRepository } from '../tabs/tab-session-repository'
import { UserFacingError } from '../user-facing-error'
import { buildName, isSameFolder, pickColor, sortByLastOpened } from './workspace-model'
import type { WorkspaceRepository } from './workspace-repository'

export type GitStatusReader = (workspacePath: string) => Promise<GitStatus>

export class WorkspaceService {
  private pendingChange: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly tabs: TabSessionRepository,
    private readonly readGitStatus: GitStatusReader,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** Workspaces con su estado git actual y las pestañas abiertas. */
  async snapshot(): Promise<WorkspaceSnapshot> {
    await this.pendingChange
    const workspaces = sortByLastOpened(await this.repository.load())
    const knownIds = workspaces.map((workspace) => workspace.id)
    const tabs = withoutUnknownTabs(await this.tabs.load(), knownIds)
    const summaries = workspaces.map(async (workspace) => ({
      ...workspace,
      git: await this.readGitStatus(workspace.path)
    }))
    return { workspaces: await Promise.all(summaries), tabs }
  }

  /** Registrar una carpeta ya conocida no la duplica: solo la abre. */
  register(folderPath: string): Promise<RegisterOutcome> {
    return this.enqueue<RegisterOutcome>(async () => {
      const workspaces = await this.repository.load()
      const existing = workspaces.find((item) => isSameFolder(item.path, folderPath))
      if (existing) {
        await this.activate(workspaces, existing.id)
        return { status: 'already-registered', workspaceId: existing.id }
      }
      const created = this.createWorkspace(folderPath, workspaces)
      await this.activate([...workspaces, created], created.id)
      return { status: 'registered', workspaceId: created.id }
    })
  }

  open(workspaceId: string): Promise<void> {
    return this.enqueue(async () => {
      const workspaces = await this.repository.load()
      if (!workspaces.some((item) => item.id === workspaceId)) {
        throw new UserFacingError('That workspace is no longer registered.')
      }
      await this.activate(workspaces, workspaceId)
    })
  }

  /** Carpeta de un workspace con pestaña abierta: la única que puede tener terminal. */
  async openTabFolder(workspaceId: string): Promise<string> {
    const { workspaces, tabs } = await this.snapshot()
    const workspace = workspaces.find((item) => item.id === workspaceId)
    if (!workspace || !tabs.openIds.includes(workspaceId)) {
      throw new UserFacingError('Open the workspace before starting a terminal.')
    }
    if (workspace.git.kind === 'missing-folder') {
      throw new UserFacingError(`Folder not found: ${workspace.path}`)
    }
    return workspace.path
  }

  async nameOf(workspaceId: string): Promise<string> {
    const workspaces = await this.repository.load()
    const workspace = workspaces.find((item) => item.id === workspaceId)
    if (!workspace) throw new UserFacingError('That workspace is no longer registered.')
    return workspace.name
  }

  close(workspaceId: string): Promise<void> {
    return this.updateTabs((session) => closeTab(session, workspaceId))
  }

  showHome(): Promise<void> {
    return this.updateTabs(showHome)
  }

  private updateTabs(change: (session: TabSession) => TabSession): Promise<void> {
    return this.enqueue(async () => {
      await this.tabs.save(change(await this.tabs.load()))
    })
  }

  // Abrir un workspace actualiza su fecha de apertura y activa su pestaña
  private async activate(workspaces: Workspace[], workspaceId: string): Promise<void> {
    const lastOpenedAt = this.now().toISOString()
    await this.repository.save(
      workspaces.map((item) => (item.id === workspaceId ? { ...item, lastOpenedAt } : item))
    )
    await this.tabs.save(openTab(await this.tabs.load(), workspaceId))
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

  // Serializa los cambios: dos lecturas-escrituras en paralelo se pisarían
  private enqueue<T>(change: () => Promise<T>): Promise<T> {
    const result = this.pendingChange.then(change)
    this.pendingChange = result.catch(() => undefined)
    return result
  }
}
