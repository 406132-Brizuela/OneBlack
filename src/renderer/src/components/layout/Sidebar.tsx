const NAVIGATION_ITEMS = [
  { label: 'Workspaces', isAvailable: true },
  { label: 'Agents', isAvailable: false },
  { label: 'Key vault', isAvailable: false },
  { label: 'Settings', isAvailable: false }
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <p className="wordmark">
          One<span className="wordmark__accent">Black</span>
        </p>
      </header>
      <nav aria-label="Main">
        <ul className="sidebar__list">
          {NAVIGATION_ITEMS.map(({ label, isAvailable }) => (
            <li key={label}>
              <button
                type="button"
                className="sidebar__item"
                aria-current={isAvailable ? 'page' : undefined}
                disabled={!isAvailable}
              >
                {label}
                {!isAvailable && <span className="sidebar__badge">soon</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
