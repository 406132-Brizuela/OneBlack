import { describe, expect, it } from 'vitest'
import { resolveShortcut, type KeyStroke } from './shortcuts'

const sidebar = ['a', 'b', 'c']
const tabs = { openIds: ['c', 'a'], activeId: 'a' }

function stroke(overrides: Partial<KeyStroke>): KeyStroke {
  const base = { key: '', code: '', ctrlKey: true }
  return { ...base, shiftKey: false, altKey: false, metaKey: false, ...overrides }
}

describe('resolveShortcut', () => {
  it('jumps to a workspace by its sidebar position', () => {
    expect(resolveShortcut(stroke({ code: 'Digit2' }), sidebar, tabs)).toBe('b')
    expect(resolveShortcut(stroke({ code: 'Numpad3' }), sidebar, tabs)).toBe('c')
  })

  it('cycles through the tabs in both directions, wrapping around', () => {
    expect(resolveShortcut(stroke({ key: 'Tab' }), sidebar, tabs)).toBe('c')
    expect(resolveShortcut(stroke({ key: 'Tab', shiftKey: true }), sidebar, tabs)).toBe('c')
  })

  it('enters the tabs from the home screen', () => {
    const home = { openIds: ['c', 'a'], activeId: null }

    expect(resolveShortcut(stroke({ key: 'Tab' }), sidebar, home)).toBe('c')
    expect(resolveShortcut(stroke({ key: 'Tab', shiftKey: true }), sidebar, home)).toBe('a')
  })

  it.each([
    { code: 'Digit9' },
    { code: 'Digit0' },
    { code: 'Digit1', ctrlKey: false },
    { code: 'Digit1', altKey: true },
    { code: 'Digit1', shiftKey: true }
  ])('ignores %o', (overrides) => {
    expect(resolveShortcut(stroke(overrides), sidebar, tabs)).toBeNull()
  })

  it('does nothing with Ctrl+Tab when there are no tabs', () => {
    const empty = { openIds: [], activeId: null }

    expect(resolveShortcut(stroke({ key: 'Tab' }), sidebar, empty)).toBeNull()
  })
})
