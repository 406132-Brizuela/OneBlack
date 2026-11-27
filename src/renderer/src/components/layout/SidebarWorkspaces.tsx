import { NUMBERED_SHORTCUTS } from '../../navigation/shortcuts'
import type { SidebarProps } from './Sidebar'

export function SidebarWorkspaces(props: SidebarProps) {
  const { workspaces, activeId, isRegistering, actions } = props

  return (
    <section className="sidebar__workspaces">
      <button
        type="button"
        className="sidebar__item"
        aria-current={activeId === null ? 'page' : undefined}
        onClick={() => void actions.showHome()}
      >
        Workspaces
      </button>
      <ul className="sidebar__list sidebar__list--workspaces">
        {workspaces.map((workspace, index) => (
          <li key={workspace.id}>
            <button
              type="button"
              className="sidebar__item sidebar__item--workspace"
              data-color={workspace.color}
              title={workspace.path}
              aria-current={workspace.id === activeId ? 'page' : undefined}
              onClick={() => void actions.open(workspace.id)}
            >
              <span className="color-dot" aria-hidden="true" />
              <span className="sidebar__name">{workspace.name}</span>
              {index < NUMBERED_SHORTCUTS && (
                <kbd className="sidebar__badge" title={`Ctrl+${index + 1}`}>
                  {index + 1}
                </kbd>
              )}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="sidebar__item sidebar__item--add"
        disabled={isRegistering}
        onClick={() => void actions.register()}
      >
        + Add
      </button>
    </section>
  )
}
