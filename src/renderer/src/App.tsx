import { Messages } from './components/layout/Messages'
import { Sidebar } from './components/layout/Sidebar'
import { StatusBar } from './components/layout/StatusBar'
import { TabBar } from './components/layout/TabBar'
import { HomeView } from './components/workspaces/HomeView'
import { WorkspaceStack } from './components/workspaces/WorkspaceStack'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useWorkspaces } from './hooks/useWorkspaces'

export function App() {
  const state = useWorkspaces()
  const { actions, activeWorkspace, sidebarItems, tabs } = state
  const sidebarIds = sidebarItems.map((workspace) => workspace.id)
  useKeyboardShortcuts(sidebarIds, tabs, actions.open)

  return (
    <div className="shell">
      <Sidebar
        workspaces={sidebarItems}
        activeId={tabs.activeId}
        isRegistering={state.isRegistering}
        actions={actions}
      />
      <TabBar workspaces={state.openWorkspaces} activeId={tabs.activeId} actions={actions} />
      <main className="shell__content">
        <Messages error={state.error} notice={state.notice} />
        {!activeWorkspace && (
          <HomeView
            workspaces={state.recent}
            isLoading={state.isLoading}
            hasError={state.error !== null}
            isRegistering={state.isRegistering}
            actions={actions}
          />
        )}
        <WorkspaceStack openWorkspaces={state.openWorkspaces} activeId={tabs.activeId} />
      </main>
      <StatusBar activeWorkspace={activeWorkspace} workspaceCount={sidebarItems.length} />
    </div>
  )
}
