import { describe, expect, it } from 'vitest'
import { isClipboardStroke } from './clipboard-keys'
import { createOutputStream } from './output-stream'

describe('createOutputStream', () => {
  it('writes the history first and skips the chunks it already contains', () => {
    const written: string[] = []
    const stream = createOutputStream((data) => written.push(data))

    stream.receive({ workspaceId: 'a', data: 'two', sequence: 2 })
    stream.receive({ workspaceId: 'a', data: 'three', sequence: 3 })
    stream.start({ history: 'onetwo', sequence: 2, exitCode: null })
    stream.receive({ workspaceId: 'a', data: 'four', sequence: 4 })

    expect(written).toEqual(['onetwo', 'three', 'four'])
  })
})

describe('isClipboardStroke', () => {
  const ctrl = { ctrlKey: true, altKey: false }

  it('leaves paste to the browser', () => {
    expect(isClipboardStroke({ ...ctrl, code: 'KeyV' }, false)).toBe(true)
  })

  it('keeps Ctrl+C as an interrupt unless there is a selection', () => {
    expect(isClipboardStroke({ ...ctrl, code: 'KeyC' }, false)).toBe(false)
    expect(isClipboardStroke({ ...ctrl, code: 'KeyC' }, true)).toBe(true)
  })

  it('ignores AltGr and plain keys', () => {
    expect(isClipboardStroke({ code: 'KeyV', ctrlKey: true, altKey: true }, false)).toBe(false)
    expect(isClipboardStroke({ code: 'KeyV', ctrlKey: false, altKey: false }, false)).toBe(false)
  })
})
