import { useState } from 'react'
import type { RegisterOutcome, WorkspaceSummary } from '../../../shared/workspace'
import { settle } from './settle'
import { useWorkspaceList } from './useWorkspaceList'

export interface WorkspacesState {
  items: WorkspaceSummary[]
  activeWorkspace: WorkspaceSummary | null
  isLoading: boolean
  isRegistering: boolean
  error: string | null
  notice: string | null
  register: () => Promise<void>
  open: (workspaceId: string) => Promise<void>
}

const ALREADY_REGISTERED_NOTICE = 'That folder was already registered. It is now active.'

export function useWorkspaces(): WorkspacesState {
  const { items, isLoading, loadError, refresh } = useWorkspaceList()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const clearMessages = (): void => {
    setActionError(null)
    setNotice(null)
  }

  const applyRegistration = async (outcome: RegisterOutcome): Promise<void> => {
    if (outcome.status === 'cancelled') return
    await refresh()
    setActiveId(outcome.workspaceId)
    if (outcome.status === 'already-registered') setNotice(ALREADY_REGISTERED_NOTICE)
  }

  const register = async (): Promise<void> => {
    setIsRegistering(true)
    clearMessages()
    const result = await settle(window.oneblack.workspaces.register())
    if (result.ok) await applyRegistration(result.value)
    else setActionError(result.error)
    setIsRegistering(false)
  }

  const open = async (workspaceId: string): Promise<void> => {
    clearMessages()
    const result = await settle(window.oneblack.workspaces.open(workspaceId))
    if (result.ok) setActiveId(workspaceId)
    else setActionError(result.error)
    await refresh()
  }

  const activeWorkspace = items.find((item) => item.id === activeId) ?? null
  const error = actionError ?? loadError

  return { items, activeWorkspace, isLoading, isRegistering, error, notice, register, open }
}
