import type { TabSession } from '../../shared/workspace'
import { readTextIfExists, writeJsonFile } from '../storage/json-file'
import { EMPTY_SESSION } from './tab-session'

function isTabSession(value: unknown): value is TabSession {
  if (typeof value !== 'object' || value === null) return false
  const { openIds, activeId } = value as Record<string, unknown>
  if (!Array.isArray(openIds) || !openIds.every((id) => typeof id === 'string')) return false
  return activeId === null || typeof activeId === 'string'
}

export class TabSessionRepository {
  constructor(private readonly filePath: string) {}

  // Las pestañas son estado descartable: un archivo inválido no bloquea la app
  async load(): Promise<TabSession> {
    const content = await readTextIfExists(this.filePath)
    if (content === null) return EMPTY_SESSION
    try {
      const session: unknown = JSON.parse(content)
      if (isTabSession(session)) return session
    } catch (error) {
      console.warn(`Could not parse ${this.filePath}`, error)
    }
    console.warn(`Ignoring invalid tab session: ${this.filePath}`)
    return EMPTY_SESSION
  }

  save(session: TabSession): Promise<void> {
    return writeJsonFile(this.filePath, session)
  }
}
