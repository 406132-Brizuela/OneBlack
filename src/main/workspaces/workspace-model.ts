import { basename, resolve } from 'node:path'
import { WORKSPACE_COLORS, type Workspace, type WorkspaceColor } from '../../shared/workspace'

function toComparablePath(path: string): string {
  const absolute = resolve(path)
  // Windows no distingue mayúsculas en las rutas
  return process.platform === 'win32' ? absolute.toLowerCase() : absolute
}

export function isSameFolder(first: string, second: string): boolean {
  return toComparablePath(first) === toComparablePath(second)
}

/** Elige el color menos usado para que los workspaces se distingan entre sí. */
export function pickColor(workspaces: Workspace[]): WorkspaceColor {
  const uses = (color: WorkspaceColor): number =>
    workspaces.filter((workspace) => workspace.color === color).length
  return WORKSPACE_COLORS.reduce<WorkspaceColor>(
    (best, color) => (uses(color) < uses(best) ? color : best),
    WORKSPACE_COLORS[0]
  )
}

export function buildName(folderPath: string): string {
  // La raíz de una unidad no tiene nombre de carpeta
  return basename(folderPath) || folderPath
}

export function sortByLastOpened(workspaces: Workspace[]): Workspace[] {
  return [...workspaces].sort((first, second) =>
    second.lastOpenedAt.localeCompare(first.lastOpenedAt)
  )
}
