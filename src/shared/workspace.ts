export const WORKSPACE_COLORS = ['violet', 'cyan', 'green', 'amber', 'pink', 'blue'] as const

export type WorkspaceColor = (typeof WORKSPACE_COLORS)[number]

export interface Workspace {
  id: string
  name: string
  path: string
  color: WorkspaceColor
  createdAt: string
  lastOpenedAt: string
}

export type GitStatus =
  | { kind: 'branch'; branch: string }
  | { kind: 'detached'; commit: string }
  | { kind: 'not-a-repository' }
  | { kind: 'missing-folder' }
  | { kind: 'unreadable' }

export interface WorkspaceSummary extends Workspace {
  git: GitStatus
}

export type RegisterOutcome =
  | { status: 'cancelled' }
  | { status: 'registered' | 'already-registered'; workspaceId: string }

/** Pestañas abiertas, en orden. Sin pestaña activa se muestra la pantalla de inicio. */
export interface TabSession {
  openIds: string[]
  activeId: string | null
}

export interface WorkspaceSnapshot {
  /** Ordenados por apertura: el más reciente primero */
  workspaces: WorkspaceSummary[]
  tabs: TabSession
}
