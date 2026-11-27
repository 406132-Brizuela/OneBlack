import type { WorkspaceSummary } from '../../../../shared/workspace'
import { GitBadge } from './GitBadge'

export function WorkspaceView({ workspace }: { workspace: WorkspaceSummary }) {
  return (
    <article
      className="workspaces workspace-view"
      data-color={workspace.color}
      aria-labelledby="workspace-title"
    >
      <header className="workspaces__header workspace-view__header">
        <h1 id="workspace-title" className="workspaces__title">
          {workspace.name}
        </h1>
        <GitBadge status={workspace.git} />
      </header>
      <p className="workspace-view__path">{workspace.path}</p>
      <p className="workspaces__empty">Terminals and agents for this workspace will live here.</p>
    </article>
  )
}
