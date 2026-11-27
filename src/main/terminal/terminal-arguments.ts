import type { TerminalSize } from '../../shared/terminal'
import { UserFacingError } from '../user-facing-error'

const MAX_DIMENSION = 1000
export const MAX_INPUT_LENGTH = 1_000_000

function isDimension(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= MAX_DIMENSION
}

export function requireTerminalSize(value: unknown): TerminalSize {
  const { cols, rows } = (value ?? {}) as Record<string, unknown>
  if (!isDimension(cols) || !isDimension(rows)) {
    throw new UserFacingError('Invalid terminal size.')
  }
  return { cols, rows }
}

export function requireTerminalInput(value: unknown): string {
  if (typeof value !== 'string' || value.length > MAX_INPUT_LENGTH) {
    throw new UserFacingError('Invalid terminal input, or too much text pasted at once.')
  }
  return value
}
