import type { WorkspaceSummary } from '../../../../shared/workspace'
import { WorkspaceCard } from './WorkspaceCard'

interface WorkspaceListProps {
  workspaces: WorkspaceSummary[]
  isLoading: boolean
  hasError: boolean
  onOpen: (workspaceId: string) => void
}

export function WorkspaceList({ workspaces, isLoading, hasError, onOpen }: WorkspaceListProps) {
  if (isLoading) return <p className="workspaces__empty">Loading workspaces…</p>
  if (workspaces.length === 0) {
    // Con un error visible, decir que no hay workspaces sería engañoso
    if (hasError) return null
    return <p className="workspaces__empty">No workspaces yet. Register a folder to get started.</p>
  }

  return (
    <ul className="workspaces__list" aria-label="Registered workspaces, most recently opened first">
      {workspaces.map((workspace) => (
        <li key={workspace.id}>
          <WorkspaceCard workspace={workspace} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  )
}
