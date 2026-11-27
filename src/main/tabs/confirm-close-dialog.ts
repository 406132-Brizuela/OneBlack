import { BrowserWindow, dialog, type WebContents } from 'electron'

const CLOSE_BUTTON = 0
const CANCEL_BUTTON = 1

export async function confirmCloseTab(
  sender: WebContents,
  workspaceName: string
): Promise<boolean> {
  const window = BrowserWindow.fromWebContents(sender)
  if (!window) throw new Error('The sender has no window')
  const { response } = await dialog.showMessageBox(window, {
    type: 'warning',
    title: 'OneBlack',
    message: `Close the "${workspaceName}" tab?`,
    detail: 'Its terminal is still open. Anything running in it will be stopped.',
    buttons: ['Close tab', 'Cancel'],
    // Enter y Escape cancelan: perder una sesión debe ser una decisión explícita
    defaultId: CANCEL_BUTTON,
    cancelId: CANCEL_BUTTON,
    noLink: true
  })
  return response === CLOSE_BUTTON
}
