import { useState } from 'react'
import type { IpcResult } from '../../../shared/ipc'
import type { WorkspaceSummary } from '../../../shared/workspace'
import { sortByRegistration } from '../navigation/sidebar-order'
import { settle } from './settle'
import { useWorkspaceSnapshot } from './useWorkspaceSnapshot'

export interface WorkspaceActions {
  register: () => Promise<void>
  open: (workspaceId: string) => Promise<void>
  close: (workspaceId: string) => Promise<void>
  showHome: () => Promise<void>
}

const ALREADY_REGISTERED_NOTICE = 'That folder was already registered. It is now open.'

function useWorkspaceActions(refresh: () => Promise<void>) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Toda acción limpia los mensajes, informa su error y relee el estado
  const run = async <T>(request: () => Promise<IpcResult<T>>): Promise<T | null> => {
    setActionError(null)
    setNotice(null)
    const result = await settle(request())
    if (!result.ok) setActionError(result.error)
    await refresh()
    return result.ok ? result.value : null
  }

  const register = async (): Promise<void> => {
    setIsRegistering(true)
    const outcome = await run(() => window.oneblack.workspaces.register())
    if (outcome?.status === 'already-registered') setNotice(ALREADY_REGISTERED_NOTICE)
    setIsRegistering(false)
  }

  const actions: WorkspaceActions = {
    register,
    open: async (id) => void (await run(() => window.oneblack.workspaces.open(id))),
    close: async (id) => void (await run(() => window.oneblack.workspaces.close(id))),
    showHome: async () => void (await run(() => window.oneblack.workspaces.showHome()))
  }

  return { actions, isRegistering, actionError, notice }
}

export function useWorkspaces() {
  const { snapshot, isLoading, loadError, refresh } = useWorkspaceSnapshot()
  const { actions, isRegistering, actionError, notice } = useWorkspaceActions(refresh)
  const { workspaces, tabs } = snapshot

  const findById = (id: string | null): WorkspaceSummary | undefined =>
    workspaces.find((workspace) => workspace.id === id)

  return {
    actions,
    tabs,
    recent: workspaces,
    sidebarItems: sortByRegistration(workspaces),
    openWorkspaces: tabs.openIds.flatMap((id) => findById(id) ?? []),
    activeWorkspace: findById(tabs.activeId) ?? null,
    isLoading,
    isRegistering,
    error: actionError ?? loadError,
    notice
  }
}
