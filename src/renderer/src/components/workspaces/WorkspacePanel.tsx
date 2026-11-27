import type { WorkspacesState } from '../../hooks/useWorkspaces'
import { WorkspaceList } from './WorkspaceList'

export function WorkspacePanel(state: WorkspacesState) {
  const { error, notice, isRegistering, register } = state

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
          onClick={() => void register()}
        >
          + Register workspace
        </button>
      </header>
      {error && (
        <p className="message message--error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="message" role="status">
          {notice}
        </p>
      )}
      <WorkspaceList {...state} />
    </section>
  )
}
