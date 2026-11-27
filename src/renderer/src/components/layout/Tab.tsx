import { useEffect, useRef, type MouseEvent } from 'react'
import type { WorkspaceSummary } from '../../../../shared/workspace'
import type { WorkspaceActions } from '../../hooks/useWorkspaces'
import { keepFocus } from '../../navigation/keep-focus'

interface TabProps {
  workspace: WorkspaceSummary
  isActive: boolean
  actions: WorkspaceActions
}

const MIDDLE_BUTTON = 1

export function Tab({ workspace, isActive, actions }: TabProps) {
  const element = useRef<HTMLLIElement>(null)
  const close = (): void => void actions.close(workspace.id)
  const closeWithMiddleClick = (event: MouseEvent): void => {
    if (event.button === MIDDLE_BUTTON) close()
  }

  // Con muchas pestañas, la activa siempre queda a la vista
  useEffect(() => {
    if (isActive) element.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [isActive])

  return (
    <li
      ref={element}
      className="tab"
      data-color={workspace.color}
      data-active={isActive}
      onMouseDown={keepFocus}
      onAuxClick={closeWithMiddleClick}
    >
      <button
        type="button"
        className="tab__label"
        title={workspace.path}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => void actions.open(workspace.id)}
      >
        <span className="color-dot" aria-hidden="true" />
        <span className="tab__name">{workspace.name}</span>
      </button>
      <button
        type="button"
        className="tab__close"
        aria-label={`Close ${workspace.name} tab`}
        onClick={close}
      >
        ×
      </button>
    </li>
  )
}
