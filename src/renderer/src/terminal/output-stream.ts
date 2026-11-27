import type { TerminalData, TerminalSnapshot } from '../../../shared/terminal'

/**
 * Une el historial con la salida en vivo sin repetir ni perder fragmentos: lo que llega
 * antes del historial se guarda y se escribe después, si no estaba incluido.
 */
export function createOutputStream(write: (data: string) => void) {
  const waiting: TerminalData[] = []
  let lastSequence: number | null = null

  const writeIfNew = ({ data, sequence }: TerminalData): void => {
    if (lastSequence === null || sequence <= lastSequence) return
    lastSequence = sequence
    write(data)
  }

  return {
    receive(event: TerminalData): void {
      if (lastSequence === null) waiting.push(event)
      else writeIfNew(event)
    },
    start({ history, sequence }: TerminalSnapshot): void {
      write(history)
      lastSequence = sequence
      waiting.splice(0).forEach(writeIfNew)
    }
  }
}
