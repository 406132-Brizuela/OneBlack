import type { ITerminalOptions, ITheme } from '@xterm/xterm'

const COLOR_VARIABLES: Record<string, string> = {
  background: '--color-bg',
  foreground: '--color-text',
  cursor: '--color-accent',
  cursorAccent: '--color-bg',
  selectionBackground: '--terminal-selection',
  black: '--terminal-black',
  red: '--color-danger',
  green: '--color-success',
  yellow: '--color-warning',
  blue: '--workspace-blue',
  magenta: '--color-accent',
  cyan: '--workspace-cyan',
  white: '--color-text',
  brightBlack: '--color-text-muted',
  brightRed: '--terminal-bright-red',
  brightGreen: '--terminal-bright-green',
  brightYellow: '--terminal-bright-yellow',
  brightBlue: '--terminal-bright-blue',
  brightMagenta: '--terminal-bright-magenta',
  brightCyan: '--terminal-bright-cyan',
  brightWhite: '--terminal-bright-white'
}

/** La terminal toma colores y tipografía de las mismas variables CSS que el resto de la app. */
export function readTerminalAppearance(root: Element): ITerminalOptions {
  const styles = getComputedStyle(root)
  const read = (variable: string): string => styles.getPropertyValue(variable).trim()
  const theme: ITheme = Object.fromEntries(
    Object.entries(COLOR_VARIABLES).map(([name, variable]) => [name, read(variable)])
  )
  return { theme, fontFamily: read('--font-mono'), fontSize: 14 }
}
