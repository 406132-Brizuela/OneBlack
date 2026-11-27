import type { WorkspaceSummary } from '../../../../shared/workspace'
import type { WorkspaceActions } from '../../hooks/useWorkspaces'
import { SidebarWorkspaces } from './SidebarWorkspaces'

const UPCOMING_SECTIONS = ['Agents', 'Key vault', 'Settings']

export interface SidebarProps {
  workspaces: WorkspaceSummary[]
  activeId: string | null
  isRegistering: boolean
  actions: WorkspaceActions
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <p className="wordmark">
          One<span className="wordmark__accent">Black</span>
        </p>
      </header>
      <nav className="sidebar__nav" aria-label="Main">
        <SidebarWorkspaces {...props} />
        <ul className="sidebar__list sidebar__list--upcoming">
          {UPCOMING_SECTIONS.map((label) => (
            <li key={label}>
              <button type="button" className="sidebar__item" disabled>
                {label}
                <span className="sidebar__badge">soon</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
