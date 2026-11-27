import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkspaceSummary } from '../../../shared/workspace'
import { settle } from './settle'

export function useWorkspaceList() {
  const [items, setItems] = useState<WorkspaceSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const latestRequest = useRef(0)

  const refresh = useCallback(async () => {
    const request = ++latestRequest.current
    const result = await settle(window.oneblack.workspaces.list())
    // Una respuesta vieja no debe pisar a una más nueva
    if (request !== latestRequest.current) return
    if (result.ok) setItems(result.value)
    setLoadError(result.ok ? null : result.error)
    setIsLoading(false)
  }, [])

  // La rama puede cambiar fuera de la app: se relee al recuperar el foco
  useEffect(() => {
    const handleFocus = (): void => void refresh()
    handleFocus()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refresh])

  return { items, isLoading, loadError, refresh }
}
