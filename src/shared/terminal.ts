export interface TerminalSize {
  cols: number
  rows: number
}

export interface TerminalSnapshot {
  /** Salida acumulada, para reconstruir la pantalla al volver a conectarse */
  history: string
  /** Último fragmento incluido en `history` */
  sequence: number
  /** null mientras el proceso sigue vivo */
  exitCode: number | null
}

export interface TerminalData {
  workspaceId: string
  data: string
  sequence: number
}

export interface TerminalExit {
  workspaceId: string
  exitCode: number
}
