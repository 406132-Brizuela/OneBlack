import type { WorkspaceSummary } from '../../../../shared/workspace'
import { useVisitedTabs } from '../../hooks/useVisitedTabs'
import { WorkspaceView } from './WorkspaceView'

interface WorkspaceStackProps {
  openWorkspaces: WorkspaceSummary[]
  activeId: string | null
}

// Las vistas visitadas siguen montadas: cambiar de pestaña no corta sus terminales
export function WorkspaceStack({ openWorkspaces, activeId }: WorkspaceStackProps) {
  const visited = useVisitedTabs(activeId)

  return openWorkspaces
    .filter((workspace) => visited.has(workspace.id))
    .map((workspace) => (
      <WorkspaceView
        key={workspace.id}
        workspace={workspace}
        isActive={workspace.id === activeId}
      />
    ))
}
