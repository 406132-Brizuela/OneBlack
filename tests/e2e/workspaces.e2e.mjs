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
  await page.getByRole('heading', { name: 'Workspaces' }).waitFor()
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
  await page.getByRole('button', { name: '+ Register workspace' }).click()
}

const cards = () => page.locator('.workspace-card')
const card = (name) => cards().filter({ hasText: name })
const cardNames = () => page.locator('.workspace-card__name').allInnerTexts()

async function waitForOrder(expected) {
  await page.waitForFunction(
    (names) =>
      [...document.querySelectorAll('.workspace-card__name')]
        .map((node) => node.textContent)
        .join() === names,
    expected.join()
  )
}

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
    assert.equal(await page.locator('.tabbar > *').count(), 0)
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
      api: ['list', 'open', 'register']
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

    await page.getByRole('button', { name: '+ Register workspace', disabled: false }).waitFor()
    assert.equal(await cards().count(), 0)
  })

  it('registers folders and shows their git branch, newest first', async () => {
    await register(await createFolder('alpha', 'main'))
    await card('alpha').waitFor()
    await register(await createFolder('beta', 'feature/neon'))
    await card('beta').waitFor()
    await register(await createFolder('plain'))
    await card('plain').waitFor()

    assert.deepEqual(await cardNames(), ['plain', 'beta', 'alpha'])
    assert.equal(await card('alpha').locator('.git-badge').innerText(), 'main')
    assert.equal(await card('beta').locator('.git-badge').innerText(), 'feature/neon')
    assert.equal(await card('plain').locator('.git-badge').innerText(), 'no git repository')
  })

  it('moves an opened workspace to the top and shows it in the status bar', async () => {
    await card('alpha').click()
    await waitForOrder(['alpha', 'plain', 'beta'])

    assert.equal(await card('alpha').getAttribute('aria-current'), 'true')
    assert.match(await page.locator('.statusbar').innerText(), /alpha\s+main/)
  })

  it('does not duplicate an already registered folder', async () => {
    await register(join(sandbox, 'beta'))
    await page.getByText('already registered').waitFor()

    assert.deepEqual(await cardNames(), ['beta', 'alpha', 'plain'])
  })

  it('re-reads the branch when the window regains focus', async () => {
    git(join(sandbox, 'alpha'), 'checkout', '-b', 'hotfix')
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))

    await card('alpha').getByText('hotfix').waitFor()
  })

  it('keeps the list in userData across restarts', async () => {
    if (process.env.E2E_SCREENSHOT) await page.screenshot({ path: process.env.E2E_SCREENSHOT })
    await application.close()
    const stored = JSON.parse(await readFile(join(userData, 'workspaces.json'), 'utf8'))
    assert.equal(stored.workspaces.length, 3)

    await launch()
    await card('alpha').waitFor()

    assert.deepEqual(await cardNames(), ['beta', 'alpha', 'plain'])
  })

  it('flags a folder that no longer exists', async () => {
    await rm(join(sandbox, 'plain'), { recursive: true })
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
