import { WORKSPACE_COLORS, type Workspace, type WorkspaceColor } from '../../shared/workspace'

export const STORAGE_VERSION = 1

export interface WorkspaceDocument {
  version: typeof STORAGE_VERSION
  workspaces: Workspace[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isColor(value: unknown): value is WorkspaceColor {
  return WORKSPACE_COLORS.includes(value as WorkspaceColor)
}

function isWorkspace(value: unknown): value is Workspace {
  if (!isRecord(value)) return false
  const textFields = ['id', 'name', 'path', 'createdAt', 'lastOpenedAt']
  return textFields.every((field) => typeof value[field] === 'string') && isColor(value['color'])
}

export function isWorkspaceDocument(value: unknown): value is WorkspaceDocument {
  if (!isRecord(value) || value['version'] !== STORAGE_VERSION) return false
  const workspaces = value['workspaces']
  return Array.isArray(workspaces) && workspaces.every(isWorkspace)
}
