import type { WorkspaceSummary } from '../../../shared/workspace'

/** Orden fijo de la sidebar: por registro, para que cada workspace no cambie de lugar. */
export function sortByRegistration(workspaces: WorkspaceSummary[]): WorkspaceSummary[] {
  return [...workspaces].sort((first, second) => first.createdAt.localeCompare(second.createdAt))
}
