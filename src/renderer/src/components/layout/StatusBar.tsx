import type { WorkspaceSummary } from '../../../../shared/workspace'
import { GitBadge } from '../workspaces/GitBadge'

interface StatusBarProps {
  activeWorkspace: WorkspaceSummary | null
  workspaceCount: number
}

export function StatusBar({ activeWorkspace, workspaceCount }: StatusBarProps) {
  return (
    <footer className="statusbar">
      <span className="statusbar__section">
        {activeWorkspace ? activeWorkspace.name : 'No active workspace'}
        {activeWorkspace && <GitBadge status={activeWorkspace.git} />}
      </span>
      <span className="statusbar__section">
        {workspaceCount} {workspaceCount === 1 ? 'workspace' : 'workspaces'}
      </span>
    </footer>
  )
}
