import { useState } from 'react'

/** Pestañas que ya se mostraron. Las demás no inician su terminal hasta que se las visita. */
export function useVisitedTabs(activeId: string | null): ReadonlySet<string> {
  const [visited, setVisited] = useState<ReadonlySet<string>>(new Set<string>())

  // Actualizar durante el render evita un cuadro con la pestaña nueva vacía
  if (activeId !== null && !visited.has(activeId)) {
    setVisited(new Set([...visited, activeId]))
  }

  return visited
}
