import type { WorkspaceSummary } from '../../../../shared/workspace'
import { GitBadge } from './GitBadge'

interface WorkspaceCardProps {
  workspace: WorkspaceSummary
  onOpen: (workspaceId: string) => void
}

export function WorkspaceCard({ workspace, onOpen }: WorkspaceCardProps) {
  return (
    <button
      type="button"
      className="workspace-card"
      data-color={workspace.color}
      onClick={() => onOpen(workspace.id)}
    >
      <span className="workspace-card__name">{workspace.name}</span>
      <GitBadge status={workspace.git} />
      <span className="workspace-card__path" title={workspace.path}>
        {workspace.path}
      </span>
    </button>
  )
}
