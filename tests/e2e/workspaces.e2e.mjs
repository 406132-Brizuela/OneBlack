// Prueba de punta a punta sobre el build real. El diálogo nativo no se puede
// automatizar, así que se reemplaza en el proceso main; todo lo demás es real.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { _electron as electron } from 'playwright-core'

const PROJECT_ROOT = resolve(import.meta.dirname, '../..')

let sandbox
let userData
let application
let page

function git(cwd, ...args) {
  const identity = ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid']
  execFileSync('git', [...identity, ...args], { cwd, stdio: 'pipe' })
}

async function createFolder(name, branch) {
  const path = join(sandbox, name)
  await mkdir(path)
  if (branch) {
    git(path, 'init', '--initial-branch', branch)
    git(path, 'commit', '--allow-empty', '--no-gpg-sign', '-m', 'init')
  }
  return path
}

async function launch() {
  application = await electron.launch({
    args: [PROJECT_ROOT, `--user-data-dir=${userData}`]
  })
  page = await application.firstWindow()
  await page.locator('.wordmark').waitFor()
  // El diálogo de confirmación al cerrar pestañas se acepta; se prueba en terminal.e2e
  await application.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => ({ response: 0 })
  })
}

// `null` simula que el usuario cancela el diálogo
async function chooseInDialog(folder) {
  await application.evaluate(({ dialog }, selected) => {
    dialog.showOpenDialog = async () => ({
      canceled: selected === null,
      filePaths: selected === null ? [] : [selected]
    })
  }, folder)
}

async function register(folder) {
  await chooseInDialog(folder)
  await page.getByRole('button', { name: '+ Add' }).click()
}

const sidebarNames = () => page.locator('.sidebar__name').allInnerTexts()
const tabNames = () => page.locator('.tab__name').allInnerTexts()
const sidebarItem = (name) =>
  page.locator('.sidebar__item--workspace').filter({ hasText: name })
const waitForActive = (name) => page.getByRole('heading', { name, exact: true }).waitFor()

async function goHome() {
  await page.getByRole('button', { name: 'Workspaces', exact: true }).click()
  await waitForActive('Workspaces')
}

const cards = () => page.locator('.workspace-card')
const card = (name) => cards().filter({ hasText: name })
const cardNames = () => page.locator('.workspace-card__name').allInnerTexts()

describe('OneBlack', () => {
  before(async () => {
    sandbox = await mkdtemp(join(tmpdir(), 'oneblack-e2e-'))
    userData = join(sandbox, 'user-data')
    await launch()
  })

  after(async () => {
    await application?.close()
    await rm(sandbox, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  })

  it('starts with the shell and an empty list', async () => {
    await page.getByText('No workspaces yet').waitFor()
    assert.equal(await page.locator('.wordmark').innerText(), 'OneBlack')
    assert.equal(await page.locator('.tab').count(), 0)
    assert.match(await page.locator('.statusbar').innerText(), /0 workspaces/)
  })

  it('isolates the renderer from Node and Electron', async () => {
    const globals = await page.evaluate(() => ({
      require: typeof window.require,
      process: typeof window.process,
      api: Object.keys(window.oneblack.workspaces).sort()
    }))
    assert.deepEqual(globals, {
      require: 'undefined',
      process: 'undefined',
      api: ['close', 'list', 'open', 'register', 'showHome']
    })
    const preferences = await application.evaluate(({ BrowserWindow }) => {
      const found = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences()
      const { contextIsolation, nodeIntegration, sandbox } = found
      return { contextIsolation, nodeIntegration, sandbox }
    })
    assert.deepEqual(preferences, {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    })
  })

  it('serves the app through its own protocol with a strict CSP', async () => {
    const result = await page.evaluate(async () => {
      const violation = new Promise((done) => {
        document.addEventListener('securitypolicyviolation', (event) =>
          done(event.effectiveDirective)
        )
      })
      const script = document.createElement('script')
      script.textContent = 'window.injected = true'
      document.body.append(script)
      return {
        protocol: location.protocol,
        blocked: await violation,
        injected: window.injected === true
      }
    })
    assert.deepEqual(result, { protocol: 'app:', blocked: 'script-src-elem', injected: false })
  })

  it('does nothing when the folder dialog is cancelled', async () => {
    await register(null)

    await page.getByRole('button', { name: '+ Add', disabled: false }).waitFor()
    assert.equal(await cards().count(), 0)
  })

  it('opens each registered folder in its own tab, with its git branch', async () => {
    for (const [name, branch] of [['alpha', 'main'], ['beta', 'feature/neon'], ['plain']]) {
      await register(await createFolder(name, branch))
      await waitForActive(name)
    }

    assert.deepEqual(await sidebarNames(), ['alpha', 'beta', 'plain'])
    assert.deepEqual(await tabNames(), ['alpha', 'beta', 'plain'])
    assert.match(await page.locator('.statusbar').innerText(), /plain\s+no git repository/)
  })

  it('switches workspaces without reordering the sidebar or the tabs', async () => {
    await sidebarItem('alpha').click()
    await waitForActive('alpha')

    assert.deepEqual(await sidebarNames(), ['alpha', 'beta', 'plain'])
    assert.deepEqual(await tabNames(), ['alpha', 'beta', 'plain'])
    assert.match(await page.locator('.statusbar').innerText(), /alpha\s+main/)
  })

  it('navigates with the keyboard', async () => {
    await page.keyboard.press('Control+2')
    await waitForActive('beta')
    await page.keyboard.press('Control+Tab')
    await waitForActive('plain')
    await page.keyboard.press('Control+Tab')
    await waitForActive('alpha')
    await page.keyboard.press('Control+Shift+Tab')
    await waitForActive('plain')
  })

  it('lists the most recently opened first on the home screen', async () => {
    await goHome()

    assert.deepEqual(await cardNames(), ['plain', 'alpha', 'beta'])
    assert.equal(await card('beta').locator('.git-badge').innerText(), 'feature/neon')
  })

  it('opens an already registered folder instead of duplicating it', async () => {
    await register(join(sandbox, 'beta'))
    await page.getByText('already registered').waitFor()

    assert.deepEqual(await sidebarNames(), ['alpha', 'beta', 'plain'])
    assert.deepEqual(await tabNames(), ['alpha', 'beta', 'plain'])
  })

  it('closes tabs without unregistering the workspace', async () => {
    await page.getByRole('button', { name: 'Close beta tab' }).click()
    await waitForActive('plain')
    await page.locator('.tab').filter({ hasText: 'plain' }).click({ button: 'middle' })
    await waitForActive('alpha')

    assert.deepEqual(await tabNames(), ['alpha'])
    assert.deepEqual(await sidebarNames(), ['alpha', 'beta', 'plain'])
  })

  it('re-reads the branch when the window regains focus', async () => {
    git(join(sandbox, 'alpha'), 'checkout', '-b', 'hotfix')
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))

    await page.locator('.statusbar').getByText('hotfix').waitFor()
  })

  it('restores workspaces and tabs across restarts', async () => {
    await sidebarItem('beta').click()
    await waitForActive('beta')
    if (process.env.E2E_SCREENSHOT) await page.screenshot({ path: process.env.E2E_SCREENSHOT })
    await application.close()
    const stored = JSON.parse(await readFile(join(userData, 'workspaces.json'), 'utf8'))
    assert.equal(stored.workspaces.length, 3)

    await launch()
    await waitForActive('beta')

    assert.deepEqual(await tabNames(), ['alpha', 'beta'])
    assert.deepEqual(await sidebarNames(), ['alpha', 'beta', 'plain'])
  })

  it('flags a folder that no longer exists', async () => {
    await rm(join(sandbox, 'plain'), { recursive: true })
    await goHome()
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))

    await card('plain').getByText('folder not found').waitFor()
  })

  // Va al final: Playwright queda esperando la navegación cancelada y no permite más clics
  it('blocks new windows and external navigation', async () => {
    const opened = await page.evaluate(() => window.open('https://example.com') !== null)
    await page.evaluate(() => location.assign('https://example.com'))
    await page.waitForTimeout(500)
    const stillResponds = await page.evaluate(
      async () => (await window.oneblack.workspaces.list()).ok
    )

    assert.equal(opened, false)
    assert.equal(stillResponds, true)
    assert.match(page.url(), /^app:\/\/oneblack\//)
    assert.equal(application.windows().length, 1)
  })
})
