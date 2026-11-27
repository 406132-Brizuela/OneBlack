import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WORKSPACE_COLORS } from '../../shared/workspace'
import { TabSessionRepository } from '../tabs/tab-session-repository'
import { WorkspaceRepository } from './workspace-repository'
import { WorkspaceService } from './workspace-service'

let root: string
let filePath: string
let clock: number

// Reloj controlado: cada llamada avanza un segundo y el orden es determinista
function createService(): WorkspaceService {
  return new WorkspaceService(
    new WorkspaceRepository(filePath),
    new TabSessionRepository(join(root, 'userData', 'tabs.json')),
    () => Promise.resolve({ kind: 'not-a-repository' }),
    () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++clock))
  )
}

async function list(service: WorkspaceService) {
  return (await service.snapshot()).workspaces
}

async function register(service: WorkspaceService, folder: string): Promise<string> {
  const outcome = await service.register(join(root, folder))
  if (outcome.status === 'cancelled') throw new Error('Unexpected outcome')
  return outcome.workspaceId
}

async function listNames(service: WorkspaceService): Promise<string[]> {
  return (await list(service)).map((workspace) => workspace.name)
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'oneblack-workspaces-'))
  filePath = join(root, 'userData', 'workspaces.json')
  clock = 0
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('WorkspaceService', () => {
  it('starts empty when there is no file yet', async () => {
    await expect(createService().snapshot()).resolves.toEqual({
      workspaces: [],
      tabs: { openIds: [], activeId: null }
    })
  })

  it('persists name, path and color across instances', async () => {
    await createService().register(join(root, 'alpha'))

    const [workspace] = await list(createService())

    expect(workspace).toMatchObject({
      name: 'alpha',
      path: join(root, 'alpha'),
      color: WORKSPACE_COLORS[0],
      git: { kind: 'not-a-repository' }
    })
  })

  it('does not persist the git status', async () => {
    const service = createService()
    await service.register(join(root, 'alpha'))
    await service.snapshot()

    await expect(readFile(filePath, 'utf8')).resolves.not.toContain('not-a-repository')
  })

  it('lists the most recently opened workspace first', async () => {
    const service = createService()
    const first = await service.register(join(root, 'alpha'))
    await service.register(join(root, 'beta'))
    expect(await listNames(service)).toEqual(['beta', 'alpha'])

    if (first.status === 'cancelled') throw new Error('Unexpected outcome')
    await service.open(first.workspaceId)

    expect(await listNames(service)).toEqual(['alpha', 'beta'])
  })

  it('does not duplicate a folder that is already registered', async () => {
    const service = createService()
    await service.register(join(root, 'alpha'))
    await service.register(join(root, 'beta'))

    const outcome = await service.register(`${join(root, 'alpha')}/`)

    expect(outcome.status).toBe('already-registered')
    expect(await listNames(service)).toEqual(['alpha', 'beta'])
  })

  it('assigns different colors to consecutive workspaces', async () => {
    const service = createService()
    await service.register(join(root, 'alpha'))
    await service.register(join(root, 'beta'))

    const colors = (await list(service)).map((workspace) => workspace.color)

    expect(new Set(colors).size).toBe(2)
  })

  it('keeps every workspace when registrations run concurrently', async () => {
    const service = createService()
    const folders = ['a', 'b', 'c', 'd', 'e']

    await Promise.all(folders.map((folder) => service.register(join(root, folder))))

    await expect(list(service)).resolves.toHaveLength(folders.length)
  })

  it('rejects opening an unknown workspace and keeps working', async () => {
    const service = createService()

    await expect(service.open('missing')).rejects.toThrow('no longer registered')
    await service.register(join(root, 'alpha'))

    await expect(list(service)).resolves.toHaveLength(1)
  })

  it('opens a tab per workspace without duplicating it', async () => {
    const service = createService()
    const alpha = await register(service, 'alpha')
    const beta = await register(service, 'beta')

    await service.open(alpha)

    const { tabs } = await service.snapshot()
    expect(tabs).toEqual({ openIds: [alpha, beta], activeId: alpha })
  })

  it('restores the tabs in a new instance', async () => {
    const service = createService()
    const alpha = await register(service, 'alpha')
    await service.showHome()

    const { tabs } = await createService().snapshot()

    expect(tabs).toEqual({ openIds: [alpha], activeId: null })
  })

  it('keeps the workspace registered after closing its tab', async () => {
    const service = createService()
    const alpha = await register(service, 'alpha')

    await service.close(alpha)

    const { workspaces, tabs } = await service.snapshot()
    expect(workspaces).toHaveLength(1)
    expect(tabs).toEqual({ openIds: [], activeId: null })
  })

  it('gives the folder only to workspaces with an open tab', async () => {
    const service = createService()
    const alpha = await register(service, 'alpha')

    await expect(service.openTabFolder(alpha)).resolves.toBe(join(root, 'alpha'))
    await service.close(alpha)

    await expect(service.openTabFolder(alpha)).rejects.toThrow('Open the workspace')
    await expect(service.openTabFolder('unknown')).rejects.toThrow('Open the workspace')
  })

  it.each(['not json', '{"version":99,"workspaces":[]}', '{"version":1,"workspaces":[{}]}'])(
    'leaves an invalid file untouched: %s',
    async (content) => {
      const service = createService()
      await service.register(join(root, 'alpha'))
      await writeFile(filePath, content)

      await expect(service.snapshot()).rejects.toThrow('left untouched')
      await expect(service.register(join(root, 'beta'))).rejects.toThrow('left untouched')
      await expect(readFile(filePath, 'utf8')).resolves.toBe(content)
    }
  )
})
