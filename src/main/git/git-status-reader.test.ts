import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseHead, readGitStatus } from './git-status-reader'

// Los repositorios de prueba se crean con git real para validar contra su formato
function git(cwd: string, ...args: string[]): string {
  const identity = ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid']
  return execFileSync('git', [...identity, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' })
}

async function createRepository(path: string, branch: string): Promise<void> {
  await mkdir(path, { recursive: true })
  git(path, 'init', '--initial-branch', branch)
  git(path, 'commit', '--allow-empty', '--no-gpg-sign', '-m', 'init')
}

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'oneblack-git-'))
})

afterEach(async () => {
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('readGitStatus', () => {
  it('reads the current branch, including slashes', async () => {
    await createRepository(join(root, 'repo'), 'feature/neon-shell')

    await expect(readGitStatus(join(root, 'repo'))).resolves.toEqual({
      kind: 'branch',
      branch: 'feature/neon-shell'
    })
  })

  it('reads the branch of a repository without commits', async () => {
    git(root, 'init', '--initial-branch', 'trunk')

    await expect(readGitStatus(root)).resolves.toEqual({ kind: 'branch', branch: 'trunk' })
  })

  it('finds the repository from a nested folder', async () => {
    await createRepository(join(root, 'repo'), 'main')
    const nested = join(root, 'repo', 'src', 'deep')
    await mkdir(nested, { recursive: true })

    await expect(readGitStatus(nested)).resolves.toEqual({ kind: 'branch', branch: 'main' })
  })

  it('follows the gitdir pointer of a linked worktree', async () => {
    const repository = join(root, 'repo')
    const worktree = join(root, 'worktree')
    await createRepository(repository, 'main')
    git(repository, 'worktree', 'add', '-b', 'side', worktree)

    await expect(readGitStatus(worktree)).resolves.toEqual({ kind: 'branch', branch: 'side' })
  })

  it('reports a detached HEAD with the short commit hash', async () => {
    const repository = join(root, 'repo')
    await createRepository(repository, 'main')
    git(repository, 'checkout', '--detach')
    const commit = git(repository, 'rev-parse', 'HEAD').slice(0, 7)

    await expect(readGitStatus(repository)).resolves.toEqual({ kind: 'detached', commit })
  })

  it('reports a folder outside any repository', async () => {
    await expect(readGitStatus(root)).resolves.toEqual({ kind: 'not-a-repository' })
  })

  it('reports a missing folder', async () => {
    await expect(readGitStatus(join(root, 'gone'))).resolves.toEqual({ kind: 'missing-folder' })
  })

  it('refuses to follow a gitdir pointer to a network share', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await writeFile(join(root, '.git'), 'gitdir: //server/share/repo.git\n')

    await expect(readGitStatus(root)).resolves.toEqual({ kind: 'unreadable' })
  })

  it('rejects an oversized HEAD file', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await mkdir(join(root, '.git'))
    await writeFile(join(root, '.git', 'HEAD'), 'a'.repeat(10_000))

    await expect(readGitStatus(root)).resolves.toEqual({ kind: 'unreadable' })
  })
})

describe('parseHead', () => {
  it('does not treat the reftable placeholder as a branch', () => {
    expect(parseHead('ref: refs/heads/.invalid\n')).toEqual({ kind: 'unreadable' })
  })

  it('reports unknown content as unreadable', () => {
    expect(parseHead('garbage')).toEqual({ kind: 'unreadable' })
  })
})
