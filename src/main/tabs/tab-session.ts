import type { TabSession } from '../../shared/workspace'

export const EMPTY_SESSION: TabSession = { openIds: [], activeId: null }

/** Una pestaña ya abierta conserva su lugar; una nueva se agrega al final. */
export function openTab(session: TabSession, workspaceId: string): TabSession {
  const isOpen = session.openIds.includes(workspaceId)
  const openIds = isOpen ? session.openIds : [...session.openIds, workspaceId]
  return { openIds, activeId: workspaceId }
}

// Al cerrar la pestaña activa se pasa a la de la derecha; si no hay, a la de la izquierda
function neighborOf(openIds: string[], closedId: string): string | null {
  const index = openIds.indexOf(closedId)
  return openIds[index + 1] ?? openIds[index - 1] ?? null
}

export function closeTab(session: TabSession, workspaceId: string): TabSession {
  if (!session.openIds.includes(workspaceId)) return session
  const openIds = session.openIds.filter((id) => id !== workspaceId)
  const wasActive = session.activeId === workspaceId
  const activeId = wasActive ? neighborOf(session.openIds, workspaceId) : session.activeId
  return { openIds, activeId }
}

export function showHome(session: TabSession): TabSession {
  return { ...session, activeId: null }
}

/** Descarta pestañas de workspaces que ya no están registrados. */
export function withoutUnknownTabs(session: TabSession, knownIds: string[]): TabSession {
  const openIds = session.openIds.filter((id) => knownIds.includes(id))
  const isActiveOpen = session.activeId !== null && openIds.includes(session.activeId)
  return { openIds, activeId: isActiveOpen ? session.activeId : null }
}
