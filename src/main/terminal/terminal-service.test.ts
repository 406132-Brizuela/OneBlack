import { beforeEach, describe, expect, it } from 'vitest'
import type { TerminalData, TerminalExit } from '../../shared/terminal'
import type { Pty } from './pty'
import { TerminalService } from './terminal-service'
import { HISTORY_LIMIT } from './terminal-session'

class FakePty implements Pty {
  written: string[] = []
  sizes: string[] = []
  isKilled = false
  private dataListener: (data: string) => void = () => undefined
  private exitListener: (event: { exitCode: number }) => void = () => undefined

  onData(listener: (data: string) => void): void {
    this.dataListener = listener
  }
  onExit(listener: (event: { exitCode: number }) => void): void {
    this.exitListener = listener
  }
  write(data: string): void {
    this.written.push(data)
  }
  resize(cols: number, rows: number): void {
    this.sizes.push(`${cols}x${rows}`)
  }
  kill(): void {
    this.isKilled = true
  }
  print(data: string): void {
    this.dataListener(data)
  }
  finish(exitCode: number): void {
    this.exitListener({ exitCode })
  }
}

const size = { cols: 80, rows: 24 }
let spawned: FakePty[]
let received: (TerminalData | TerminalExit)[]
let service: TerminalService

beforeEach(() => {
  spawned = []
  received = []
  service = new TerminalService(
    () => {
      const pty = new FakePty()
      spawned.push(pty)
      return pty
    },
    (id) =>
      id === 'unknown' ? Promise.reject(new Error('not open')) : Promise.resolve(`/work/${id}`),
    { data: (event) => received.push(event), exit: (event) => received.push(event) }
  )
})

describe('TerminalService', () => {
  it('forwards output with an increasing sequence', async () => {
    await service.open('a', size)

    spawned[0]?.print('one')
    spawned[0]?.print('two')

    expect(received).toEqual([
      { workspaceId: 'a', data: 'one', sequence: 1 },
      { workspaceId: 'a', data: 'two', sequence: 2 }
    ])
  })

  it('reattaches to the running session with its history', async () => {
    await service.open('a', size)
    spawned[0]?.print('hello')

    const snapshot = await service.open('a', { cols: 100, rows: 30 })

    expect(snapshot).toEqual({ history: 'hello', sequence: 1, exitCode: null })
    expect(spawned).toHaveLength(1)
    expect(spawned[0]?.sizes).toEqual(['100x30'])
  })

  it('starts a single process for simultaneous openings', async () => {
    await Promise.all([service.open('a', size), service.open('a', size)])

    expect(spawned).toHaveLength(1)
  })

  it('keeps only the most recent output', async () => {
    await service.open('a', size)

    spawned[0]?.print('x'.repeat(HISTORY_LIMIT))
    spawned[0]?.print('end')
    const { history } = await service.open('a', size)

    expect(history).toHaveLength(HISTORY_LIMIT)
    expect(history.endsWith('end')).toBe(true)
  })

  it('remembers the exit code and stops writing to a finished process', async () => {
    await service.open('a', size)
    spawned[0]?.finish(3)

    service.write('a', 'ignored')

    expect((await service.open('a', size)).exitCode).toBe(3)
    expect(spawned[0]?.written).toEqual([])
    expect(received).toEqual([{ workspaceId: 'a', exitCode: 3 }])
  })

  it('kills the process on close and silences it', async () => {
    await service.open('a', size)

    service.close('a')
    spawned[0]?.print('late')
    spawned[0]?.finish(1)

    expect(spawned[0]?.isKilled).toBe(true)
    expect(received).toEqual([])
  })

  it('starts a new process after closing', async () => {
    await service.open('a', size)
    service.close('a')

    await service.open('a', size)

    expect(spawned).toHaveLength(2)
  })

  it('does not leave an orphan process when closed while starting', async () => {
    const opening = service.open('a', size)
    service.close('a')

    await expect(opening).rejects.toThrow('closed while starting')
    expect(spawned).toHaveLength(0)
  })

  it('does not start a terminal when the folder cannot be resolved', async () => {
    await expect(service.open('unknown', size)).rejects.toThrow('not open')
    expect(spawned).toHaveLength(0)
  })

  it('reports a terminal as running only while its process is alive', async () => {
    expect(service.isRunning('a')).toBe(false)
    const opening = service.open('a', size)
    expect(service.isRunning('a')).toBe(true)
    await opening
    expect(service.isRunning('a')).toBe(true)

    spawned[0]?.finish(0)

    expect(service.isRunning('a')).toBe(false)
  })

  it('kills every process when closing all', async () => {
    await service.open('a', size)
    await service.open('b', size)

    service.closeAll()

    expect(spawned.map((pty) => pty.isKilled)).toEqual([true, true])
  })
})
