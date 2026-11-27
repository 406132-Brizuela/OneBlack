import { describe, expect, it } from 'vitest'
import { requireTerminalInput, requireTerminalSize } from './terminal-arguments'
import { buildShellEnvironment, resolveShell } from './shell'

const windowsEnv = { SystemRoot: 'C:\\Windows', Path: '.;relative;C:\\Tools' }
const bundled = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'

describe('resolveShell', () => {
  it('prefers PowerShell 7 from an absolute PATH entry', () => {
    const shell = resolveShell('win32', windowsEnv, () => true)

    expect(shell.file).toBe('C:\\Tools\\pwsh.exe')
  })

  it('falls back to the PowerShell bundled with Windows', () => {
    expect(resolveShell('win32', windowsEnv, () => false).file).toBe(bundled)
  })

  it('never looks for the shell in relative PATH entries', () => {
    const checked: string[] = []

    resolveShell('win32', windowsEnv, (path) => {
      checked.push(path)
      return false
    })

    expect(checked).toEqual(['C:\\Tools\\pwsh.exe'])
  })

  it('uses the login shell of the user elsewhere', () => {
    expect(resolveShell('linux', { SHELL: '/bin/zsh' }).file).toBe('/bin/zsh')
    expect(resolveShell('linux', { SHELL: 'zsh' }).file).toBe('/bin/bash')
  })
})

describe('buildShellEnvironment', () => {
  it('removes the variables added by the app itself', () => {
    const env = buildShellEnvironment({
      HOME: '/home/user',
      ELECTRON_RENDERER_URL: 'http://localhost:5173',
      NODE_ENV_ELECTRON_VITE: 'development',
      NODE_ENV: 'development',
      EMPTY: undefined
    })

    expect(env).toEqual({ HOME: '/home/user', TERM: 'xterm-256color', COLORTERM: 'truecolor' })
  })

  it('keeps a NODE_ENV defined by the user outside development', () => {
    expect(buildShellEnvironment({ NODE_ENV: 'production' })['NODE_ENV']).toBe('production')
  })
})

describe('terminal arguments', () => {
  it.each([null, {}, { cols: 0, rows: 10 }, { cols: 80.5, rows: 10 }, { cols: '80', rows: 10 }])(
    'rejects the size %o',
    (size) => {
      expect(() => requireTerminalSize(size)).toThrow('Invalid terminal size')
    }
  )

  it('rejects input that is not text or is too large', () => {
    expect(() => requireTerminalInput(1)).toThrow()
    expect(() => requireTerminalInput('x'.repeat(1_000_001))).toThrow()
    expect(requireTerminalInput('ls\r')).toBe('ls\r')
  })
})
