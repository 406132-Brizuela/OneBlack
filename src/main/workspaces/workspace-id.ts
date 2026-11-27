import { UserFacingError } from '../user-facing-error'

export function requireWorkspaceId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new UserFacingError('Invalid workspace identifier.')
  }
  return value
}
