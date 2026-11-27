// Terminales reales sobre el build: los comandos se escriben con el teclado en xterm
// y la salida se observa por la misma API que usa la interfaz.
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { after, before, describe, it } from 'node:test'
import { _electron as electron } from 'playwright-core'

const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
const TIMEOUT = 30_000

let sandbox
let application
let page
const cspProblems = []

async function launch() {
  application = await electron.launch({
    args: [PROJECT_ROOT, `--user-data-dir=${join(sandbox, 'user-data')}`]
  })
  page = await application.firstWindow()
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) cspProblems.push(message.text())
  })
  await page.locator('.wordmark').waitFor()
  await recordOutput()
}

// Acumula la salida de cada terminal para poder esperarla desde la prueba
async function recordOutput() {
  await page.evaluate(() => {
    window.output = ''
    window.oneblack.terminal.onData((event) => (window.output += event.data))
  })
}

async function register(name) {
  const path = join(sandbox, name)
  await mkdir(path)
  await application.evaluate(({ dialog }, selected) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] })
  }, path)
  await page.getByRole('button', { name: '+ Add' }).click()
  await waitForPrompt(name)
}

const readOutput = async () => stripVTControlCharacters(await page.evaluate(() => window.output))

async function waitForOutput(pattern) {
  const deadline = Date.now() + TIMEOUT
  let output = await readOutput()
  while (!pattern.test(output)) {
    assert.ok(Date.now() < deadline, `Timed out waiting for ${pattern} in:\n${output.slice(-800)}`)
    await page.waitForTimeout(100)
    output = await readOutput()
  }
  return pattern.exec(output)
}

const clearOutput = () => page.evaluate(() => (window.output = ''))
const waitForPrompt = (name) => waitForOutput(new RegExp(`${name}>`))

async function run(command) {
  await clearOutput()
  await page.keyboard.type(command)
  await page.keyboard.press('Enter')
}

// Reemplaza el diálogo nativo: responde con el botón pedido y recuerda la pregunta
async function answerCloseDialog(button) {
  await application.evaluate(({ dialog }, label) => {
    globalThis.closeQuestion = null
    dialog.showMessageBox = async (_window, options) => {
      globalThis.closeQuestion = options
      return { response: options.buttons.indexOf(label) }
    }
  }, button)
}

async function waitForCloseDialog() {
  const deadline = Date.now() + TIMEOUT
  let question = await application.evaluate(() => globalThis.closeQuestion)
  while (!question) {
    assert.ok(Date.now() < deadline, 'The confirmation dialog was not shown')
    await page.waitForTimeout(100)
    question = await application.evaluate(() => globalThis.closeQuestion)
  }
  return question
}

async function switchTo(name) {
  await page.locator('.sidebar__item--workspace').filter({ hasText: name }).click()
  await page.getByRole('heading', { name, exact: true }).waitFor()
}

// Las expresiones se calculan en el shell: el eco del comando no puede dar un falso positivo
async function shellProcessId() {
  await run('Write-Output ("pid=" + $PID + ";")')
  const match = await waitForOutput(/pid=(\d+);/)
  return Number(match[1])
}

function isRunning(processId) {
  try {
    process.kill(processId, 0)
    return true
  } catch {
    return false
  }
}

async function waitUntilStopped(processId) {
  const deadline = Date.now() + TIMEOUT
  while (isRunning(processId)) {
    assert.ok(Date.now() < deadline, `Process ${processId} is still running`)
    await new Promise((done) => setTimeout(done, 100))
  }
}

describe('Terminal', { skip: process.platform !== 'win32' && 'uses PowerShell' }, () => {
  let clipboardText

  before(async () => {
    sandbox = await mkdtemp(join(tmpdir(), 'oneblack-terminal-'))
    await launch()
    clipboardText = await application.evaluate(({ clipboard }) => clipboard.readText())
    await register('alpha')
  })

  after(async () => {
    await application?.evaluate(
      ({ clipboard }, text) => clipboard.writeText(text),
      clipboardText ?? ''
    )
    await application?.close()
    await rm(sandbox, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 })
  })

  it('starts a shell inside the workspace folder', async () => {
    await run('Write-Output ("cwd=" + (Split-Path -Leaf (Get-Location)) + ";")')

    await waitForOutput(/cwd=alpha;/)
  })

  it('applies the terminal styles without breaking the CSP', async () => {
    const styles = await page.evaluate(() =>
      [...document.querySelectorAll('.xterm style')].map((style) => style.sheet !== null)
    )

    assert.ok(styles.length > 0)
    assert.ok(styles.every(Boolean))
    assert.deepEqual(cspProblems, [])
  })

  it('keeps each session alive while switching tabs', async () => {
    await run('$marker = "kept-" + (40 + 2)')
    await register('beta')
    await run('Write-Output ("in-beta=[" + $marker + "]")')
    await waitForOutput(/in-beta=\[\]/)

    await switchTo('alpha')
    await run('Write-Output ("value=" + $marker)')

    await waitForOutput(/value=kept-42/)
  })

  it('keeps the keyboard in the terminal when navigating with the mouse', async () => {
    await page.locator('.tab__label').filter({ hasText: 'alpha' }).click()
    await page.locator('.sidebar__item--workspace').filter({ hasText: 'alpha' }).click()
    await run('Write-Output ("still-" + "typing")')

    await waitForOutput(/still-typing/)
  })

  it('leaves the app shortcuts working while the terminal has the keyboard', async () => {
    await page.keyboard.press('Control+2')
    await page.getByRole('heading', { name: 'beta', exact: true }).waitFor()
    await page.keyboard.press('Control+Tab')
    await page.getByRole('heading', { name: 'alpha', exact: true }).waitFor()
  })

  it('interrupts a running command with Ctrl+C', async () => {
    await run('Start-Sleep -Seconds 120')
    await page.waitForTimeout(1000)
    await clearOutput()
    await page.keyboard.press('Control+C')
    await waitForPrompt('alpha')
    await page.waitForTimeout(300)

    await run('Write-Output ("after-" + "interrupt")')

    await waitForOutput(/after-interrupt/)
  })

  it('pastes with Ctrl+V', async () => {
    await application.evaluate(({ clipboard }) =>
      clipboard.writeText('Write-Output ("pas" + "ted")')
    )
    await clearOutput()
    await page.keyboard.press('Control+V')
    await page.keyboard.press('Enter')

    await waitForOutput(/^pasted/m)
  })

  it('copies the selected text with Ctrl+C', async () => {
    await run('Clear-Host; Write-Output ("copy" + "-me")')
    await waitForOutput(/copy-me/)
    await page.waitForTimeout(500)

    const screen = page.locator('.workspace-view:visible .xterm-screen')
    await screen.click({ position: { x: 20, y: 6 }, clickCount: 3 })
    await page.keyboard.press('Control+C')
    await page.waitForTimeout(300)

    const copied = await application.evaluate(({ clipboard }) => clipboard.readText())
    assert.equal(copied.trim(), 'copy-me')
  })

  it('reattaches to the same process after the interface reloads', async () => {
    const processId = await shellProcessId()

    await page.reload()
    await page.getByRole('heading', { name: 'alpha', exact: true }).waitFor()
    await recordOutput()
    await page.locator('.workspace-view:visible .xterm').click()
    await page.waitForTimeout(500)

    assert.equal(await shellProcessId(), processId)
  })

  it('asks before closing a tab and keeps the process when cancelled', async () => {
    const processId = await shellProcessId()
    await answerCloseDialog('Cancel')

    await page.getByRole('button', { name: 'Close alpha tab' }).click()
    const asked = await waitForCloseDialog()

    assert.equal(asked.message, 'Close the "alpha" tab?')
    assert.equal(asked.buttons[asked.defaultId], 'Cancel')
    assert.equal(await shellProcessId(), processId)
  })

  it('offers to restart a shell that exited', async () => {
    await run('exit 3')
    await page.getByText('Process exited with code 3.').waitFor()

    await clearOutput()
    await page.getByRole('button', { name: 'Restart terminal' }).click()
    await waitForPrompt('alpha')

    await page.getByText('Process exited').waitFor({ state: 'detached' })
  })

  it('ends the process when closing its tab is confirmed', async () => {
    const processId = await shellProcessId()
    await answerCloseDialog('Close tab')

    await page.getByRole('button', { name: 'Close alpha tab' }).click()

    await waitUntilStopped(processId)
  })

  it('does not ask when the shell already exited', async () => {
    await register('gamma')
    await run('exit 0')
    await page.getByText('Process exited with code 0.').waitFor()
    await answerCloseDialog('Cancel')

    await page.getByRole('button', { name: 'Close gamma tab' }).click()

    await page.locator('.tab').filter({ hasText: 'gamma' }).waitFor({ state: 'detached' })
    assert.equal(await application.evaluate(() => globalThis.closeQuestion), null)
  })

  it('leaves no processes behind when the app quits', async () => {
    await switchTo('beta')
    const processId = await shellProcessId()

    await application.evaluate(
      ({ clipboard }, text) => clipboard.writeText(text),
      clipboardText
    )
    await application.close()
    application = undefined

    await waitUntilStopped(processId)
  })
})
