import { Sidebar } from './components/layout/Sidebar'
import { StatusBar } from './components/layout/StatusBar'
import { TabBar } from './components/layout/TabBar'
import { WorkspacePanel } from './components/workspaces/WorkspacePanel'
import { useWorkspaces } from './hooks/useWorkspaces'

export function App() {
  const workspaces = useWorkspaces()

  return (
    <div className="shell">
      <Sidebar />
      <TabBar />
      <main className="shell__content">
        <WorkspacePanel {...workspaces} />
      </main>
      <StatusBar
        activeWorkspace={workspaces.activeWorkspace}
        workspaceCount={workspaces.items.length}
      />
    </div>
  )
}
