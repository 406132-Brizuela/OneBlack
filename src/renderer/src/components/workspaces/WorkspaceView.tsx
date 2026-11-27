import type { WorkspaceSummary } from '../../../../shared/workspace'
import { TerminalPane } from '../terminal/TerminalPane'
import { GitBadge } from './GitBadge'

interface WorkspaceViewProps {
  workspace: WorkspaceSummary
  isActive: boolean
}

export function WorkspaceView({ workspace, isActive }: WorkspaceViewProps) {
  const titleId = `workspace-title-${workspace.id}`

  return (
    <article
      className="workspace-view"
      data-color={workspace.color}
      aria-labelledby={titleId}
      hidden={!isActive}
    >
      <header className="workspace-view__header">
        <h1 id={titleId} className="workspaces__title">
          {workspace.name}
        </h1>
        <GitBadge status={workspace.git} />
        <p className="workspace-view__path" title={workspace.path}>
          {workspace.path}
        </p>
      </header>
      <TerminalPane workspaceId={workspace.id} isActive={isActive} />
    </article>
  )
}
