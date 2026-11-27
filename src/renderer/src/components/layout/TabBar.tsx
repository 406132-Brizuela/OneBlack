import type { WorkspaceSummary } from '../../../../shared/workspace'
import type { WorkspaceActions } from '../../hooks/useWorkspaces'
import { Tab } from './Tab'

interface TabBarProps {
  workspaces: WorkspaceSummary[]
  activeId: string | null
  actions: WorkspaceActions
}

export function TabBar({ workspaces, activeId, actions }: TabBarProps) {
  return (
    <nav className="tabbar" aria-label="Open tabs">
      <ul className="tabbar__list">
        {workspaces.map((workspace) => (
          <Tab
            key={workspace.id}
            workspace={workspace}
            isActive={workspace.id === activeId}
            actions={actions}
          />
        ))}
      </ul>
    </nav>
  )
}
