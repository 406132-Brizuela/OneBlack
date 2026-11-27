import type { WorkspacesState } from '../../hooks/useWorkspaces'
import { WorkspaceCard } from './WorkspaceCard'

export function WorkspaceList({ items, activeWorkspace, isLoading, error, open }: WorkspacesState) {
  if (isLoading) return <p className="workspaces__empty">Loading workspaces…</p>
  if (items.length === 0) {
    // Con un error visible, decir que no hay workspaces sería engañoso
    if (error) return null
    return <p className="workspaces__empty">No workspaces yet. Register a folder to get started.</p>
  }

  return (
    <ul className="workspaces__list" aria-label="Registered workspaces, most recently opened first">
      {items.map((workspace) => (
        <li key={workspace.id}>
          <WorkspaceCard
            workspace={workspace}
            isActive={workspace.id === activeWorkspace?.id}
            onOpen={(workspaceId) => void open(workspaceId)}
          />
        </li>
      ))}
    </ul>
  )
}
