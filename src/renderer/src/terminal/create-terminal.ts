import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { Terminal } from '@xterm/xterm'
import { isClipboardStroke } from './clipboard-keys'
import { readTerminalAppearance } from './terminal-theme'

export interface TerminalView {
  terminal: Terminal
  /** Ajusta filas y columnas al espacio disponible */
  fit: () => void
  dispose: () => void
}

// Sin WebGL queda el renderizador DOM, que bajo la CSP no muestra colores RGB
function enableWebgl(terminal: Terminal): void {
  try {
    const addon = new WebglAddon()
    addon.onContextLoss(() => addon.dispose())
    terminal.loadAddon(addon)
  } catch (error) {
    console.warn('WebGL is unavailable; using the DOM terminal renderer', error)
  }
}

// Copiar y pegar se dejan al navegador, que dispara los eventos que xterm ya atiende
function enableClipboard(terminal: Terminal, container: HTMLElement): () => void {
  terminal.attachCustomKeyEventHandler(
    (event) => !isClipboardStroke(event, terminal.hasSelection())
  )
  // Tras copiar se quita la selección: el siguiente Ctrl+C vuelve a interrumpir
  const clearAfterCopy = (): void => queueMicrotask(() => terminal.clearSelection())
  container.addEventListener('copy', clearAfterCopy)
  return () => container.removeEventListener('copy', clearAfterCopy)
}

export function createTerminal(container: HTMLElement): TerminalView {
  const appearance = readTerminalAppearance(document.documentElement)
  const terminal = new Terminal({ ...appearance, cursorBlink: true, scrollback: 5000 })
  const fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.open(container)
  enableWebgl(terminal)
  const disableClipboard = enableClipboard(terminal, container)

  return {
    terminal,
    fit: () => {
      // Una pestaña oculta mide cero: ajustar ahí dejaría la terminal de una columna
      if (container.clientWidth > 0 && container.clientHeight > 0) fitAddon.fit()
    },
    dispose: () => {
      disableClipboard()
      terminal.dispose()
    }
  }
}
