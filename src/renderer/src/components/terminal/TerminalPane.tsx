import { useState } from 'react'
import { useTerminal } from '../../hooks/useTerminal'

interface TerminalPaneProps {
  workspaceId: string
  isActive: boolean
}

interface TerminalScreenProps extends TerminalPaneProps {
  onRestart: () => void
}

function TerminalScreen({ workspaceId, isActive, onRestart }: TerminalScreenProps) {
  const { container, endMessage } = useTerminal(workspaceId, isActive)

  return (
    <section className="terminal-pane" aria-label="Terminal">
      <div className="terminal-pane__frame">
        <div ref={container} className="terminal-pane__screen" />
      </div>
      {endMessage && (
        <footer className="terminal-pane__ended" role="status">
          <span>{endMessage}</span>
          <button type="button" className="button" onClick={onRestart}>
            Restart terminal
          </button>
        </footer>
      )}
    </section>
  )
}

export function TerminalPane(props: TerminalPaneProps) {
  const [generation, setGeneration] = useState(0)

  // Cambiar la `key` monta una vista nueva sobre una sesión nueva
  const restart = async (): Promise<void> => {
    await window.oneblack.terminal.restart(props.workspaceId)
    setGeneration((current) => current + 1)
  }

  return <TerminalScreen key={generation} {...props} onRestart={() => void restart()} />
}
