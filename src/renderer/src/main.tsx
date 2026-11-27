import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { allowRuntimeStyles } from './terminal/allow-runtime-styles'
import '@xterm/xterm/css/xterm.css'
import './styles/theme.css'
import './styles/workspace-colors.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/workspaces.css'
import './styles/terminal.css'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element')

allowRuntimeStyles(document)

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)
