import { useEffect, useRef, useState } from 'react'
import { connectTerminal } from '../terminal/connect-terminal'
import { createTerminal, type TerminalView } from '../terminal/create-terminal'

/** Monta una terminal en un elemento y la mantiene conectada mientras exista. */
export function useTerminal(workspaceId: string, isActive: boolean) {
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<TerminalView | null>(null)
  const [endMessage, setEndMessage] = useState<string | null>(null)

  useEffect(() => {
    const element = container.current
    if (!element) return
    const created = createTerminal(element)
    view.current = created
    created.fit()
    const disconnect = connectTerminal(workspaceId, created.terminal, {
      onExit: (exitCode) => setEndMessage(`Process exited with code ${exitCode}.`),
      onError: setEndMessage
    })
    const observer = new ResizeObserver(() => created.fit())
    observer.observe(element)
    return () => {
      observer.disconnect()
      disconnect()
      created.dispose()
      view.current = null
    }
  }, [workspaceId])

  // Al mostrar la pestaña, la terminal recupera su tamaño y el teclado
  useEffect(() => {
    if (!isActive) return
    view.current?.fit()
    view.current?.terminal.focus()
  }, [isActive])

  return { container, endMessage }
}
