import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { closeTab, EMPTY_SESSION, openTab, withoutUnknownTabs } from './tab-session'
import { TabSessionRepository } from './tab-session-repository'

const session = { openIds: ['a', 'b', 'c'], activeId: 'b' }

describe('tab session', () => {
  it('appends new tabs and keeps the position of open ones', () => {
    expect(openTab(session, 'd').openIds).toEqual(['a', 'b', 'c', 'd'])
    expect(openTab(session, 'a')).toEqual({ openIds: ['a', 'b', 'c'], activeId: 'a' })
  })

  it('activates the right neighbor when closing the active tab', () => {
    expect(closeTab(session, 'b')).toEqual({ openIds: ['a', 'c'], activeId: 'c' })
  })

  it('activates the left neighbor when closing the last tab', () => {
    const atEnd = { ...session, activeId: 'c' }

    expect(closeTab(atEnd, 'c').activeId).toBe('b')
  })

  it('keeps the active tab when closing another one', () => {
    expect(closeTab(session, 'a').activeId).toBe('b')
  })

  it('ignores closing a tab that is not open', () => {
    expect(closeTab(session, 'z')).toBe(session)
  })

  it('drops tabs of workspaces that are no longer registered', () => {
    expect(withoutUnknownTabs(session, ['a', 'c'])).toEqual({
      openIds: ['a', 'c'],
      activeId: null
    })
  })
})

describe('TabSessionRepository', () => {
  it.each(['not json', 'null', '{"openIds":[1],"activeId":null}'])(
    'starts empty when the file is invalid: %s',
    async (content) => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const root = await mkdtemp(join(tmpdir(), 'oneblack-tabs-'))
      const filePath = join(root, 'tabs.json')
      await writeFile(filePath, content)

      await expect(new TabSessionRepository(filePath).load()).resolves.toEqual(EMPTY_SESSION)

      await rm(root, { recursive: true, force: true })
      vi.restoreAllMocks()
    }
  )
})
