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
