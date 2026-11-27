import { describe, expect, it } from 'vitest'
import { closeTabSafely } from './close-tab'

async function closeWith(isRunning: boolean, isAccepted: boolean): Promise<string[]> {
  const calls: string[] = []
  await closeTabSafely('a', {
    hasRunningTerminal: () => isRunning,
    confirm: () => {
      calls.push('confirm')
      return Promise.resolve(isAccepted)
    },
    closeTab: (id) => {
      calls.push(`tab:${id}`)
      return Promise.resolve()
    },
    closeTerminal: (id) => calls.push(`terminal:${id}`)
  })
  return calls
}

describe('closeTabSafely', () => {
  it('closes without asking when nothing is running', async () => {
    await expect(closeWith(false, false)).resolves.toEqual(['tab:a', 'terminal:a'])
  })

  it('closes a running terminal once confirmed', async () => {
    await expect(closeWith(true, true)).resolves.toEqual(['confirm', 'tab:a', 'terminal:a'])
  })

  it('keeps the tab and the process when cancelled', async () => {
    await expect(closeWith(true, false)).resolves.toEqual(['confirm'])
  })
})
