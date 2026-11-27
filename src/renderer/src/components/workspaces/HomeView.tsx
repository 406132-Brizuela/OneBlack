import type { WorkspaceSummary } from '../../../../shared/workspace'
import type { WorkspaceActions } from '../../hooks/useWorkspaces'
import { WorkspaceList } from './WorkspaceList'

interface HomeViewProps {
  workspaces: WorkspaceSummary[]
  isLoading: boolean
  hasError: boolean
  isRegistering: boolean
  actions: WorkspaceActions
}

export function HomeView({ isRegistering, actions, ...list }: HomeViewProps) {
  return (
    <section className="workspaces" aria-labelledby="workspaces-title">
      <header className="workspaces__header">
        <h1 id="workspaces-title" className="workspaces__title">
          Workspaces
        </h1>
        <button
          type="button"
          className="button"
          disabled={isRegistering}
          onClick={() => void actions.register()}
        >
          + Register workspace
        </button>
      </header>
      <WorkspaceList {...list} onOpen={(workspaceId) => void actions.open(workspaceId)} />
    </section>
  )
}
